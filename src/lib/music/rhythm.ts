import { honmoon, saveLocal, queueSave } from '../store/honmoon.svelte';
import type { RhythmLevelId, TempoRec, TempoVerdict } from '../store/types';
import { NUMWORD, todayKey } from '../util/text';
import { rnd } from '../util/random';

/* ---------------- rhythm ----------------
   Pitch and rhythm are two independent halves of notation, so rhythm gets its
   own single-line staff: no clef, no pitch, nothing to read but time.
   Everything is counted in sixteenths, because every value in use here is a
   whole number of them: a quarter is 4, a dotted quarter 6, a whole note 16. */
export interface RValue {
  u: number;
  n: string;
  ab: string;
  beats: string;
}
export const RVALS: RValue[] = [
  { u: 16, n: 'Whole note', ab: 'w', beats: '4 beats' },
  { u: 12, n: 'Dotted half', ab: 'h.', beats: '3 beats' },
  { u: 8, n: 'Half note', ab: 'h', beats: '2 beats' },
  { u: 6, n: 'Dotted quarter', ab: 'q.', beats: '1½ beats' },
  { u: 4, n: 'Quarter note', ab: 'q', beats: '1 beat' },
  { u: 3, n: 'Dotted eighth', ab: 'e.', beats: '¾ of a beat' },
  { u: 2, n: 'Eighth note', ab: 'e', beats: 'half a beat' },
  { u: 1, n: 'Sixteenth note', ab: 's', beats: 'a quarter of a beat' },
];
export function rvalDef(sixteenths: number): RValue {
  return RVALS.find((value) => value.u === sixteenths) ?? (null as unknown as RValue);
}
export function restName(sixteenths: number): string {
  const value = rvalDef(sixteenths);
  if (!value) {
    return sixteenths + '/16 rest';
  }
  return value.n.replace(' note', '') + ' rest';
}
/** Everything here is counted in sixteenths; a quarter-note beat is four. */
const SIXTEENTHS_PER_BEAT = 4;
const FRACTIONAL_BEATS: Record<number, string> = {
  0.25: '¼ beat',
  0.5: '½ beat',
  0.75: '¾ beat',
  1.5: '1½ beats',
  2.5: '2½ beats',
  3: '3 beats',
};
export function beatsText(sixteenths: number): string {
  const beats = sixteenths / SIXTEENTHS_PER_BEAT;
  if (Number.isInteger(beats)) {
    return beats + (beats === 1 ? ' beat' : ' beats');
  }
  return FRACTIONAL_BEATS[beats] || beats + ' beats';
}

export type TimeSig = [number, number];
/** The four a bassist actually meets, with the feel spelled out rather than
    just the arithmetic — the arithmetic is the easy half. */
export const METERS: { ts: TimeSig; n: string; d: string }[] = [
  {
    ts: [4, 4],
    n: '4/4 — common time',
    d: 'Four quarter-note beats to a bar. Somewhere past nine tenths of the rock, pop, funk and blues you will ever play is in 4/4, which is why it is also written as a <b>C</b> in older parts. Counted <i>1 2 3 4</i>, with the weight on 1 and a lesser one on 3.',
  },
  {
    ts: [3, 4],
    n: '3/4 — waltz time',
    d: 'Three quarter-note beats to a bar. The count never settles into pairs, so instead of marching it turns: <i>1 2 3, 1 2 3</i>. Waltzes, plenty of folk songs, and a fair number of ballads.',
  },
  {
    ts: [2, 4],
    n: '2/4 — march time',
    d: 'Two quarter-note beats to a bar. Very close to 4/4 but with the barline coming twice as often, so beat 1 comes round twice as fast and the feel is brisker. Marches, polkas, a lot of Latin.',
  },
  {
    ts: [6, 8],
    n: '6/8 — compound time',
    d: 'Six eighth notes to a bar, but felt as two beats of three rather than six of one. Blues shuffles, ballads with a lilt, and anything that swings in triplets.',
  },
];
export const RLEVELS: { id: RhythmLevelId; n: string; d: string }[] = [
  {
    id: 'r1',
    n: 'Quarters and eighths',
    d: '4/4 and 3/4. Whole, half, quarter and eighth notes, and their rests.',
  },
  {
    id: 'r2',
    n: 'Add sixteenths and dots',
    d: 'Sixteenths, dotted quarters and dotted eighths — the syncopations that make most grooves.',
  },
  {
    id: 'r3',
    n: 'Add ties and 6/8',
    d: 'Notes tied across the beat, plus compound time where the beat divides in three.',
  },
];
export function rlev() {
  const chosen = honmoon.settings.rlev || 'r1';
  return RLEVELS.find((level) => level.id === chosen) ?? RLEVELS[0];
}
/** The rhythm level as a number: r1 → 1. */
export function rlevN(): number {
  return +String(rlev().id).slice(1);
}

