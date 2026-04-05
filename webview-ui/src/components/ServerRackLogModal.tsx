import { useEffect, useRef, useState } from 'react';

import type { ServerInfo } from './ServerPanel.js';

const btnBase: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--pixel-accent)',
  color: 'var(--pixel-accent)',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '2px 8px',
  borderRadius: 0,
};

interface LogModalProps {
  server: ServerInfo;
  logs: string[];
  onClose: () => void;
}

export function LogModal({ server, logs, onClose }: LogModalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '88vw',
          maxWidth: 720,
          height: '70vh',
          background: '#0d0e1a',
          border: `2px solid ${server.color}`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 0 32px ${server.color}55`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            borderBottom: `1px solid ${server.color}`,
            background: `${server.color}18`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: server.color, fontSize: '16px', fontWeight: 'bold' }}>
              ⚡ {server.name}
            </span>
            {server.port && (
              <span style={{ color: '#3498db', fontSize: '13px', fontFamily: 'monospace' }}>
                {server.localAddr ?? '0.0.0.0'}:{server.port}
              </span>
            )}
            {server.pid !== undefined && (
              <span style={{ color: '#555', fontSize: '11px', fontFamily: 'monospace' }}>
                pid:{server.pid}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#888', fontSize: '12px' }}>{server.command}</span>
            <button
              style={{ ...btnBase, borderColor: server.color, color: server.color, fontSize: '11px' }}
              onClick={() => setAutoScroll((v) => !v)}
              title="Alternar auto-scroll"
            >
              {autoScroll ? '⏬ Auto' : '📌 Manual'}
            </button>
            <button
              style={{ ...btnBase, borderColor: '#888', color: '#888', padding: '2px 6px' }}
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Log output */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: 1.5,
            color: '#c8ffcc',
            background: '#080a10',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {logs.length === 0 ? (
            <span style={{ color: '#555' }}>Sem output ainda...</span>
          ) : (
            logs.map((line, i) => (
              <div key={i} style={{ color: line.startsWith('[processo]') ? '#e74c3c' : '#c8ffcc' }}>
                {line}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
