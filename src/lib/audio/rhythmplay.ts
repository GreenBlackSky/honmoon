import { ac, acIfAny } from './context';
import { metClick } from './synth';
import type { Bar } from '../music/rhythm';

/* ---- playing a rhythm ---- */
const RPLAY: { on: boolean; timer: ReturnType<typeof setTimeout> | null; nodes: OscillatorNode[] } =
  { on: false, timer: null, nodes: [] };

export function rhStopPlay(): void {
  RPLAY.on = false;
  if (RPLAY.timer) {
    clearTimeout(RPLAY.timer);
  }
  RPLAY.timer = null;
  RPLAY.nodes.forEach((node) => {
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
  });
  RPLAY.nodes = [];
}

export interface RhPlayOpts {
  countIn?: number;
  /** click the beats under the bar (default true) */
  beats?: boolean;
  /** count in and click, but do not sound the rhythm — for tapping it yourself */
  silent?: boolean;
  onEnd?: () => void;
}
/** Lead time before the first click, so nothing is scheduled in the past. */
const LEAD_IN_S = 0.22;
/** How long after the bar ends `onEnd` fires. */
const AFTER_BAR_S = 0.35;
const SILENT = 0.0001;

/** Schedules the whole bar at once on the audio clock: a count-in of clicks,
    then the rhythm itself, optionally with the beats ticking underneath.
    Returns where the bar starts, seconds per sixteenth, and where it ends. */
export function rhPlay(
  bar: Bar,
  bpm: number,
  opts: RhPlayOpts = {},
): { start: number; spu: number; end: number } | null {
  const ctx = ac();
  if (!ctx) {
    return null;
  }
  rhStopPlay();
  const secondsPerBeat = 60 / bpm;
  /* In simple time a click is a quarter: four sixteenths. In 6/8 the original
     comment says the click is the dotted quarter, but the arithmetic makes a
     click three sixteenths long, and only two beat clicks are laid under a
     twelve-sixteenth bar. Kept as it was; noted in docs/ROADMAP.md as a
     likely bug in compound-time playback. */
  const secondsPerSixteenth = bar.cmp ? secondsPerBeat / 3 : secondsPerBeat / 4;
  const countInStart = ctx.currentTime + LEAD_IN_S;
  const countInBeats = opts.countIn == null ? 4 : opts.countIn;
  for (let i = 0; i < countInBeats; i++) {
    metClick(countInStart + i * secondsPerBeat, i === 0 ? 'accent' : 'beat');
  }
  const start = countInStart + countInBeats * secondsPerBeat;
  if (opts.beats !== false) {
    clickBeatsUnder(bar, start, secondsPerBeat, !opts.silent);
  }
  if (!opts.silent) {
    attackTimes(bar, start, secondsPerSixteenth).forEach((time) => rhHit(time));
  }
  RPLAY.on = true;
  const end = start + bar.u * secondsPerSixteenth + AFTER_BAR_S;
  if (opts.onEnd) {
    const onEnd = opts.onEnd;
    RPLAY.timer = setTimeout(
      () => {
        RPLAY.on = false;
        onEnd();
      },
      (end - ctx.currentTime) * 1000,
    );
  }
  return { start, spu: secondsPerSixteenth, end };
}
/** While the rhythm is sounding the beats drop back to a quiet tick, with
    only the downbeat kept up: the click is there as a ruler, and the thing
    you are meant to be listening to is the rhythm. When you are tapping,
    nothing else is sounding, so the beats stay at full strength. */
function clickBeatsUnder(bar: Bar, start: number, secondsPerBeat: number, quiet: boolean): void {
  const beatCount = bar.cmp ? 2 : bar.ts[0];
  for (let i = 0; i < beatCount; i++) {
    let kind: 'accent' | 'beat' | 'sub';
    if (i === 0) {
      kind = quiet ? 'beat' : 'accent';
    } else {
      kind = quiet ? 'sub' : 'beat';
    }
    metClick(start + i * secondsPerBeat, kind);
  }
}
/** When each played note of the bar starts, in audio-clock seconds. */
function attackTimes(bar: Bar, start: number, secondsPerSixteenth: number): number[] {
  const times: number[] = [];
  let at = 0;
  bar.ev.forEach((event, i) => {
    if (!event.r && !(i > 0 && bar.ev[i - 1].tie)) {
      times.push(start + at * secondsPerSixteenth);
    }
    at += event.u;
  });
  return times;
}

/** The rhythm itself, as a woodblock knock. It has to sit clearly on top of
    the click rather than under it — the click is the ruler, the knock is what
    you are reading. An earlier version ran this through a band-pass centred
    well above the note, which quietly threw most of the level away. */
function rhHit(time: number, soft?: boolean): void {
  const ctx = acIfAny();
  if (!ctx) {
    return;
  }
  /* Levels are set so a knock landing on a click still sums under full scale;
     the balance comes from the beats dropping back, not from shouting. */
  const level = soft ? 0.34 : 0.52;
  // the knock: a triangle wave dropping fast in pitch
  const knock = ctx.createOscillator();
  const knockGain = ctx.createGain();
  knock.type = 'triangle';
  knock.frequency.setValueAtTime(880, time);
  knock.frequency.exponentialRampToValueAtTime(300, time + 0.04);
  knockGain.gain.setValueAtTime(SILENT, time);
  knockGain.gain.exponentialRampToValueAtTime(level, time + 0.003);
  knockGain.gain.exponentialRampToValueAtTime(SILENT, time + 0.2);
  knock.connect(knockGain);
  knockGain.connect(ctx.destination);
  knock.start(time);
  knock.stop(time + 0.24);
  /* a short tick on top, so the attack is unmistakable even on a phone speaker */
  const tick = ctx.createOscillator();
  const tickGain = ctx.createGain();
  tick.type = 'square';
  tick.frequency.setValueAtTime(2300, time);
  tickGain.gain.setValueAtTime(SILENT, time);
  tickGain.gain.exponentialRampToValueAtTime(level * 0.29, time + 0.001);
  tickGain.gain.exponentialRampToValueAtTime(SILENT, time + 0.03);
  tick.connect(tickGain);
  tickGain.connect(ctx.destination);
  tick.start(time);
  tick.stop(time + 0.05);
  RPLAY.nodes.push(knock, tick);
}
