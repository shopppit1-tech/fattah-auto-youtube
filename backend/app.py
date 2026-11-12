from __future__ import annotations

import asyncio
import os
import sqlite3
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DEFAULT_INTERVAL_SECONDS = int(os.getenv("SCHEDULE_INTERVAL_SECONDS", str(3 * 60 * 60)))
DEFAULT_SESSION_DURATION_SECONDS = int(os.getenv("SESSION_DURATION_SECONDS", str(4 * 60 * 60)))
DATA_DIR = Path(os.getenv("DATA_DIR", str(Path(__file__).parent / "data")))
DB_PATH = DATA_DIR / "fattah.sqlite3"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_youtube_url(raw_url: str) -> dict[str, str]:
    value = raw_url.strip()
    parsed = urlparse(value)
    host = parsed.netloc.lower().removeprefix("www.")
    if host not in {"youtube.com", "m.youtube.com", "youtu.be"}:
        raise ValueError("Tautan harus berasal dari YouTube.")
    query = parse_qs(parsed.query)
    playlist_id = query.get("list", [None])[0]
    if playlist_id:
        return {"url": value, "kind": "playlist", "id": playlist_id, "title": f"Playlist {playlist_id}"}
    video_id = parsed.path.strip("/") if host == "youtu.be" else query.get("v", [None])[0]
    if not video_id or len(video_id) < 6:
        raise ValueError("URL YouTube tidak berisi ID video atau playlist yang dikenali.")
    return {"url": value, "kind": "video", "id": video_id, "title": f"Video {video_id}"}


class SourceRequest(BaseModel):
    url: str


class ScheduleRequest(BaseModel):
    intervalSeconds: int
    sessionDurationSeconds: int


