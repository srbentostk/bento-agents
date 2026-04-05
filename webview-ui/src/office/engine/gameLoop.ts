import { MAX_DELTA_TIME_SEC } from '../../constants.js';

export interface GameLoopCallbacks {
  update: (dt: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
}

export function startGameLoop(canvas: HTMLCanvasElement, callbacks: GameLoopCallbacks): () => void {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  let lastTime = 0;
  let rafId = 0;
  let stopped = false;

  const frame = (time: number) => {
    if (stopped) return;
    const dt = lastTime === 0 ? 0 : (time - lastTime) / 1000;
    
    // 30 FPS Cap: ~33.3ms per frame
    if (dt < 0.033) {
      rafId = requestAnimationFrame(frame);
      return;
    }
    
    lastTime = time;
    callbacks.update(Math.min(dt, MAX_DELTA_TIME_SEC));

    ctx.imageSmoothingEnabled = false;
    callbacks.render(ctx);

    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
