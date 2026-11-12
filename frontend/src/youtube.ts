import type { YouTubeSource } from './types';

export interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; CUED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function parseYouTubeUrl(rawUrl: string): YouTubeSource {
  const value = rawUrl.trim();
  if (!value) throw new Error('Masukkan URL YouTube terlebih dahulu.');

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('URL tidak valid. Gunakan tautan YouTube lengkap.');
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const isYouTube = host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be';
  if (!isYouTube) throw new Error('Tautan harus berasal dari YouTube.');

  const playlistId = parsed.searchParams.get('list');
  if (playlistId) {
    return { url: value, kind: 'playlist', id: playlistId, title: `Playlist ${playlistId}` };
  }

  const videoId = host === 'youtu.be'
    ? parsed.pathname.slice(1)
    : parsed.searchParams.get('v');
  if (!videoId || videoId.length < 6) {
    throw new Error('URL YouTube tidak berisi ID video atau playlist yang dikenali.');
  }

  return { url: value, kind: 'video', id: videoId, title: `Video ${videoId}` };
}
