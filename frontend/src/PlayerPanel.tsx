import { useEffect, useRef, useState } from 'react';
import type { YouTubePlayer } from './youtube';
import type { YouTubeSource } from './types';

interface PlayerPanelProps {
  source: YouTubeSource | null;
  running: boolean;
}

export function PlayerPanel({ source, running }: PlayerPanelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [apiReady, setApiReady] = useState(Boolean(window.YT));

  useEffect(() => {
    if (window.YT) {
      setApiReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      setApiReady(true);
    };
    return () => {
      window.onYouTubeIframeAPIReady = previous;
    };
  }, []);

  useEffect(() => {
    playerRef.current?.destroy();
    playerRef.current = null;
    if (!source || !apiReady || !mountRef.current || !window.YT) return;

    playerRef.current = new window.YT.Player(mountRef.current, {
      width: '100%',
      height: '100%',
      videoId: source.kind === 'video' ? source.id : undefined,
      playerVars: {
        autoplay: running ? 1 : 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        ...(source.kind === 'playlist' ? { listType: 'playlist', list: source.id } : {}),
      },
      events: {
        onReady: (event: { target: YouTubePlayer }) => {
          if (running) event.target.playVideo();
        },
      },
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [source, apiReady]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (running) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [running]);

  if (!source) {
    return (
      <div className="player-empty">
        <div className="empty-mark">▶</div>
        <strong>Belum ada sumber aktif</strong>
        <span>Masukkan URL video atau playlist di panel kontrol.</span>
      </div>
    );
  }

  return <div className="player-frame"><div ref={mountRef} className="youtube-mount" /></div>;
}
