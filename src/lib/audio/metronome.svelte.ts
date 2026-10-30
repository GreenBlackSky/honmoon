import { ac, acIfAny } from './context';
import { metClick } from './synth';

/* ---------------- metronome ----------------
   Timers drift; the audio clock does not. A short polling loop schedules
   clicks a fraction of a second ahead on the Web Audio timeline, so the beats
   are placed by the sound hardware rather than by JavaScript. The reactive
   fields drive the screen; the rest is bookkeeping. */
export const met = $state({
  on: false,
  bpm: 72,
  beats: 4,
  sub: 1,
  subClick: false,
  /** the beat light: '' off, 'hit' on a beat, 'hit one' on the downbeat */
  flash: '',
  /** "2 / 4" while running */
  beatLabel: '—',
});

/** How far ahead clicks are put on the audio clock, and how often the
    scheduler looks. */
const LOOKAHEAD_S = 0.14;
const SCHEDULER_INTERVAL_MS = 25;
const FLASH_MS = 90;
export const BPM_MIN = 40;
export const BPM_MAX = 200;
/** Tap tempo: taps older than this are forgotten, and an average gap outside
    250–1600 ms (240 down to about 38 bpm) is not taken as a beat. */
const TAP_MEMORY_MS = 2500;
const TAP_GAP_MIN_MS = 250;
const TAP_GAP_MAX_MS = 1600;

let timer: ReturnType<typeof setInterval> | null = null;
/** Clicks scheduled so far (subdivisions included), and when the next falls. */
let tick = 0;
let nextClickTime = 0;
/** Beats scheduled but not yet shown on the beat light. */
let queue: { t: number; beat: number }[] = [];
let taps: number[] = [];

function schedule(): void {
  const ctx = acIfAny();
  if (!ctx || !met.on) {
    return;
  }
  const horizon = ctx.currentTime + LOOKAHEAD_S;
  while (nextClickTime < horizon) {
    const onBeat = tick % met.sub === 0;
    const beat = Math.floor(tick / met.sub) % met.beats;
    if (onBeat || met.subClick) {
      let kind: 'accent' | 'beat' | 'sub' = 'sub';
      if (onBeat) {
        kind = beat === 0 ? 'accent' : 'beat';
      }
      metClick(nextClickTime, kind);
    }
    if (onBeat) {
      queue.push({ t: nextClickTime, beat });
    }
    tick++;
    nextClickTime += 60 / met.bpm / met.sub;
  }
}
/** Each animation frame: light up any beat whose click has now sounded. */
function pulse(): void {
  if (!met.on) {
    return;
  }
  requestAnimationFrame(pulse);
  const ctx = acIfAny();
  if (!ctx) {
    return;
  }
  while (queue.length && queue[0].t <= ctx.currentTime) {
    const due = queue.shift()!;
    met.flash = 'hit' + (due.beat === 0 ? ' one' : '');
    setTimeout(() => {
      met.flash = '';
    }, FLASH_MS);
    met.beatLabel = due.beat + 1 + ' / ' + met.beats;
  }
}

export function metStart(): void {
  const ctx = ac();
  if (!ctx || met.on) {
    return;
  }
  met.on = true;
  tick = 0;
  queue = [];
  nextClickTime = ctx.currentTime + 0.12;
  met.beatLabel = '1 / ' + met.beats;
  schedule();
  timer = setInterval(schedule, SCHEDULER_INTERVAL_MS);
  pulse();
}
export function metStop(): void {
  met.on = false;
  if (timer) {
    clearInterval(timer);
  }
  timer = null;
  queue = [];
  met.flash = '';
  met.beatLabel = '—';
}
export function metToggle(): void {
  if (met.on) {
    metStop();
  } else {
    metStart();
  }
}
export function metSetBpm(bpm: number): void {
  met.bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(bpm)));
  const ctx = acIfAny();
  if (met.on && ctx) {
    /* re-anchor so the change takes effect on the next beat, not retroactively */
    nextClickTime = Math.max(ctx.currentTime + 0.06, nextClickTime);
  }
}
/** Change the subdivision; a running metronome restarts its count cleanly. */
export function metSetSub(perBeat: number): void {
  met.sub = perBeat;
  const ctx = acIfAny();
  if (met.on && ctx) {
    tick = 0;
    nextClickTime = Math.max(ctx.currentTime + 0.08, nextClickTime);
  }
}
/** Tap tempo: three taps or more set the tempo to their average spacing. */
export function metTap(): void {
  const now = Date.now();
  taps = taps.filter((time) => now - time < TAP_MEMORY_MS);
  taps.push(now);
  if (taps.length < 3) {
    return;
  }
  const gaps = taps.slice(1).map((time, i) => time - taps[i]);
  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  if (averageGap > TAP_GAP_MIN_MS && averageGap < TAP_GAP_MAX_MS) {
    metSetBpm(60000 / averageGap);
  }
}
