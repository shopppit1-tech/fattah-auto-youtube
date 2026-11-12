import type { YouTubeSource } from './types';

interface PlayerPanelProps {
  source: YouTubeSource | null;
  running: boolean;
}

function buildEmbedUrl(source: YouTubeSource, running: boolean) {
  const params = new URLSearchParams({
    autoplay: running ? '1' : '0',
    controls: '1',
    rel: '0',
    modestbranding: '1',
    enablejsapi: '1',
    origin: window.location.origin,
  });

  if (source.kind === 'playlist') {
    params.set('listType', 'playlist');
    params.set('list', source.id);
    return `https://www.youtube.com/embed?${params.toString()}`;
  }

  return `https://www.youtube.com/embed/${source.id}?${params.toString()}`;
}

export function PlayerPanel({ source, running }: PlayerPanelProps) {
  if (!source) {
    return (
      <div className="player-empty">
        <div className="empty-mark">▶</div>
        <strong>Belum ada sumber aktif</strong>
        <span>Masukkan URL video atau playlist di panel kontrol.</span>
      </div>
    );
  }

  return (
    <div className="player-frame">
      <iframe
        className="youtube-iframe"
        title={source.title}
        src={buildEmbedUrl(source, running)}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
