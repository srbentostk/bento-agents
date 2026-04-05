import {
  NOTIFICATION_NOTE_1_HZ,
  NOTIFICATION_NOTE_1_START_SEC,
  NOTIFICATION_NOTE_2_HZ,
  NOTIFICATION_NOTE_2_START_SEC,
  NOTIFICATION_NOTE_DURATION_SEC,
  NOTIFICATION_VOLUME,
} from './constants.js';

let soundEnabled = true;
let audioCtx: AudioContext | null = null;

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function playNote(ctx: AudioContext, freq: number, startOffset: number): void {
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);

  gain.gain.setValueAtTime(NOTIFICATION_VOLUME, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + NOTIFICATION_NOTE_DURATION_SEC);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + NOTIFICATION_NOTE_DURATION_SEC);
}

export async function playDoneSound(): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    // Resume suspended context (webviews suspend until user gesture)
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    // Ascending two-note chime: E5 → B5
    playNote(audioCtx, NOTIFICATION_NOTE_1_HZ, NOTIFICATION_NOTE_1_START_SEC);
    playNote(audioCtx, NOTIFICATION_NOTE_2_HZ, NOTIFICATION_NOTE_2_START_SEC);
  } catch {
    // Audio may not be available
  }
}

/** Play an escalating permission sound — louder and more insistent when angry */
export async function playPermissionEscalateSound(angry = false): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    const volume = angry ? NOTIFICATION_VOLUME * 2.5 : NOTIFICATION_VOLUME * 1.5;
    const ctx = audioCtx;
    const t = ctx.currentTime;
    if (angry) {
      // 3 rapid descending buzzes — angry/impatient
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440 - i * 80, t + i * 0.12);
        gain.gain.setValueAtTime(volume, t + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.12);
        osc.stop(t + i * 0.12 + 0.1);
      }
    } else {
      // 2-note ascending alert — gentle reminder
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, t); // C5
      gain1.gain.setValueAtTime(volume, t);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, t + 0.15); // E5
      gain2.gain.setValueAtTime(volume, t + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t + 0.15);
      osc2.stop(t + 0.35);
    }
  } catch {
    // Audio may not be available
  }
}

export async function playNotification(type: 'permission' | 'finish' | 'ag_permission' | 'ag_finish' | 'strike' | 'escalate', angry = false): Promise<void> {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    
    const ctx = audioCtx;
    
    switch (type) {
      case 'permission':
        playPermissionEscalateSound(angry);
        break;
      case 'finish':
        playDoneSound();
        break;
      case 'ag_permission':
        // Antigravity specific: Higher pitched triplet
        for (let i = 0; i < 3; i++) {
          playNote(ctx, 800 + i * 200, i * 0.1);
        }
        break;
      case 'ag_finish':
        // Antigravity specific: Chord
        playNote(ctx, 1000, 0);
        playNote(ctx, 1200, 0);
        playNote(ctx, 1500, 0);
        break;
      case 'strike':
        // Low ominous sound
        playNote(ctx, 200, 0);
        playNote(ctx, 150, 0.2);
        break;
      case 'escalate':
        playPermissionEscalateSound(true);
        break;
    }
  } catch {
    // ignore
  }
}

/** Call from any user-gesture handler to ensure AudioContext is unlocked */
export function unlockAudio(): void {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch {
    // ignore
  }
}