/* Tapping tempo is tracked the way the warm-up families are: the tempo you
   are on now, the fastest you have ever played clean, and a history. Each
   rhythm level keeps its own, because holding 3/4 quarter notes at 100 and
   holding sixteenths at 100 are not the same feat. */
export function rhKey(): string {
  return 'rh:' + rlev().id;
}
export function rhRec(): Partial<TempoRec> {
  return honmoon.tempo[rhKey()] || {};
}
/** Below a certain tempo a rhythm stops getting easier and starts getting
    harder: the gaps grow until there is nothing left to feel, and you are
    counting from memory rather than riding a pulse. Where that happens is
    personal, so it is a setting rather than a constant, and the automatic
    easing after a missed bar will not take you past it. */
const FLOOR_MIN = 30;
const FLOOR_MAX = 120;
const FLOOR_DEFAULT = 50;
export const TEMPO_MAX = 160;
const TEMPO_DEFAULT = 72;
/** After a clean bar the tempo goes up this much; after a missed one, down. */
const STEP_UP_AFTER_CLEAN = 3;
const STEP_DOWN_AFTER_MISS = 4;
const TEMPO_HISTORY_LENGTH = 80;
/** A bar is clean when the average error is under this share of the tolerance. */
const CLEAN_SHARE_OF_TOLERANCE = 0.45;

const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

export function rhFloor(): number {
  return clamp(honmoon.settings.rfloor || FLOOR_DEFAULT, FLOOR_MIN, FLOOR_MAX);
}
export function rhBpm(): number {
  return clamp(honmoon.settings.rtempo || TEMPO_DEFAULT, rhFloor(), TEMPO_MAX);
}
export function rhSetBpm(bpm: number): void {
  honmoon.settings.rtempo = clamp(Math.round(bpm), rhFloor(), TEMPO_MAX);
  saveLocal();
  queueSave();
}
/** clean = every note landed and tightly; sloppy = all there but loose;
    fast = notes missed or extra taps, which at this stage nearly always means
    the tempo is ahead of you. */
export function tapVerdict(grade: TapGrade): TempoVerdict {
  if (!grade.ok) {
    return 'fast';
  }
  return grade.mean < grade.tol * CLEAN_SHARE_OF_TOLERANCE ? 'clean' : 'sloppy';
}
export function rhRecordTempo(bpm: number, verdict: TempoVerdict): boolean {
  const key = rhKey();
  const record: TempoRec = honmoon.tempo[key] || { bpm, best: 0, n: 0, hist: [] };
  let newBest = false;
  record.bpm = bpm;
  if (verdict === 'clean') {
    record.bpm = Math.min(TEMPO_MAX, bpm + STEP_UP_AFTER_CLEAN);
    if (bpm > (record.best || 0)) {
      record.best = bpm;
      newBest = true;
    }
  } else if (verdict === 'fast') {
    record.bpm = Math.max(rhFloor(), bpm - STEP_DOWN_AFTER_MISS);
  }
  record.n = (record.n || 0) + 1;
  record.hist = (record.hist || [])
    .concat([{ d: todayKey(), bpm, v: verdict }])
    .slice(-TEMPO_HISTORY_LENGTH);
  honmoon.tempo[key] = record;
  honmoon.settings.rtempo = record.bpm;
  saveLocal();
  queueSave();
  return newBest;
}

/* A bar: {ts:[beats, beatValue], u:total sixteenths, g:beat group size, ev:[...]}
   An event: {u:length in sixteenths, r:true if a rest, tie:true if tied on} */