class Store:
    def __init__(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                source_url TEXT NOT NULL,
                source_kind TEXT NOT NULL,
                source_id TEXT NOT NULL,
                source_title TEXT NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                duration_seconds INTEGER,
                status TEXT NOT NULL
            )
        """)
        self.connection.commit()

    def set_source(self, source: dict[str, str]) -> None:
        self.connection.execute("INSERT OR REPLACE INTO settings(key, value) VALUES('source', ?)", (source["url"],))
        self.connection.commit()

    def set_setting(self, key: str, value: int | str) -> None:
        self.connection.execute("INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)", (key, str(value)))
        self.connection.commit()

    def int_setting(self, key: str, default: int) -> int:
        row = self.connection.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        if not row:
            return default
        try:
            return int(row["value"])
        except (TypeError, ValueError):
            return default

    def text_setting(self, key: str, default: str) -> str:
        row = self.connection.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
        return str(row["value"]) if row else default

    def source(self) -> dict[str, str] | None:
        row = self.connection.execute("SELECT value FROM settings WHERE key = 'source'").fetchone()
        if not row:
            return None
        try:
            return parse_youtube_url(row["value"])
        except ValueError:
            return None

    def create_session(self, source: dict[str, str]) -> dict[str, Any]:
        session = {
            "id": str(uuid.uuid4()),
            "source": source,
            "startedAt": now_iso(),
            "endedAt": None,
            "durationSeconds": None,
            "status": "active",
        }
        self.connection.execute(
            "INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?,?)",
            (session["id"], source["url"], source["kind"], source["id"], source["title"], session["startedAt"], None, None, "active"),
        )
        self.connection.commit()
        return session

    def _row_to_session(self, row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "source": {"url": row["source_url"], "kind": row["source_kind"], "id": row["source_id"], "title": row["source_title"]},
            "startedAt": row["started_at"],
            "endedAt": row["ended_at"],
            "durationSeconds": row["duration_seconds"],
            "status": row["status"],
        }

    def history(self, limit: int = 30) -> list[dict[str, Any]]:
        rows = self.connection.execute("SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?", (limit,)).fetchall()
        return [self._row_to_session(row) for row in rows]

    def active_sessions(self) -> list[dict[str, Any]]:
        return [session for session in self.history(100) if session["status"] == "active"]

    def finish(self, session_id: str, status: str) -> None:
        row = self.connection.execute("SELECT started_at FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not row:
            return
        ended = now_iso()
        started = datetime.fromisoformat(row["started_at"])
        duration = max(0, int((datetime.now(timezone.utc) - started).total_seconds()))
        self.connection.execute("UPDATE sessions SET ended_at = ?, duration_seconds = ?, status = ? WHERE id = ?", (ended, duration, status, session_id))
        self.connection.commit()

    def stop_active(self) -> None:
        for session in self.active_sessions():
            self.finish(session["id"], "stopped")


class Scheduler:
    def __init__(self, store: Store) -> None:
        self.store = store
        self.running = False
        self.task: asyncio.Task[None] | None = None
        self.next_start: float | None = None

    @property
    def interval_seconds(self) -> int:
        return self.store.int_setting("interval_seconds", DEFAULT_INTERVAL_SECONDS)

    @property
    def session_duration_seconds(self) -> int:
        return self.store.int_setting("session_duration_seconds", DEFAULT_SESSION_DURATION_SECONDS)

    def update_schedule(self, interval_seconds: int, session_duration_seconds: int) -> None:
        self.store.set_setting("interval_seconds", interval_seconds)
        self.store.set_setting("session_duration_seconds", session_duration_seconds)
        if self.running:
            self.next_start = asyncio.get_running_loop().time() + interval_seconds

    async def start(self) -> dict[str, Any]:
        if self.running:
            return state_payload(self)
        source = self.store.source()
        if not source:
            raise HTTPException(status_code=400, detail="Simpan sumber YouTube sebelum Start.")
        self.running = True
        self.store.create_session(source)
        self.next_start = asyncio.get_running_loop().time() + self.interval_seconds
        if self.task is None or self.task.done():
            self.task = asyncio.create_task(self._loop())
        return state_payload(self)

    async def stop(self) -> dict[str, Any]:
        self.running = False
        self.next_start = None
        self.store.stop_active()
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        self.task = None
        return state_payload(self)

    async def _loop(self) -> None:
        loop = asyncio.get_running_loop()
        while self.running:
            current = loop.time()
            if self.next_start is not None and current >= self.next_start:
                source = self.store.source()
                if source:
                    self.store.create_session(source)
                self.next_start = current + self.interval_seconds
            for session in self.store.active_sessions():
                started = datetime.fromisoformat(session["startedAt"])
                if (datetime.now(timezone.utc) - started).total_seconds() >= self.session_duration_seconds:
                    self.store.finish(session["id"], "completed")
            await asyncio.sleep(min(15, max(1, self.interval_seconds)))

    def active_session(self) -> dict[str, Any] | None:
        active = self.store.active_sessions()
        return active[0] if active else None


def state_payload(scheduler: Scheduler) -> dict[str, Any]:
    return {
        "running": scheduler.running,
        "source": scheduler.store.source(),
        "intervalSeconds": scheduler.interval_seconds,
        "sessionDurationSeconds": scheduler.session_duration_seconds,
        "activeSession": scheduler.active_session(),
        "history": scheduler.store.history(30),
    }


store = Store()
scheduler = Scheduler(store)


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    if scheduler.running:
        await scheduler.stop()


app = FastAPI(title="FATTAH AUTO YOUTUBE API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "fattah-auto-youtube"}


@app.get("/api/state")
def get_state() -> dict[str, Any]:
    return state_payload(scheduler)


@app.put("/api/source")
def set_source(payload: SourceRequest) -> dict[str, Any]:
    try:
        source = parse_youtube_url(payload.url)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    store.set_source(source)
    return state_payload(scheduler)


@app.put("/api/schedule")
def update_schedule(payload: ScheduleRequest) -> dict[str, Any]:
    if not 60 <= payload.intervalSeconds <= 7 * 24 * 60 * 60:
        raise HTTPException(status_code=422, detail="Interval harus antara 1 menit dan 7 hari.")
    if not 60 <= payload.sessionDurationSeconds <= 7 * 24 * 60 * 60:
        raise HTTPException(status_code=422, detail="Durasi harus antara 1 menit dan 7 hari.")
    scheduler.update_schedule(payload.intervalSeconds, payload.sessionDurationSeconds)
    return state_payload(scheduler)


@app.post("/api/start")
async def start_scheduler() -> dict[str, Any]:
    return await scheduler.start()


@app.post("/api/stop")
async def stop_scheduler() -> dict[str, Any]:
    return await scheduler.stop()


@app.get("/api/history")
def get_history(limit: int = Query(default=30, ge=1, le=100)) -> list[dict[str, Any]]:
    return store.history(limit)


@app.post("/api/sessions/{session_id}/complete")
def complete_session(session_id: str) -> dict[str, str]:
    store.finish(session_id, "completed")
    return {"status": "ok"}
