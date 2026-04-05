import { useCallback, useEffect, useRef, useState } from 'react';

import { vscode } from '../vscodeApi.js';

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface ServerInfo {
  id: string;
  name: string;
  command: string;
  cwd: string;
  color: string;
  status: 'running' | 'stopped' | 'error';
  exitCode: number | null;
  pid: number | undefined;
  port?: number;
  localAddr?: string;
  isDetected?: boolean;
}

interface ServerPanelProps {
  servers: ServerInfo[];
  onClose: () => void;
}

// ── Estilos base ───────────────────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 56,
  right: 8,
  width: 340,
  maxHeight: 420,
  background: 'var(--pixel-bg)',
  border: '2px solid var(--pixel-accent)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 60,
  fontFamily: 'monospace',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 10px',
  borderBottom: '1px solid var(--pixel-accent)',
  background: 'rgba(200, 160, 32, 0.08)',
};

const titleStyle: React.CSSProperties = {
  color: 'var(--pixel-accent)',
  fontSize: '18px',
  fontWeight: 'bold',
  letterSpacing: 1,
};

const btnBase: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--pixel-accent)',
  color: 'var(--pixel-accent)',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '2px 8px',
  borderRadius: 0,
};

const bodyStyle: React.CSSProperties = {
  overflowY: 'auto',
  flex: 1,
  padding: '6px 0',
};

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ServerInfo['status'] }) {
  const colors: Record<ServerInfo['status'], string> = {
    running: '#2ecc71',
    stopped: '#888',
    error: '#e74c3c',
  };
  const labels: Record<ServerInfo['status'], string> = {
    running: '● ONLINE',
    stopped: '○ PARADO',
    error: '✕ ERRO',
  };
  return (
    <span
      style={{
        color: colors[status],
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: 0.5,
        minWidth: 68,
      }}
    >
      {labels[status]}
    </span>
  );
}

// ── Modal de Logs ───────────────────────────────────────────────────────────
interface LogModalProps {
  server: ServerInfo;
  logs: string[];
  onClose: () => void;
}

function LogModal({ server, logs, onClose }: LogModalProps) {
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
          <span style={{ color: server.color, fontSize: '16px', fontWeight: 'bold' }}>
            ⚡ {server.name}
          </span>
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

// ── Modal Adicionar Servidor ────────────────────────────────────────────────
interface AddServerModalProps {
  onClose: () => void;
  onAdd: (name: string, command: string, cwd: string) => void;
  selectedCwd: string;
}

function AddServerModal({ onClose, onAdd, selectedCwd }: AddServerModalProps) {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('npm run dev');
  const [cwd, setCwd] = useState(selectedCwd);

  useEffect(() => {
    setCwd(selectedCwd);
  }, [selectedCwd]);

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !command.trim()) return;
    onAdd(name.trim(), command.trim(), cwd.trim());
    onClose();
  }, [name, command, cwd, onAdd, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
      if (e.key === 'Escape') onClose();
    },
    [handleSubmit, onClose],
  );

  const inputStyle: React.CSSProperties = {
    background: '#080a10',
    border: '1px solid var(--pixel-accent)',
    color: 'var(--pixel-text)',
    padding: '4px 8px',
    fontSize: '13px',
    fontFamily: 'monospace',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--pixel-text-dim)',
    fontSize: '12px',
    marginBottom: 3,
    display: 'block',
  };

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
          width: 360,
          background: '#0d0e1a',
          border: '2px solid var(--pixel-accent)',
          padding: '16px',
          boxShadow: '0 4px 32px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div
          style={{
            color: 'var(--pixel-accent)',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: 14,
            borderBottom: '1px solid var(--pixel-accent)',
            paddingBottom: 6,
          }}
        >
          🖥️ Novo Servidor
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Nome</label>
          <input
            autoFocus
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: frontend, api, db"
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Comando</label>
          <input
            style={inputStyle}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="npm run dev"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Diretório (opcional)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="(pasta do workspace)"
            />
            <button
              style={{ ...btnBase, whiteSpace: 'nowrap', fontSize: '12px' }}
              onClick={() => vscode.postMessage({ type: 'browseServerCwd' })}
              title="Escolher pasta"
            >
              📁
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button style={{ ...btnBase, borderColor: '#555', color: '#888' }} onClick={onClose}>
            Cancelar
          </button>
          <button
            style={{
              ...btnBase,
              background: 'var(--pixel-accent)',
              color: '#000',
              borderColor: 'var(--pixel-accent)',
              fontWeight: 'bold',
            }}
            onClick={handleSubmit}
            disabled={!name.trim() || !command.trim()}
          >
            Iniciar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card de servidor ────────────────────────────────────────────────────────
interface ServerCardProps {
  server: ServerInfo;
  onLogs: () => void;
  onStop: () => void;
  onRemove: () => void;
}

