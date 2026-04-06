import { useCallback, useEffect, useRef, useState } from 'react';

import { OfficeState } from '../office/engine/officeState.js';
import { isBrowserRuntime } from '../runtime.js';
import { vscode } from '../vscodeApi.js';

interface JukeboxOverlayProps {
  officeState: OfficeState;
  onClose: () => void;
}

// Built-in lo-fi radio streams (free, no auth required)
const RADIO_STATIONS = [
  { name: 'Lo-Fi Hip Hop', url: 'https://streams.ilovemusic.de/iloveradio17.mp3' },
  { name: 'Chillhop', url: 'https://streams.ilovemusic.de/iloveradio21.mp3' },
  { name: 'Jazz Radio', url: 'https://streaming.radio.co/s774887f7b/listen' },
  { name: 'Ambient', url: 'https://streams.ilovemusic.de/iloveradio27.mp3' },
];

export function JukeboxOverlay({ officeState, onClose }: JukeboxOverlayProps) {
  const [activeStation, setActiveStation] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(30);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element once
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume / 100;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const playStation = useCallback(
    (idx: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (activeStation === idx && isPlaying) {
        audio.pause();
        setIsPlaying(false);
        officeState.isMusicPlaying = false;
        return;
      }

      audio.src = RADIO_STATIONS[idx].url;
      audio
        .play()
        .then(() => {
          setActiveStation(idx);
          setIsPlaying(true);
          officeState.isMusicPlaying = true;
        })
        .catch(() => {
          // Stream might be blocked — try next
          setIsPlaying(false);
          officeState.isMusicPlaying = false;
        });
    },
    [activeStation, isPlaying, officeState],
  );

  const stopMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    setActiveStation(null);
    officeState.isMusicPlaying = false;
  }, [officeState]);

  const openYoutube = useCallback(() => {
    if (!youtubeUrl.trim()) return;
    const url = youtubeUrl.startsWith('http')
      ? youtubeUrl
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeUrl)}`;
    if (isBrowserRuntime) {
      window.open(url, '_blank');
    } else {
      vscode.postMessage({ type: 'openExternal', url });
    }
  }, [youtubeUrl]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 380,
        background: 'var(--pixel-bg, #0d0e1a)',
        border: '2px solid var(--pixel-accent, #c8a020)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        zIndex: 100,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        fontFamily: 'monospace',
        color: 'var(--pixel-text, #e8dfc0)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--pixel-accent, #c8a020)' }}>
          JUKEBOX B.E.N.T.O.
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--pixel-text-dim, #c8b890b3)',
            cursor: 'pointer',
            fontSize: 18,
            padding: '0 4px',
          }}
        >
          X
        </button>
      </div>

      {/* Radio stations */}
      <div style={{ fontSize: 11, color: 'var(--pixel-text-dim, #c8b890b3)', marginBottom: -4 }}>
        RADIO STREAMS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {RADIO_STATIONS.map((station, i) => (
          <button
            key={station.name}
            onClick={() => playStation(i)}
            style={{
              background:
                activeStation === i && isPlaying
                  ? 'var(--pixel-accent, #c8a020)'
                  : 'rgba(255,255,255,0.05)',
              color: activeStation === i && isPlaying ? '#000' : 'var(--pixel-text, #e8dfc0)',
              border: '1px solid var(--pixel-accent, #c8a020)',
              padding: '6px 10px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 13,
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{station.name}</span>
            <span>{activeStation === i && isPlaying ? '[ PLAYING ]' : '[ PLAY ]'}</span>
          </button>
        ))}
      </div>

      {/* Volume + Stop */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, minWidth: 28 }}>VOL</span>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--pixel-accent, #c8a020)' }}
        />
        <span style={{ fontSize: 11, minWidth: 28, textAlign: 'right' }}>{volume}%</span>
        {isPlaying && (
          <button
            onClick={stopMusic}
            style={{
              background: 'rgba(180,40,40,0.8)',
              border: 'none',
              color: '#fff',
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            STOP
          </button>
        )}
      </div>

      {/* YouTube external */}
      <div style={{ borderTop: '1px solid rgba(200,160,32,0.2)', paddingTop: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--pixel-text-dim, #c8b890b3)', marginBottom: 6 }}>
          YOUTUBE (abre no navegador)
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && openYoutube()}
            placeholder="Link ou busca..."
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid var(--pixel-accent, #c8a020)',
              padding: '6px 8px',
              color: 'var(--pixel-text, #e8dfc0)',
              fontFamily: 'monospace',
              fontSize: 12,
              outline: 'none',
            }}
          />
          <button
            onClick={openYoutube}
            style={{
              background: 'var(--pixel-accent, #c8a020)',
              border: 'none',
              color: '#000',
              padding: '6px 12px',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              fontSize: 12,
            }}
          >
            GO
          </button>
        </div>
      </div>

      {/* Status */}
      <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--pixel-text-dim, #c8b890b3)' }}>
        {isPlaying
          ? `[ TRANSMISSAO ATIVA — ${RADIO_STATIONS[activeStation!]?.name} ]`
          : '[ SELECIONE UMA ESTACAO ]'}
      </div>
    </div>
  );
}
