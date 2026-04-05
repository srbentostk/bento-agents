import React, { useState } from 'react';

import { OfficeState } from '../office/engine/officeState.js';

interface JukeboxOverlayProps {
  officeState: OfficeState;
  onClose: () => void;
}

export function JukeboxOverlay({ officeState, onClose }: JukeboxOverlayProps) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  const extractVideoId = (input: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    const id = extractVideoId(newUrl);
    if (id) {
      setVideoId(id);
      setIsPlaying(true);
      officeState.isMusicPlaying = true;
    }
  };

  const togglePlay = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    officeState.isMusicPlaying = newState;
  };

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '400px',
      background: 'rgba(30, 30, 46, 0.85)',
      backdropFilter: 'blur(12px)',
      border: '2px solid var(--pixel-accent)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 100,
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      color: '#fff',
      fontFamily: 'monospace'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--pixel-accent)' }}>📻 Jukebox</h2>
        <button 
          onClick={onClose}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#fff', 
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '14px', opacity: 0.8 }}>YouTube Link</label>
        <input 
          type="text" 
          value={url}
          onChange={handleUrlChange}
          placeholder="Paste YouTube music link..."
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--pixel-border)',
            padding: '8px',
            color: '#fff',
            outline: 'none'
          }}
        />
      </div>

      {videoId && (
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
          <iframe
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0&playlist=${videoId}&loop=1&enablejsapi=1`}
            allow="autoplay; encrypted-media"
          />
          {!isPlaying && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '40px' }}>⏸️</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button 
          onClick={togglePlay}
          style={{
            background: isPlaying ? 'var(--pixel-danger-bg)' : 'var(--pixel-accent)',
            border: 'none',
            color: '#fff',
            padding: '10px 20px',
            cursor: 'pointer',
            flex: 1,
            fontWeight: 'bold'
          }}
        >
          {isPlaying ? 'PAUSE MUSIC' : 'PLAY MUSIC'}
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
          <span>🔈</span>
          <input 
            type="range" 
            min="0" max="100" 
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--pixel-accent)' }}
          />
          <span>🔊</span>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '12px', textAlign: 'center', opacity: 0.6 }}>
        {officeState.isMusicPlaying ? '✨ AGENTS ARE DANCING! ✨' : 'Select music to make them dance'}
      </p>
    </div>
  );
}
