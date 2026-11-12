import type { PlaybackSession, SchedulerState, YouTubeSource } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');

function requireBackend() {
  if (!API_BASE) {
    throw new Error('Backend produksi belum dikonfigurasi. Set VITE_API_BASE_URL pada GitHub Actions.');
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  requireBackend();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    let detail = `Backend mengembalikan HTTP ${response.status}.`;
    try {
      const payload = await response.json() as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // Keep the HTTP error when the backend did not return JSON.
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export function getState(): Promise<SchedulerState> {
  return request<SchedulerState>('/api/state');
}

export function saveSource(source: YouTubeSource): Promise<SchedulerState> {
  return request<SchedulerState>('/api/source', { method: 'PUT', body: JSON.stringify({ url: source.url }) });
}

export function startScheduler(): Promise<SchedulerState> {
  return request<SchedulerState>('/api/start', { method: 'POST' });
}

export function stopScheduler(): Promise<SchedulerState> {
  return request<SchedulerState>('/api/stop', { method: 'POST' });
}

export function getHistory(): Promise<PlaybackSession[]> {
  return request<PlaybackSession[]>('/api/history');
}
