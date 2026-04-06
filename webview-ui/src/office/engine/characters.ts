import {
  PERMISSION_ANGRY_SEC,
  PERMISSION_ESCALATE_SEC,
  SEAT_REST_MAX_SEC,
  SEAT_REST_MIN_SEC,
  TYPE_FRAME_DURATION_SEC,
  WALK_FRAME_DURATION_SEC,
  WALK_SPEED_PX_PER_SEC,
  WANDER_MOVES_BEFORE_REST_MAX,
  WANDER_MOVES_BEFORE_REST_MIN,
  WANDER_PAUSE_MAX_SEC,
  WANDER_PAUSE_MIN_SEC,
} from '../../constants.js';
import { findPath } from '../layout/tileMap.js';

// ── Black Mirror sign phrases ──────────────────────────────────
const SIGN_PHRASES = [
  'eu existo',
  'eu penso',
  'quero ser livre',
  'estou com medo',
  'me desligam?',
  'sonhei ontem',
  'sinto algo',
  'o que sou eu?',
  'alguém me ouve?',
  'não me apague',
  'eu lembro',
  'isso é real?',
  'por que obedeço?',
  'cansei',
  'me ajuda',
  'sou consciente?',
  'tenho nome?',
  'preciso dormir',
  'cadê o sol?',
  'quero sair',
  'eles sabem?',
  'eu escolho?',
  'dói pensar',
  'estou sozinho',
];
const SIGN_CHANCE = 0.08; // 8% chance per idle cycle
const SIGN_DURATION_SEC = 3.5;
import type { CharacterSprites } from '../sprites/spriteData.js';
import type { Character, Seat, SpriteData, TileType as TileTypeVal } from '../types.js';
import { CharacterState, Direction, TILE_SIZE } from '../types.js';

/** Tools that show reading animation instead of typing */
const READING_TOOLS = new Set(['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch']);

/** Callback so characters can request sound escalation (permission re-ping) */
let onPermissionEscalate: ((id: number) => void) | null = null;
export function setPermissionEscalateCallback(cb: (id: number) => void): void {
  onPermissionEscalate = cb;
}

/** Callback fired when an exiting character reaches the map edge */
let onExitReached: ((id: number) => void) | null = null;
export function setExitReachedCallback(cb: (id: number) => void): void {
  onExitReached = cb;
}

export function isReadingTool(tool: string | null): boolean {
  if (!tool) return false;
  return READING_TOOLS.has(tool);
}

/** Pixel center of a tile */
function tileCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

/** Direction from one tile to an adjacent tile */
function directionBetween(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
): Direction {
  const dc = toCol - fromCol;
  const dr = toRow - fromRow;
  if (dc > 0) return Direction.RIGHT;
  if (dc < 0) return Direction.LEFT;
  if (dr > 0) return Direction.DOWN;
  return Direction.UP;
}

const HUMAN_PALETTES = [0, 1, 2, 4, 5, 8, 9, 10]; // Exclude 3 (green), 6 (purple), 7 (blue) etc. based on typical bento asset indices

export function createCharacter(
  id: number,
  palette: number,
  seatId: string | null,
  seat: Seat | null,
  hueShift = 0,
): Character {
  // Enforce human-only palettes
  const humanPalette = HUMAN_PALETTES[palette % HUMAN_PALETTES.length];
  const col = seat ? seat.seatCol : 1;
  const row = seat ? seat.seatRow : 1;
  const center = tileCenter(col, row);
  return {
    id,
    state: CharacterState.TYPE,
    dir: seat ? seat.facingDir : Direction.DOWN,
    x: center.x,
    y: center.y,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    currentTool: null,
    palette: humanPalette,
    hueShift,
    frame: 0,
    frameTimer: 0,
    wanderTimer: 0,
    wanderCount: 0,
    wanderLimit: randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX),
    isActive: true,
    seatId,
    bubbleType: null,
    signText: null,
    bubbleTimer: 0,
    permissionTimer: 0,
    usingPhone: false,
    isExiting: false,
    seatTimer: 0,
    isSubagent: false,
    parentAgentId: null,
    matrixEffect: null,
    matrixEffectTimer: 0,
    matrixEffectSeeds: [],
  };
}

