/** minimalist Web Audio API wrapper for agent notifications */

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playOsc(freq: number, type: OscillatorType, volume: number, duration: number) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Audio play failed', e);
  }
}

/** Positive "ding" when task finishes */
export function playTaskDone() {
  playOsc(880, 'sine', 0.1, 0.3); // A5
}

/** Attention "ping" when permission needed */
export function playPermissionNeeded() {
  playOsc(440, 'triangle', 0.1, 0.5); // A4
}

/** Alert "buzz" for rate limit / strike */
export function playStrike() {
  playOsc(220, 'sawtooth', 0.1, 0.4); // A3
}

/** Subtle "pop" for bubble dismiss */
export function playBubblePop() {
  playOsc(660, 'sine', 0.05, 0.1); // E5
}