function ServerCard({ server, onLogs, onStop, onRemove }: ServerCardProps) {
  const isRunning = server.status === 'running';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '5px 10px',
        gap: 8,
        borderBottom: '1px solid rgba(200,160,32,0.12)',
        transition: 'background 0.15s',
      }}
    >
      {/* Indicador de cor */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: server.color,
          boxShadow: isRunning ? `0 0 6px ${server.color}` : 'none',
          flexShrink: 0,
        }}
      />

      {/* Nome + comando + porta */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            color: 'var(--pixel-text)',
            fontSize: '13px',
            fontWeight: 'bold',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {server.name}
          {server.isDetected && (
            <span style={{ color: '#888', fontWeight: 'normal', marginLeft: 4, fontSize: '10px' }}>
              (detectado)
            </span>
          )}
        </div>
        <div
          style={{
            color: 'var(--pixel-text-dim)',
            fontSize: '10px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {server.port ? (
            <span style={{ color: '#3498db' }}>
              {server.localAddr ?? '0.0.0.0'}:{server.port}
            </span>
          ) : (
            server.command
          )}
        </div>
      </div>

      <StatusBadge status={server.status} />

      {/* Ações */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button
          style={{ ...btnBase, fontSize: '11px', padding: '1px 6px' }}
          onClick={onLogs}
          title="Ver logs"
        >
          Logs
        </button>
        {isRunning ? (
          <button
            style={{
              ...btnBase,
              fontSize: '11px',
              padding: '1px 6px',
              borderColor: '#e74c3c',
              color: '#e74c3c',
            }}
            onClick={onStop}
            title="Forçar encerramento"
          >
            Kill
          </button>
        ) : (
          <button
            style={{
              ...btnBase,
              fontSize: '11px',
              padding: '1px 6px',
              borderColor: '#555',
              color: '#666',
            }}
            onClick={onRemove}
            title="Remover"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ── ServerPanel principal ───────────────────────────────────────────────────
export function ServerPanel({ servers, onClose }: ServerPanelProps) {
  const [logsServerId, setLogsServerId] = useState<string | null>(null);
  const [logsData, setLogsData] = useState<Record<string, string[]>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [pendingCwd, setPendingCwd] = useState('');

  // Recebe logs do extension
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'serverLog') {
        const text = msg.text as string;
        const id = msg.id as string;
        const newLines = text
          .split('\n')
          .map((l: string) => l.trimEnd())
          .filter((l: string) => l.length > 0);
        setLogsData((prev) => {
          const existing = prev[id] ?? [];
          return { ...prev, [id]: [...existing, ...newLines].slice(-500) };
        });
      } else if (msg.type === 'serverLogsSnapshot') {
        const id = msg.id as string;
        const lines = msg.lines as string[];
        setLogsData((prev) => ({ ...prev, [id]: lines }));
      } else if (msg.type === 'serverRemoved') {
        const id = msg.id as string;
        setLogsData((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (logsServerId === id) setLogsServerId(null);
      } else if (msg.type === 'serverCwdSelected') {
        setPendingCwd(msg.path as string);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [logsServerId]);

  const handleOpenLogs = useCallback(
    (id: string) => {
      setLogsServerId(id);
      vscode.postMessage({ type: 'requestServerLogs', id });
    },
    [],
  );

  const handleStop = useCallback((id: string) => {
    vscode.postMessage({ type: 'stopServer', id });
  }, []);

  const handleRemove = useCallback((id: string) => {
    vscode.postMessage({ type: 'removeServer', id });
  }, []);

  const handleAdd = useCallback((name: string, command: string, cwd: string) => {
    vscode.postMessage({ type: 'startServer', name, command, cwd: cwd || undefined });
    setPendingCwd('');
  }, []);

  const logsServer = logsServerId ? servers.find((s) => s.id === logsServerId) : null;

  return (
    <>
      <div style={panelStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={titleStyle}>🖥️ SERVIDORES</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--pixel-text-dim)', fontSize: '12px' }}>
              {servers.filter((s) => s.status === 'running').length}/{servers.length} online
            </span>
            <button
              style={{ ...btnBase, padding: '2px 10px', fontWeight: 'bold', fontSize: '16px' }}
              onClick={() => setShowAdd(true)}
              title="Adicionar servidor"
            >
              +
            </button>
            <button
              style={{ ...btnBase, padding: '2px 6px', borderColor: '#555', color: '#888' }}
              onClick={onClose}
              title="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista */}
        <div style={bodyStyle}>
          {servers.length === 0 ? (
            <div
              style={{
                color: 'var(--pixel-text-dim)',
                fontSize: '12px',
                textAlign: 'center',
                padding: '20px 0',
              }}
            >
              Nenhum servidor rodando.
              <br />
              <button
                style={{ ...btnBase, marginTop: 8, fontSize: '12px' }}
                onClick={() => setShowAdd(true)}
              >
                + Adicionar servidor
              </button>
            </div>
          ) : (
            servers.map((s) => (
              <ServerCard
                key={s.id}
                server={s}
                onLogs={() => handleOpenLogs(s.id)}
                onStop={() => handleStop(s.id)}
                onRemove={() => handleRemove(s.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Modal de logs */}
      {logsServer && (
        <LogModal
          server={logsServer}
          logs={logsData[logsServer.id] ?? []}
          onClose={() => setLogsServerId(null)}
        />
      )}

      {/* Modal adicionar servidor */}
      {showAdd && (
        <AddServerModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
          selectedCwd={pendingCwd}
        />
      )}
    </>
  );
}
