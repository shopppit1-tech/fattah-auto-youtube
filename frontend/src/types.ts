export type SourceKind = 'video' | 'playlist';
export type SessionStatus = 'active' | 'completed' | 'stopped';

export interface YouTubeSource {
  url: string;
  kind: SourceKind;
  id: string;
  title: string;
}

export interface PlaybackSession {
  id: string;
  source: YouTubeSource;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  status: SessionStatus;
}

export interface SchedulerState {
  running: boolean;
  source: YouTubeSource | null;
  intervalSeconds: number;
  sessionDurationSeconds: number;
  activeSession: PlaybackSession | null;
  history: PlaybackSession[];
  demoMode?: boolean;
}