export interface RhEvent {
  u: number;
  r?: boolean;
  tie?: boolean;
}
export interface Bar {
  ts: TimeSig;
  u: number;
  g: number;
  cmp: boolean;
  ev: RhEvent[];
}
const RTS: Record<string, { ts: TimeSig; u: number; g: number; cmp: boolean }> = {
  '4/4': { ts: [4, 4], u: 16, g: 4, cmp: false },
  '3/4': { ts: [3, 4], u: 12, g: 4, cmp: false },
  '2/4': { ts: [2, 4], u: 8, g: 4, cmp: false },
  '6/8': { ts: [6, 8], u: 12, g: 6, cmp: true },
};
/** Which time signatures each rhythm level draws from; repeats make 4/4 (and
    at the top level 6/8) come up more often. */
const METERS_BY_LEVEL: Record<number, string[]> = {
  1: ['4/4', '3/4'],
  2: ['4/4', '4/4', '3/4', '2/4'],
  3: ['4/4', '4/4', '3/4', '2/4', '6/8', '6/8'],
};
function tsFor(level: number) {
  const meters = METERS_BY_LEVEL[Math.min(3, Math.max(1, level))];
  return RTS[meters[rnd(meters.length)]];
}

/* Beat-sized cells, in sixteenths. Negative means a rest. */
const RCELL: Record<number, number[][]> = {
  1: [[4], [2, 2], [-4], [2, -2], [-2, 2], [4]],
  2: [
    [4],
    [2, 2],
    [-4],
    [2, -2],
    [-2, 2],
    [1, 1, 1, 1],
    [2, 1, 1],
    [1, 1, 2],
    [3, 1],
    [1, -1, 1, 1],
    [2, 2],
  ],
  3: [[4], [2, 2], [-4], [2, -2], [1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [3, 1], [2, 2]],
};
/* Cells that cover two beats, and four. */
const RCELL2: Record<number, number[][]> = {
  1: [[8], [-8]],
  2: [[8], [-8], [6, 2], [2, 6], [6, 1, 1], [4, 4]],
  3: [[8], [6, 2], [2, 6], [4, 4], [3, 3, 2]],
};
const RCELL4: Record<number, number[][]> = {
  1: [[16], [12, 4], [8, 8], [4, 12]],
  2: [[16], [12, 4], [4, 12], [8, 8]],
  3: [[16], [12, 4], [8, 8]],
};
/* Compound (6/8): the beat is a dotted quarter, six sixteenths long. */
const RCELL6 = [[6], [2, 2, 2], [4, 2], [2, 4], [-6], [-2, 2, 2], [2, 2, -2], [4, -2]];

/** Odds, per cell, of a four-beat and of a two-beat cell where one fits. */
const FOUR_BEAT_CELL_CHANCE = 0.09;
const TWO_BEAT_CELL_CHANCE = 0.38;
/** At the top level, the odds that a bar gets a tie. */
const TIE_CHANCE = 0.45;
/** The odds that a bar ending on a rest has it turned into a note. */
const END_ON_NOTE_CHANCE = 0.7;
const MAX_CELLS = 40;

const cellLength = (cell: number[]) => cell.reduce((sum, value) => sum + Math.abs(value), 0);

/** The next cell for a simple-time bar: a four- or two-beat cell when one fits
    at this point of the bar, a one-beat cell otherwise — cut to what is left. */
function simpleCell(level: number, left: number, at: number): number[] {
  const fourFits = left >= 16 && at % 16 === 0;
  const twoFits = left >= 8 && at % 8 === 0;
  const roll = Math.random();
  let pool: number[][];
  if (fourFits && roll < FOUR_BEAT_CELL_CHANCE) {
    pool = RCELL4[level];
  } else if (twoFits && roll < TWO_BEAT_CELL_CHANCE) {
    pool = RCELL2[level];
  } else {
    pool = RCELL[level];
  }
  const cell = pool[rnd(pool.length)];
  return cellLength(cell) > left ? [Math.min(4, left)] : cell;
}
/** Trim or pad so the bar is exactly full, whatever the cells added up to. */
function fitToLength(events: RhEvent[], length: number): void {
  let total = events.reduce((sum, event) => sum + event.u, 0);
  while (total > length) {
    const last = events.pop()!;
    total -= last.u;
    if (total < length) {
      events.push({ u: length - total, r: last.r });
      total = length;
    }
  }
  if (total < length) {
    events.push({ u: length - total, r: false });
  }
}
/** Ties, at the top level only, and never onto a rest or off the end. */
function maybeTie(events: RhEvent[], level: number): void {
  if (!(level >= 3 && Math.random() < TIE_CHANCE)) {
    return;
  }
  const tieable: number[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const [here, next] = [events[i], events[i + 1]];
    if (!here.r && !next.r && here.u <= 4 && next.u <= 4) {
      tieable.push(i);
    }
  }
  if (tieable.length) {
    events[tieable[rnd(tieable.length)]].tie = true;
  }
}
/** A bar of nothing but rests is silent, which makes Hear the rhythm
    unanswerable and Tap the rhythm meaningless. Turn rests back into notes,
    starting at the front, until there are at least two things to play. */
function ensureTwoAttacks(bar: Bar): void {
  const events = bar.ev;
  for (let i = 0; i < events.length && barOnsets(bar).length < 2; i++) {
    if (events[i].r) {
      events[i].r = false;
      if (i > 0 && events[i - 1].tie) {
        events[i - 1].tie = false;
      }
    }
  }
}

export function rhMakeBar(level?: number): Bar {
  level = level || rlevN();
  const meter = tsFor(level);
  const events: RhEvent[] = [];
  let left = meter.u;
  let at = 0;
  let cells = 0;
  while (left > 0 && cells++ < MAX_CELLS) {
    const cell = meter.cmp ? RCELL6[rnd(RCELL6.length)] : simpleCell(level, left, at);
    cell.forEach((value) => events.push({ u: Math.abs(value), r: value < 0 }));
    left -= cellLength(cell);
    at += cellLength(cell);
  }
  fitToLength(events, meter.u);
  maybeTie(events, level);
  const last = events[events.length - 1];
  if (events.length && last.r && events.length > 1 && Math.random() < END_ON_NOTE_CHANCE) {
    last.r = false;
  }
  const bar: Bar = { ts: meter.ts, u: meter.u, g: meter.g, cmp: meter.cmp, ev: events };
  ensureTwoAttacks(bar);
  return bar;
}
export function barTotal(bar: Bar): number {
  return bar.ev.reduce((sum, event) => sum + event.u, 0);
}
/** A note that is played: not a rest, and not the far end of a tie. */
function isAttack(events: RhEvent[], i: number): boolean {
  return !events[i].r && !(i > 0 && events[i - 1].tie);
}
/** Where the attacks fall, in sixteenths from the start of the bar. */
export function barOnsets(bar: Bar): number[] {
  const out: number[] = [];
  let at = 0;
  bar.ev.forEach((event, i) => {
    if (isAttack(bar.ev, i)) {
      out.push(at);
    }
    at += event.u;
  });
  return out;
}
/** What the bar sounds like: where the attacks fall, and nothing else. Two
    bars can be written very differently — a quarter rest and two eighth
    rests, say — and be the same sound, so anything asking you to pick a bar
    by ear has to tell its options apart by this rather than by the notation. */
export function barSoundKey(b: Bar): string {
  return b.ts.join('/') + '|' + barOnsets(b).join('.');
}
/** A stable fingerprint, so the same rhythm is the same card next time. */
export function barKey(b: Bar): string {
  return (
    b.ts.join('/') + '|' + b.ev.map((e) => (e.r ? 'r' : '') + e.u + (e.tie ? '~' : '')).join('.')
  );
}

/* ---- counting syllables ---- */
/** Within a beat: "1 e & a". */
const SUBDIVISION_SYLLABLES = ['', 'e', '&', 'a'];
export function countAt(bar: Bar, sixteenth: number): string {
  if (bar.cmp) {
    // compound time counts eighths: 1 2 3 4 5 6
    const eighth = sixteenth / 2;
    return Number.isInteger(eighth) ? String(eighth + 1) : '·';
  }
  const beat = Math.floor(sixteenth / SIXTEENTHS_PER_BEAT) + 1;
  const withinBeat = sixteenth % SIXTEENTHS_PER_BEAT;
  return withinBeat === 0 ? String(beat) : SUBDIVISION_SYLLABLES[withinBeat];
}
/** Greatest common divisor. */
export function gcd2(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}
/** The coarsest grid, in sixteenths, on which every note of the bar starts. */
export function barGridStep(bar: Bar): number {
  let step = 0;
  bar.ev.forEach((event) => {
    step = gcd2(step, event.u);
  });
  let at = 0;
  for (const event of bar.ev) {
    step = gcd2(step, at);
    at += event.u;
  }
  return Math.max(1, step || SIXTEENTHS_PER_BEAT);
}
/** The counting is written out as a full grid — a syllable where a note is
    attacked, a dot where nothing is. Listing only the attacks is shorter but
    ambiguous: "1 e e" could sit anywhere in the bar. */
export function barCounting(bar: Bar, step?: number): string {
  step = step || barGridStep(bar);
  const attacks = new Set(barOnsets(bar));
  const out: string[] = [];
  for (let at = 0; at < bar.u; at += step) {
    out.push(attacks.has(at) ? countAt(bar, at) : '·');
  }
  return out.join(' ');
}
/** Beams a note gets: eighths (and dotted eighths) one, sixteenths two. */
const BEAMS: Record<number, number> = { 1: 2, 2: 1, 3: 1 };
export function beamsFor(sixteenths: number): number {
  return BEAMS[sixteenths] ?? 0;
}
/** Notes shorter than a quarter are beamed together inside a beat, the way an
    engraver would, so the beat groups are visible at a glance. */
export function beamGroups(bar: Bar): { g: number; idx: number[] }[] {
  const groups: { g: number; idx: number[] }[] = [];
  let current: { g: number; idx: number[] } | null = null;
  let at = 0;
  bar.ev.forEach((event, i) => {
    const beatGroup = Math.floor(at / bar.g);
    const endGroup = Math.floor((at + event.u - 0.001) / bar.g);
    const beamable = !event.r && event.u < SIXTEENTHS_PER_BEAT && beatGroup === endGroup;
    if (!beamable) {
      current = null;
    } else if (current && current.g === beatGroup) {
      current.idx.push(i);
    } else {
      current = { g: beatGroup, idx: [i] };
      groups.push(current);
    }
    at += event.u;
  });
  return groups.filter((group) => group.idx.length > 1);
}
const VALWORD: Record<number, string> = {
  1: 'whole note',
  2: 'half note',
  4: 'quarter note',
  8: 'eighth note',
  16: 'sixteenth note',
};
/** What a time signature is saying, in words. */
export function tsSentence(ts: TimeSig): string {
  const [count, unit] = ts;
  const isCompound = unit === 8 && count % 3 === 0 && count > 3;
  if (isCompound) {
    return (
      NUMWORD[count] + ' eighth notes in a bar, felt as ' + NUMWORD[count / 3] + ' beats of three'
    );
  }
  return (
    NUMWORD[count] +
    ' beat' +
    (count === 1 ? '' : 's') +
    ' in a bar, each one a ' +
    (VALWORD[unit] || '1/' + unit)
  );
}

/* ---- cards ----
   Value cards are one per value; bar cards are one per rhythm level and drill,
   because a fresh bar every time is the point. */
export function rhValues(level: number): number[] {
  return level >= 2 ? [16, 12, 8, 6, 4, 3, 2, 1] : [16, 8, 4, 2];
}
export function rhCards(): string[] {
  const level = rlevN();
  const valueCards = rhValues(level).flatMap((value) => ['rh:v:' + value, 'rh:r:' + value]);
  const barCards = ['count', 'fill', 'hear', 'tap'].map((kind) => 'rh:' + kind + ':' + level);
  return [...valueCards, ...barCards];
}
export type RhythmKind = 'value' | 'count' | 'fill' | 'hear' | 'tap';
export function rhCardFits(id: string, kind: RhythmKind): boolean {
  const cardKind = id.split(':')[1];
  if (cardKind === 'v' || cardKind === 'r') {
    return kind === 'value';
  }
  return kind === cardKind;
}

/* ---- grading a tapped rhythm ----
   Each written onset looks for the nearest tap. A tap that no onset claims is
   an extra; an onset with no tap is a miss. Tolerance scales with tempo, so a
   slow bar is not graded more strictly than a fast one. */
export interface TapGrade {
  want: number[];
  hits: { i: number; err: number | null }[];
  stray: number[];
  extra: number;
  n: number;
  got: number;
  mean: number;
  tol: number;
  taps: number;
  ok: boolean;
}
/** Never stricter than this, in seconds, however slow the tempo… */
const MAX_TOLERANCE_S = 0.2;
/** …and otherwise this share of a beat either side. */
const TOLERANCE_SHARE_OF_BEAT = 0.3;

export function gradeTaps(
  bar: Bar,
  taps: number[],
  start: number,
  secondsPerSixteenth: number,
  latency: number,
): TapGrade {
  const want = barOnsets(bar).map((sixteenth) => start + sixteenth * secondsPerSixteenth);
  const tol = Math.min(
    MAX_TOLERANCE_S,
    secondsPerSixteenth * SIXTEENTHS_PER_BEAT * TOLERANCE_SHARE_OF_BEAT,
  );
  const heard = taps.map((tap) => tap - latency);
  const claimed = new Set<number>();
  const hits = want.map((onset, i) => {
    let nearest = -1;
    let nearestDistance = 1e9;
    heard.forEach((tap, j) => {
      const distance = Math.abs(tap - onset);
      if (!claimed.has(j) && distance < nearestDistance) {
        nearestDistance = distance;
        nearest = j;
      }
    });
    if (nearest >= 0 && nearestDistance <= tol) {
      claimed.add(nearest);
      return { i, err: (heard[nearest] - onset) as number | null };
    }
    return { i, err: null as number | null };
  });
  /* Every tap that did not land close enough to a written onset is kept with
     its time, not just counted. A tap you cannot see on the picture afterwards
     is indistinguishable from a tap the app never registered, and you would
     have no way of telling which happened. */
  const stray = heard.filter((_, j) => !claimed.has(j));
  const landed = hits.filter((hit) => hit.err != null);
  const mean = landed.length
    ? landed.reduce((sum, hit) => sum + Math.abs(hit.err as number), 0) / landed.length
    : 0;
  return {
    want,
    hits,
    stray,
    extra: stray.length,
    n: want.length,
    got: landed.length,
    mean,
    tol,
    taps: taps.length,
    ok: landed.length === want.length && stray.length === 0,
  };
}

/* ---- wrong answers for the bar drills ---- */
const VARIANT_TRIES = 20;
/** One small change to a bar: swap two neighbouring values (same total,
    different feel), or split one value in two. */
function rhVariant(bar: Bar): Bar | null {
  const copy: Bar = {
    ts: bar.ts,
    u: bar.u,
    g: bar.g,
    cmp: bar.cmp,
    ev: bar.ev.map((event) => ({ u: event.u, r: event.r, tie: event.tie })),
  };
  const events = copy.ev;
  for (let tries = 0; tries < VARIANT_TRIES; tries++) {
    const i = rnd(events.length);
    if (events.length > 1 && Math.random() < 0.5) {
      const j = Math.min(events.length - 1, i + 1);
      if (events[i].u !== events[j].u || events[i].r !== events[j].r) {
        [events[i], events[j]] = [events[j], events[i]];
        break;
      }
    } else if (events[i].u >= 2) {
      const half = events[i].u / 2;
      if (Number.isInteger(half)) {
        events.splice(i, 1, { u: half, r: events[i].r }, { u: half, r: events[i].r });
        break;
      }
    }
  }
  return barKey(copy) === barKey(bar) ? null : copy;
}
const VARIANT_ROUNDS = 120;
/** The odds of building a wrong answer by changing the real bar rather than
    making a fresh one. */
const CHANGE_REAL_BAR_CHANCE = 0.6;
/** `count` wrong answers for a bar, all in its time signature and all
    different from it and from each other — by sound when `bySound`. */
export function rhVariants(bar: Bar, count: number, bySound?: boolean): Bar[] {
  const keyOf = bySound ? barSoundKey : barKey;
  const sameMeter = (other: Bar) => other.ts[0] === bar.ts[0] && other.ts[1] === bar.ts[1];
  const out: Bar[] = [];
  const seen = new Set<string>([keyOf(bar)]);
  const offer = (candidate: Bar | null) => {
    if (!candidate || !sameMeter(candidate) || seen.has(keyOf(candidate))) {
      return;
    }
    seen.add(keyOf(candidate));
    out.push(candidate);
  };
  for (let round = 0; out.length < count && round < VARIANT_ROUNDS; round++) {
    offer(Math.random() < CHANGE_REAL_BAR_CHANCE ? rhVariant(bar) : rhMakeBar(rlevN()));
  }
  /* Padding has to respect the same rule, or the last option slips through
     sounding identical to one already on the list. */
  for (let round = 0; out.length < count && round < VARIANT_ROUNDS; round++) {
    offer(rhMakeBar(rlevN()));
  }
  return out;
}
