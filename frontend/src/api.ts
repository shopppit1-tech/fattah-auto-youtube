import type { PlaybackSession, SchedulerState, YouTubeSource } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const STORAGE_KEY = 'fattah-auto-youtube-state';
const DEFAULT_STATE: SchedulerState = {
  running: false,
  source: null,
  intervalSeconds: 3 * 60 * 60,
  sessionDurationSeconds: 4 * 60 * 60,
  activeSession: null,
  history: [],
};

function readLocalState(): SchedulerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function writeLocalState(state: SchedulerState): SchedulerState {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return { ...state, demoMode: true };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getState(): Promise<SchedulerState> {
  try {
    return await request<SchedulerState>('/api/state');
  } catch {
    return readLocalState();
  }
}

export async function saveSource(source: YouTubeSource): Promise<SchedulerState> {
  try {
    return await request<SchedulerState>('/api/source', { method: 'PUT', body: JSON.stringify({ url: source.url }) });
  } catch {
    return writeLocalState({ ...readLocalState(), source });
  }
}

function localSession(source: YouTubeSource): PlaybackSession {
  return {
    id: `demo-${Date.now()}`,
    source,
    startedAt: new Date().toISOString(),
    endedAt: null,
    durationSeconds: null,
    status: 'active',
  };
}

export async function startScheduler(): Promise<SchedulerState> {
  try {
    return await request<SchedulerState>('/api/start', { method: 'POST' });
  } catch {
    const state = readLocalState();
    if (!state.source) throw new Error('Simpan sumber YouTube sebelum Start.');
    const activeSession = localSession(state.source);
    return writeLocalState({ ...state, running: true, activeSession, history: [activeSession, ...state.history].slice(0, 30) });
  }
}

export async function stopScheduler(): Promise<SchedulerState> {
  try {
    return await request<SchedulerState>('/api/stop', { method: 'POST' });
  } catch {
    const state = readLocalState();
    const now = new Date();
    const history = state.history.map((session) => session.status === 'active'
      ? { ...session, status: 'stopped' as const, endedAt: now.toISOString(), durationSeconds: Math.max(0, Math.round((now.getTime() - new Date(session.startedAt).getTime()) / 1000)) }
      : session);
    return writeLocalState({ ...state, running: false, activeSession: null, history });
  }
}

export async function getHistory(): Promise<PlaybackSession[]> {
  try {
    return await request<PlaybackSession[]>('/api/history');
  } catch {
    return readLocalState().history;
  }
}
