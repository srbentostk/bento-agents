import { useEffect, useState } from 'react';

import { CHARACTER_SITTING_OFFSET_PX, TOOL_OVERLAY_VERTICAL_OFFSET } from '../../constants.js';
import type { SubagentCharacter } from '../../hooks/useExtensionMessages.js';
import type { OfficeState } from '../engine/officeState.js';
import type { ToolActivity } from '../types.js';
import { CharacterState, TILE_SIZE } from '../types.js';

interface ToolOverlayProps {
  officeState: OfficeState;
  agents: number[];
  agentTools: Record<number, ToolActivity[]>;
  subagentCharacters: SubagentCharacter[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
  onCloseAgent: (id: number) => void;
  alwaysShowOverlay: boolean;
  onAcceptPermission: (id: number) => void;
  onFocusAgent: (id: number) => void;
  onTogglePip: () => void;
}

/** Derive a short human-readable activity string from tools/status */
function getActivityText(
  agentId: number,
  agentTools: Record<number, ToolActivity[]>,
  isActive: boolean,
): string {
  const tools = agentTools[agentId];
  if (tools && tools.length > 0) {
    // Find the latest non-done tool
    const activeTool = [...tools].reverse().find((t) => !t.done);
    if (activeTool) {
      if (activeTool.permissionWait) return 'Needs approval';
      return activeTool.status;
    }
    // All tools done but agent still active (mid-turn) — keep showing last tool status
    if (isActive) {
      const lastTool = tools[tools.length - 1];
      if (lastTool) return lastTool.status;
    }
  }

  return 'Idle';
}

export function ToolOverlay({
  officeState,
  agents,
  agentTools,
  subagentCharacters,
  containerRef,
  zoom,
  panRef,
  onCloseAgent,
  alwaysShowOverlay,
  onAcceptPermission: onAcceptPermission,
  onFocusAgent,
  onTogglePip,
}: ToolOverlayProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setTick((n) => n + 1);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const el = containerRef.current;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const canvasW = Math.round(rect.width * dpr);
  const canvasH = Math.round(rect.height * dpr);
  const layout = officeState.getLayout();
  const mapW = layout.cols * TILE_SIZE * zoom;
  const mapH = layout.rows * TILE_SIZE * zoom;
  const deviceOffsetX = Math.floor((canvasW - mapW) / 2) + Math.round(panRef.current.x);
  const deviceOffsetY = Math.floor((canvasH - mapH) / 2) + Math.round(panRef.current.y);

  const selectedId = officeState.selectedAgentId;
  const hoveredId = officeState.hoveredAgentId;

  // All character IDs
  const allIds = [...agents, ...subagentCharacters.map((s) => s.id)];

  return (
    <>
      {allIds.map((id) => {
        const ch = officeState.characters.get(id);
        if (!ch) return null;

        const isSelected = selectedId === id;
        const isHovered = hoveredId === id;
        const isSub = ch.isSubagent;

        // Only show for hovered or selected agents (unless always-show is on)
        if (!alwaysShowOverlay && !isSelected && !isHovered) return null;

        // Position above character
        const sittingOffset = ch.state === CharacterState.TYPE ? CHARACTER_SITTING_OFFSET_PX : 0;
        const screenX = (deviceOffsetX + ch.x * zoom) / dpr;
        const screenY =
          (deviceOffsetY + (ch.y + sittingOffset - TOOL_OVERLAY_VERTICAL_OFFSET) * zoom) / dpr;

        // Get activity text
        const isAngry = ch.bubbleType === 'angry';
        const subHasPermission = isSub && (ch.bubbleType === 'permission' || isAngry);
        let activityText: string;
        if (isSub) {
          if (subHasPermission) {
            activityText = isAngry ? '😠 APROVAÇÃO!!!' : 'Needs approval';
          } else {
            const sub = subagentCharacters.find((s) => s.id === id);
            activityText = sub ? sub.label : 'Subtask';
          }
        } else if (isAngry) {
          activityText = '😠 APROVAÇÃO!!!';
        } else {
          activityText = getActivityText(id, agentTools, ch.isActive);
        }

        // Phone prefix for agents working without a desk
        const phonePrefix = ch.usingPhone && !isAngry ? '📱 ' : '';

        // Determine dot color
        const tools = agentTools[id];
        const hasPermission = subHasPermission || tools?.some((t) => t.permissionWait && !t.done);
        const hasActiveTools = tools?.some((t) => !t.done);
        const isActive = ch.isActive;

        let dotColor: string | null = null;
        if (isAngry) {
          dotColor = '#e74c3c'; // red — agent is angry
        } else if (hasPermission) {
          dotColor = 'var(--pixel-status-permission)';
        } else if (isActive && hasActiveTools) {
          dotColor = 'var(--pixel-status-active)';
        }

        return (
          <div
            key={id}
            style={{
              position: 'absolute',
              left: screenX,
              top: screenY - 24,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              pointerEvents: isSelected ? 'auto' : 'none',
              opacity: alwaysShowOverlay && !isSelected && !isHovered ? (isSub ? 0.5 : 0.75) : 1,
              zIndex: isSelected ? 'var(--pixel-overlay-selected-z)' : 'var(--pixel-overlay-z)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--pixel-bg)',
                border: isSelected
                  ? '2px solid var(--pixel-border-light)'
                  : '2px solid var(--pixel-border)',
                borderRadius: 0,
                padding: isSelected ? '3px 6px 3px 8px' : '3px 8px',
                boxShadow: 'var(--pixel-shadow)',
                whiteSpace: 'nowrap',
                maxWidth: 220,
              }}
            >
              {dotColor && (
                <span
                  className={isAngry || (isActive && !hasPermission) ? 'bento-agents-pulse' : undefined}
                  style={{
                    width: isAngry ? 8 : 6,
                    height: isAngry ? 8 : 6,
                    borderRadius: '50%',
                    background: dotColor,
                    flexShrink: 0,
                    boxShadow: isAngry ? '0 0 6px #e74c3c' : undefined,
                  }}
                />
              )}
              <div style={{ overflow: 'hidden' }}>
                <span
                  style={{
                    fontSize: isSub ? '20px' : '22px',
                    fontStyle: isSub ? 'italic' : undefined,
                    color: isAngry ? '#ff4444' : 'var(--pixel-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'block',
                    fontWeight: isAngry ? 'bold' : undefined,
                  }}
                >
                  {phonePrefix}{activityText}
                </span>
                {ch.folderName && (
                  <span
                    style={{
                      fontSize: '16px',
                      color: 'var(--pixel-text-dim)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    }}
                  >
                    {ch.folderName}
                  </span>
                )}
              </div>
              {isSelected && !isSub && (
                <div style={{ display: 'flex', gap: 4, marginLeft: 6, alignItems: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocusAgent(id);
                    }}
                    title="Focus Agent Terminal"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--pixel-text-dim)',
                      cursor: 'pointer',
                      padding: '0 2px',
                      fontSize: '18px',
                      lineHeight: 1,
                    }}
                  >
                    🎯
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePip();
                    }}
                    title="Picture-in-Picture"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--pixel-text-dim)',
                      cursor: 'pointer',
                      padding: '0 2px',
                      fontSize: '18px',
                      lineHeight: 1,
                    }}
                  >
                    📺
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseAgent(id);
                    }}
                    title="Close agent"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--pixel-close-text)',
                      cursor: 'pointer',
                      padding: '0 2px',
                      fontSize: '22px',
                      lineHeight: 1,
                      marginLeft: 2,
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--pixel-close-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--pixel-close-text)';
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              {hasPermission && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetId = isSub ? (subagentCharacters.find(s => s.id === id)?.parentAgentId ?? id) : id;
                    onAcceptPermission(targetId);
                  }}
                  title="Accept (Y)"
                  style={{
                    background: 'var(--pixel-status-permission)',
                    border: '1px solid currentColor',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    fontSize: '18px',
                    marginLeft: 2,
                    flexShrink: 0,
                    borderRadius: 2
                  }}
                >
                  Y
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
