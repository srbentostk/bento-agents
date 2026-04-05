import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DATACENTER_SERVERS_PER_ROW,
  DATACENTER_START_COL,
  DATACENTER_START_ROW,
} from '../constants.js';
import { TILE_SIZE } from '../office/types.js';
import { vscode } from '../vscodeApi.js';
import type { ServerInfo } from './ServerPanel.js';
import { LogModal } from './ServerRackLogModal.js';

// Each tower occupies 1 tile wide × 2 tiles tall in the datacenter
const TOWER_W = 1;
const TOWER_H = 2;
// Datacenter zone: matches default-layout-1.json datacenter room
// Servers spawn starting at col DATACENTER_START_COL, row DATACENTER_START_ROW
// in a DATACENTER_SERVERS_PER_ROW-column grid with 1-tile gaps between columns
const DC_COL_GAP = 2; // tiles between each server column

interface ServerRackOverlayProps {
  servers: ServerInfo[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
  layoutCols: number;
  layoutRows: number;
}

interface LogState {
  serverId: string;
  logs: string[];
}

export function ServerRackOverlay({
  servers,
  containerRef,
  zoom,
  panRef,
  layoutCols,
  layoutRows,
}: ServerRackOverlayProps) {
  const [, setTick] = useState(0);
  const [openLog, setOpenLog] = useState<LogState | null>(null);
  const logsRef = useRef<Record<string, string[]>>({});

  // RAF-driven re-render to stay in sync with pan/zoom
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setTick((n) => n + 1);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Listen for log messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'serverLog') {
        const id = msg.id as string;
        const text = msg.text as string;
        const lines = text
          .split('\n')
          .map((l: string) => l.trimEnd())
          .filter((l: string) => l.length > 0);
        const existing = logsRef.current[id] ?? [];
        logsRef.current = { ...logsRef.current, [id]: [...existing, ...lines].slice(-500) };
        if (openLog?.serverId === id) {
          setOpenLog({ serverId: id, logs: logsRef.current[id] });
        }
      } else if (msg.type === 'serverLogsSnapshot') {
        const id = msg.id as string;
        const lines = msg.lines as string[];
        logsRef.current = { ...logsRef.current, [id]: lines };
        if (openLog?.serverId === id) {
          setOpenLog({ serverId: id, logs: lines });
        }
      } else if (msg.type === 'serverRemoved') {
        const id = msg.id as string;
        const { [id]: _, ...rest } = logsRef.current;
        logsRef.current = rest;
        if (openLog?.serverId === id) setOpenLog(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [openLog]);

  const handleTowerClick = useCallback((server: ServerInfo) => {
    vscode.postMessage({ type: 'requestServerLogs', id: server.id });
    setOpenLog({ serverId: server.id, logs: logsRef.current[server.id] ?? [] });
  }, []);

  const el = containerRef.current;
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const canvasW = Math.round(rect.width * dpr);
  const canvasH = Math.round(rect.height * dpr);
  const mapW = layoutCols * TILE_SIZE * zoom;
  const mapH = layoutRows * TILE_SIZE * zoom;
  const deviceOffsetX = Math.floor((canvasW - mapW) / 2) + Math.round(panRef.current.x);
  const deviceOffsetY = Math.floor((canvasH - mapH) / 2) + Math.round(panRef.current.y);

  const towerPixelW = (TOWER_W * TILE_SIZE * zoom) / dpr;
  const towerPixelH = (TOWER_H * TILE_SIZE * zoom) / dpr;

  const openServer = openLog ? servers.find((s) => s.id === openLog.serverId) ?? null : null;

  return (
    <>
      {servers.map((server, index) => {
        // 4-column grid inside the datacenter zone
        // e.g. cols 29, 31, 33, 35 (with DC_COL_GAP=2 between each)
        const colIdx = index % DATACENTER_SERVERS_PER_ROW;
        const rowIdx = Math.floor(index / DATACENTER_SERVERS_PER_ROW);
        const towerCol = DATACENTER_START_COL + colIdx * DC_COL_GAP;
        const towerRow = DATACENTER_START_ROW + rowIdx * TOWER_H;

        const worldX = towerCol * TILE_SIZE;
        const worldY = towerRow * TILE_SIZE;
        const screenX = (deviceOffsetX + worldX * zoom) / dpr;
        const screenY = (deviceOffsetY + worldY * zoom) / dpr;

        const isRunning = server.status === 'running';
        const ledColor = isRunning ? '#2ecc71' : server.status === 'error' ? '#e74c3c' : '#444';
        const ledSize = Math.max(2, Math.round(zoom * 1.5));
        const fontSize = Math.max(5, Math.round(zoom * 1.8));
        const borderW = Math.max(1, Math.round(zoom * 0.4));

        return (
          <div
            key={server.id}
            title={`${server.name}${server.port ? ` :${server.port}` : ''} — ${server.status}\nClique para ver logs`}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY,
              width: towerPixelW,
              height: towerPixelH,
              cursor: 'pointer',
              // z-index baixo: agentes caminham na frente
              zIndex: 20,
              userSelect: 'none',
            }}
            onClick={() => handleTowerClick(server)}
          >
            {/* Corpo da torre PC */}
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(180deg, #111318 0%, #0a0c10 100%)',
                border: `${borderW}px solid ${isRunning ? server.color + '88' : '#2a2d35'}`,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${Math.max(1, Math.round(zoom * 0.5))}px`,
                imageRendering: 'pixelated',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Reflexo lateral esquerdo (detalhe metálico) */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: Math.max(1, Math.round(zoom * 0.5)),
                  height: '100%',
                  background: isRunning ? `${server.color}22` : '#ffffff08',
                  pointerEvents: 'none',
                }}
              />

              {/* LED de status no topo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  gap: Math.max(1, Math.round(zoom * 0.5)),
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: ledSize,
                    height: ledSize,
                    borderRadius: '50%',
                    background: ledColor,
                    boxShadow: isRunning ? `0 0 ${ledSize * 2}px ${ledColor}` : 'none',
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Slot de disco (linha horizontal decorativa) */}
              <div
                style={{
                  width: '70%',
                  height: Math.max(1, Math.round(zoom * 0.4)),
                  background: '#1e2230',
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />

              {/* Segundo slot menor */}
              <div
                style={{
                  width: '50%',
                  height: Math.max(1, Math.round(zoom * 0.3)),
                  background: '#181b24',
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              />

              {/* Nome truncado na base */}
              <div
                style={{
                  color: isRunning ? server.color : '#555',
                  fontSize,
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  lineHeight: 1,
                  width: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {server.port ? `:${server.port}` : server.name.slice(0, 4)}
              </div>
            </div>
          </div>
        );
      })}

      {openLog && openServer && (
        <LogModal
          server={openServer}
          logs={openLog.logs}
          onClose={() => setOpenLog(null)}
        />
      )}
    </>
  );
}
