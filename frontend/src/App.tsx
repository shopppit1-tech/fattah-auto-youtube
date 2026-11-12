import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, History, Link2, ListVideo, Play, Radio, Square, TimerReset, Zap } from 'lucide-react';
import { getHistory, getState, saveSource, startScheduler, stopScheduler } from './api';
import { PlayerPanel } from './PlayerPanel';
import { parseYouTubeUrl } from './youtube';
import type { PlaybackSession, SchedulerState, YouTubeSource } from './types';
import './styles.css';

const initialState: SchedulerState = {
  running: false,
  source: null,
  intervalSeconds: 10800,
  sessionDurationSeconds: 14400,
  activeSession: null,
  history: [],
};

function formatDuration(seconds: number | null) {
  if (seconds === null) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}j ${minutes}m` : `${minutes}m`;
}

function formatTime(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function sessionStatusLabel(status: PlaybackSession['status']) {
  return status === 'active' ? 'Sedang berjalan' : status === 'completed' ? 'Selesai' : 'Dihentikan';
}

export default function App() {
  const [state, setState] = useState<SchedulerState>(initialState);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeNav, setActiveNav] = useState<'dashboard' | 'history'>('dashboard');

  useEffect(() => {
    getState().then(setState);
  }, []);

  useEffect(() => {
    if (!state.running) return;
    const timer = window.setInterval(() => {
      getHistory().then((history) => setState((current) => ({ ...current, history })));
    }, 10000);
    return () => window.clearInterval(timer);
  }, [state.running]);

  const activeSince = state.activeSession ? formatTime(state.activeSession.startedAt) : 'Tidak ada sesi';
  const latestStatus = state.running ? 'AUTOMATION LIVE' : 'SYSTEM STANDBY';
  const progressLabel = state.activeSession ? `Sesi aktif sejak ${activeSince}` : 'Menunggu Start untuk membuka sesi';
  const history = useMemo(() => state.history.slice(0, 8), [state.history]);

  async function handleSourceSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const parsed = parseYouTubeUrl(url);
      setSaving(true);
      const nextState = await saveSource(parsed);
      setState(nextState);
      setUrl('');
      setNotice(parsed.kind === 'playlist' ? 'Playlist siap dijadwalkan.' : 'Video siap dijadwalkan.');
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Sumber tidak dapat disimpan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStart() {
    setError('');
    setNotice('');
    try {
      const nextState = await startScheduler();
      setState(nextState);
      setNotice('Jadwal aktif. Sesi pertama dimulai sekarang.');
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Scheduler tidak dapat dimulai.');
    }
  }

  async function handleStop() {
    setError('');
    const nextState = await stopScheduler();
    setState(nextState);
    setNotice('Jadwal dihentikan. Riwayat sesi sudah diperbarui.');
  }

  return (
    <div className="app-shell">
      <aside className="side-rail">
        <div className="brand-mark" aria-label="Fattah Auto YouTube"><span>F</span><i /></div>
        <div className="rail-rule" />
        <nav className="rail-nav" aria-label="Navigasi utama">
          <button className={activeNav === 'dashboard' ? 'rail-button active' : 'rail-button'} onClick={() => setActiveNav('dashboard')} title="Dashboard"><Activity size={18} /></button>
          <button className={activeNav === 'history' ? 'rail-button active' : 'rail-button'} onClick={() => setActiveNav('history')} title="Riwayat"><History size={18} /></button>
        </nav>
        <div className="rail-bottom"><div className={state.running ? 'live-dot pulse' : 'live-dot'} /><span>v0.1</span></div>
      </aside>

      <main className="main-canvas">
        <header className="topbar">
          <div className="crumb"><span>FATTAH AUTO</span><b>/</b><strong>YOUTUBE</strong></div>
          <div className="topbar-status"><span className={state.running ? 'status-light on' : 'status-light'} />{latestStatus}<small>• ENZONIK PYTHON</small></div>
        </header>

        <section className="hero-row">
          <div>
            <p className="eyebrow"><Zap size={14} /> AUTOMATED PLAYBACK CONSOLE</p>
            <h1>Putar. Jadwalkan.<br /><em>Ulangi.</em></h1>
            <p className="hero-copy">Satu panel untuk mengendalikan pemutaran YouTube yang berjalan sesuai ritme operasional Anda.</p>
          </div>
          <div className="hero-stamp"><span>OPERATOR</span><strong>FATTAH</strong><small>CONTROL / 01</small></div>
        </section>

        <section className="metric-strip" aria-label="Konfigurasi jadwal">
          <div className="metric"><span className="metric-icon"><Clock3 size={16} /></span><div><small>INTERVAL JADWAL</small><strong>03:00 <i>JAM</i></strong></div></div>
          <div className="metric"><span className="metric-icon"><TimerReset size={16} /></span><div><small>DURASI SESI</small><strong>04:00 <i>JAM</i></strong></div></div>
          <div className="metric"><span className="metric-icon"><Radio size={16} /></span><div><small>MODE PEMUTARAN</small><strong>REPEATING <i>ON</i></strong></div></div>
          <div className={state.running ? 'system-state active' : 'system-state'}><span className="state-dot" /><div><small>SYSTEM STATUS</small><strong>{state.running ? 'RUNNING' : 'READY'}</strong></div></div>
        </section>

        {activeNav === 'dashboard' ? (
          <>
            <section className="workspace-grid">
              <div className="player-card panel">
                <div className="panel-heading"><div><span className="panel-kicker">01 / PLAYBACK MONITOR</span><h2>Live player</h2></div><span className={state.running ? 'live-badge' : 'idle-badge'}><span />{state.running ? 'LIVE' : 'IDLE'}</span></div>
                <div className="player-wrap"><PlayerPanel source={state.source} running={state.running} /><div className="scan-line" /></div>
                <div className="player-footer"><div className="source-summary"><span className="source-type">{state.source?.kind === 'playlist' ? <ListVideo size={14} /> : <Play size={14} />}</span><div><small>SOURCE AKTIF</small><strong>{state.source?.title ?? 'Belum terhubung'}</strong></div></div><span className="session-time">{progressLabel}</span></div>
              </div>

              <div className="control-stack">
                <div className="panel source-panel"><div className="panel-heading compact"><div><span className="panel-kicker">02 / SOURCE INPUT</span><h2>Tambahkan sumber</h2></div><Link2 size={17} /></div><form onSubmit={handleSourceSubmit}><label htmlFor="youtube-url">URL VIDEO / PLAYLIST YOUTUBE</label><div className="url-field"><Link2 size={15} /><input id="youtube-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://youtube.com/..." /></div><button className="save-button" type="submit" disabled={saving}>{saving ? 'MENYIMPAN…' : 'SIMPAN SUMBER'}<span>↗</span></button></form>{error && <p className="form-message error">{error}</p>}{notice && <p className="form-message success">{notice}</p>}<p className="input-hint">Menerima tautan video tunggal maupun playlist. Playlist akan berlanjut otomatis.</p></div>
                <div className="panel action-panel"><div className="panel-heading compact"><div><span className="panel-kicker">03 / SYSTEM CONTROL</span><h2>Kontrol otomasi</h2></div><span className="mono-label">AUTO LOOP</span></div><div className="action-copy"><span className={state.running ? 'action-indicator active' : 'action-indicator'} /><div><strong>{state.running ? 'Jadwal sedang berjalan' : 'Sistem siap diaktifkan'}</strong><small>{state.running ? 'Sesi akan berulang setiap 3 jam.' : 'Start untuk memulai sesi pertama sekarang.'}</small></div></div><div className="action-buttons"><button className="start-button" onClick={handleStart} disabled={state.running || !state.source}><Play size={16} fill="currentColor" /> START</button><button className="stop-button" onClick={handleStop} disabled={!state.running}><Square size={14} fill="currentColor" /> STOP</button></div></div>
              </div>
            </section>

            <section className="history-section panel"><div className="section-heading"><div><span className="panel-kicker">04 / AUDIT TRAIL</span><h2>Riwayat pemutaran</h2></div><button className="text-button" onClick={() => setActiveNav('history')}>LIHAT SEMUA <span>↗</span></button></div><HistoryTable sessions={history} /></section>
          </>
        ) : (
          <section className="history-page panel"><div className="section-heading"><div><span className="panel-kicker">AUDIT TRAIL / FULL LOG</span><h2>Semua riwayat pemutaran</h2></div><span className="log-count">{state.history.length.toString().padStart(2, '0')} SESI</span></div><HistoryTable sessions={state.history} /></section>
        )}

        <footer className="footer-note"><span>FATTAH AUTO YOUTUBE / OPERATIONAL DASHBOARD</span><span>PYTHON SCHEDULER <b>•</b> YOUTUBE IFRAME API</span></footer>
      </main>
    </div>
  );
}

function HistoryTable({ sessions }: { sessions: PlaybackSession[] }) {
  if (!sessions.length) return <div className="empty-history"><History size={18} /><span>Belum ada sesi. Setelah Start dijalankan, catatan sesi akan muncul di sini.</span></div>;
  return <div className="history-table"><div className="table-row table-head"><span>SOURCE</span><span>START</span><span>END</span><span>DURATION</span><span>STATUS</span></div>{sessions.map((session) => <div className="table-row" key={session.id}><span className="table-source"><span className="source-square">{session.source.kind === 'playlist' ? <ListVideo size={13} /> : <Play size={12} fill="currentColor" />}</span><strong>{session.source.title}</strong></span><span>{formatTime(session.startedAt)}</span><span>{formatTime(session.endedAt)}</span><span>{formatDuration(session.durationSeconds)}</span><span><b className={`status-pill ${session.status}`}>{sessionStatusLabel(session.status)}</b></span></div>)}</div>;
}