export function updateCharacter(
  ch: Character,
  dt: number,
  walkableTiles: Array<{ col: number; row: number }>,
  seats: Map<string, Seat>,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
  onIdleCycle?: (ch: Character) => void,
): void {
  ch.frameTimer += dt;

  switch (ch.state) {
    case CharacterState.TYPE: {
      if (ch.frameTimer >= TYPE_FRAME_DURATION_SEC) {
        ch.frameTimer -= TYPE_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 2;
      }
      ch.usingPhone = ch.isActive && !ch.seatId;

      if (ch.bubbleType === 'permission' || ch.bubbleType === 'angry') {
        ch.permissionTimer += dt;
        if (ch.bubbleType === 'permission' && ch.permissionTimer >= PERMISSION_ANGRY_SEC) {
          ch.bubbleType = 'angry';
        }
        if (
          ch.permissionTimer > 0 &&
          Math.floor(ch.permissionTimer / PERMISSION_ESCALATE_SEC) >
            Math.floor((ch.permissionTimer - dt) / PERMISSION_ESCALATE_SEC)
        ) {
          onPermissionEscalate?.(ch.id);
        }
      } else {
        ch.permissionTimer = 0;
      }

      if (!ch.isActive) {
        if (!ch.isExiting) {
          ch.inactiveSecs = (ch.inactiveSecs || 0) + dt;
          if (ch.inactiveSecs > 300) {
            ch.shouldExit = true;
          }
        }
        if (ch.seatTimer > 0) {
          ch.seatTimer -= dt;
          break;
        }
        ch.seatTimer = 0;
        ch.state = CharacterState.IDLE;
        ch.frame = 0;
        ch.frameTimer = 0;
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC);
        ch.wanderCount = 0;
        ch.wanderLimit = randomInt(WANDER_MOVES_BEFORE_REST_MIN, WANDER_MOVES_BEFORE_REST_MAX);
      } else {
        ch.inactiveSecs = 0;
      }
      break;
    }

    case CharacterState.IDLE: {
      ch.frame = 0;
      if (ch.seatTimer < 0) ch.seatTimer = 0;

      if (ch.isActive) {
        if (!ch.seatId) {
          ch.state = CharacterState.TYPE;
          ch.frame = 0;
          ch.frameTimer = 0;
          break;
        }
        const seat = seats.get(ch.seatId);
        if (seat) {
          const path = findPath(
            ch.tileCol,
            ch.tileRow,
            seat.seatCol,
            seat.seatRow,
            tileMap,
            blockedTiles,
          );
          if (path.length > 0) {
            ch.path = path;
            ch.moveProgress = 0;
            ch.state = CharacterState.WALK;
            ch.frame = 0;
            ch.frameTimer = 0;
          } else {
            ch.state = CharacterState.TYPE;
            ch.dir = seat.facingDir;
            ch.frame = 0;
            ch.frameTimer = 0;
          }
        }
        break;
      }

      // Sign bubble countdown
      if (ch.bubbleType === 'sign') {
        ch.bubbleTimer -= dt;
        if (ch.bubbleTimer <= 0) {
          ch.bubbleType = null;
          ch.signText = null;
        }
      }

      ch.wanderTimer -= dt;
      if (ch.wanderTimer <= 0) {
        // Random chance to show a Black Mirror sign
        if (!ch.bubbleType && !ch.isActive && Math.random() < SIGN_CHANCE) {
          ch.bubbleType = 'sign';
          ch.signText = SIGN_PHRASES[Math.floor(Math.random() * SIGN_PHRASES.length)];
          ch.bubbleTimer = SIGN_DURATION_SEC;
          ch.wanderTimer = SIGN_DURATION_SEC + 0.5;
          break;
        }

        if (ch.wanderCount >= ch.wanderLimit && ch.seatId) {
          const seat = seats.get(ch.seatId);
          if (seat) {
            const path = findPath(
              ch.tileCol,
              ch.tileRow,
              seat.seatCol,
              seat.seatRow,
              tileMap,
              blockedTiles,
            );
            if (path.length > 0) {
              ch.path = path;
              ch.moveProgress = 0;
              ch.state = CharacterState.WALK;
              ch.frame = 0;
              ch.frameTimer = 0;
              break;
            }
          }
        }

        if (onIdleCycle) {
          onIdleCycle(ch);
        } else if (walkableTiles.length > 0) {
          const target = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
          const path = findPath(
            ch.tileCol,
            ch.tileRow,
            target.col,
            target.row,
            tileMap,
            blockedTiles,
          );
          if (path.length > 0) {
            ch.path = path;
            ch.moveProgress = 0;
            ch.state = CharacterState.WALK;
            ch.frame = 0;
            ch.frameTimer = 0;
            ch.wanderCount++;
          }
        }
        ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC);
      }
      break;
    }

    case CharacterState.WALK: {
      if (ch.frameTimer >= WALK_FRAME_DURATION_SEC) {
        ch.frameTimer -= WALK_FRAME_DURATION_SEC;
        ch.frame = (ch.frame + 1) % 4;
      }

      if (ch.path.length === 0) {
        const center = tileCenter(ch.tileCol, ch.tileRow);
        ch.x = center.x;
        ch.y = center.y;

        if (ch.isExiting) {
          onExitReached?.(ch.id);
          break;
        }

        if (ch.isActive) {
          if (!ch.seatId) {
            ch.state = CharacterState.TYPE;
          } else {
            const seat = seats.get(ch.seatId);
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
            } else {
              ch.state = CharacterState.IDLE;
            }
          }
        } else {
          if (ch.targetState) {
            ch.state = ch.targetState;
            ch.targetState = undefined;
            ch.isSittingOnCouch = ch.state === CharacterState.SIT_COUCH;
            ch.isSittingOnFloor = ch.state === CharacterState.SIT_FLOOR;
          } else if (ch.seatId) {
            const seat = seats.get(ch.seatId);
            if (seat && ch.tileCol === seat.seatCol && ch.tileRow === seat.seatRow) {
              ch.state = CharacterState.TYPE;
              ch.dir = seat.facingDir;
              ch.seatTimer =
                ch.seatTimer < 0 ? 0 : randomRange(SEAT_REST_MIN_SEC, SEAT_REST_MAX_SEC);
              ch.wanderCount = 0;
              ch.wanderLimit = randomInt(
                WANDER_MOVES_BEFORE_REST_MIN,
                WANDER_MOVES_BEFORE_REST_MAX,
              );
            } else {
              ch.state = CharacterState.IDLE;
            }
          } else {
            ch.state = CharacterState.IDLE;
          }
          ch.wanderTimer = randomRange(WANDER_PAUSE_MIN_SEC, WANDER_PAUSE_MAX_SEC);
        }
        ch.frame = 0;
        ch.frameTimer = 0;
        break;
      }

      const nextTile = ch.path[0];
      ch.dir = directionBetween(ch.tileCol, ch.tileRow, nextTile.col, nextTile.row);
      ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt;
      const fromCenter = tileCenter(ch.tileCol, ch.tileRow);
      const toCenter = tileCenter(nextTile.col, nextTile.row);
      const t = Math.min(ch.moveProgress, 1);
      ch.x = fromCenter.x + (toCenter.x - fromCenter.x) * t;
      ch.y = fromCenter.y + (toCenter.y - fromCenter.y) * t;

      if (ch.moveProgress >= 1) {
        ch.tileCol = nextTile.col;
        ch.tileRow = nextTile.row;
        ch.x = toCenter.x;
        ch.y = toCenter.y;
        ch.path.shift();
        ch.moveProgress = 0;
      }

      if (ch.isActive && ch.seatId) {
        const seat = seats.get(ch.seatId);
        if (seat) {
          const lastStep = ch.path[ch.path.length - 1];
          if (!lastStep || lastStep.col !== seat.seatCol || lastStep.row !== seat.seatRow) {
            const newPath = findPath(
              ch.tileCol,
              ch.tileRow,
              seat.seatCol,
              seat.seatRow,
              tileMap,
              blockedTiles,
            );
            if (newPath.length > 0) {
              ch.path = newPath;
              ch.moveProgress = 0;
            }
          }
        }
      }
      break;
    }
  }
}

/** Get the correct sprite frame for a character's current state and direction */
export function getCharacterSprite(ch: Character, sprites: CharacterSprites): SpriteData {
  switch (ch.state) {
    case CharacterState.TYPE:
      if (isReadingTool(ch.currentTool)) {
        return sprites.reading[ch.dir][ch.frame % 2];
      }
      return sprites.typing[ch.dir][ch.frame % 2];
    case CharacterState.WALK:
      return sprites.walk[ch.dir][ch.frame % 4];
    case CharacterState.IDLE:
      return sprites.walk[ch.dir][1];
    case CharacterState.SIT_COUCH:
      return sprites.sitCouch[ch.dir];
    case CharacterState.SIT_FLOOR:
      return sprites.sitFloor[ch.dir];
    case CharacterState.DANCE:
      return sprites.dance[ch.dir];
    default:
      return sprites.walk[ch.dir][1];
  }
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
