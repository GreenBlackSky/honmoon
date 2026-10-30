import { honmoon } from '../store/honmoon.svelte';
import { STRINGS } from './bass';
import { pickOf, rnd } from '../util/random';
import type { TabStep } from '../notation/tab';

/* ---------------- bass warm-ups ----------------
   The pattern is random, the family is not. Novelty keeps a warm-up from
   getting stale; the tempo log hangs off the family, so the number that
   measures you still means something six weeks from now. */
export interface WarmFamily {
  k: string;
  n: string;
  d: string;
  bpm: number;
}
export const FAMS: WarmFamily[] = [
  {
    k: 'perm',
    n: 'Permutations',
    d: 'One finger per fret, four notes reordered. The spider, in all 24 of its orders.',
    bpm: 60,
  },
  {
    k: 'cross',
    n: 'String crossing',
    d: 'A small shape bounced between two strings, adjacent or skipping. Where the right hand falls apart.',
    bpm: 60,
  },
  {
    k: 'shift',
    n: 'Position shifts',
    d: 'One shape relocated up and down the neck. Builds confidence away from the nut.',
    bpm: 52,
  },
  {
    k: 'chrom',
    n: 'Chromatic runs',
    d: 'Every fret in order, along one string or across the neck at one position.',
    bpm: 64,
  },
  {
    k: 'right',
    n: 'Right hand',
    d: 'Strict alternation and rakes, one note per string. The half nobody practises.',
    bpm: 70,
  },
  {
    k: 'sub',
    n: 'Subdivisions',
    d: 'One dull pattern as quarters, eighths, triplets, sixteenths. The least fun, the most useful.',
    bpm: 60,
  },
];
export function famDef(key: string): WarmFamily {
  return FAMS.find((family) => family.k === key) ?? (null as unknown as WarmFamily);
}
export function famOff(key: string): boolean {
  return (honmoon.settings.woff || []).includes(key);
}
const FALLBACK_BPM = 60;
/** The tempo this family is on now: where you left it, or its starting tempo. */
export function famBpm(key: string): number {
  const record = honmoon.tempo[key];
  return (record && record.bpm) || (famDef(key) || { bpm: FALLBACK_BPM }).bpm || FALLBACK_BPM;
}

export interface Exercise {
  fam: string;
  title: string;
  steps: TabStep[];
  note: string;
  sub?: number[];
}

/** String indices, top row first: 0 = G … 3 = E. */
const LOWEST_STRING = 3;
const FINGERS = 4;
/** The right-hand fingers, index and middle. */
const RH = ['i', 'm'];

/** All 24 orders of the four fingers (0 = index … 3 = little). */
const PERMS: number[][] = (() => {
  const out: number[][] = [];
  (function permute(chosen: number[], remaining: number[]) {
    if (!remaining.length) {
      out.push(chosen.slice());
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      const rest = remaining.slice();
      const next = rest.splice(i, 1)[0];
      permute(chosen.concat(next), rest);
    }
  })([], [0, 1, 2, 3]);
  return out;
})();

/** One finger per fret from `startFret`, the four fingers in `fingerOrder`,
    up through the strings from the lowest and back down. */
function acrossAndBack(startFret: number, fingerOrder: number[]): TabStep[] {
  const steps: TabStep[] = [];
  const play = (string: number, finger: number) =>
    steps.push({ s: string, f: startFret + finger, fin: finger + 1 });
  for (let string = LOWEST_STRING; string >= 0; string--) {
    for (let i = 0; i < FINGERS; i++) {
      play(string, fingerOrder[i]);
    }
  }
  for (let string = 1; string <= LOWEST_STRING; string++) {
    for (let i = FINGERS - 1; i >= 0; i--) {
      play(string, fingerOrder[i]);
    }
  }
  return steps;
}

function genPerm(): Exercise {
  const fingerOrder = pickOf(PERMS);
  const startFret = 3 + rnd(6);
  return {
    fam: 'perm',
    title: 'Permutation ' + fingerOrder.map((finger) => finger + 1).join('-'),
    steps: acrossAndBack(startFret, fingerOrder),
    note:
      'One finger per fret starting at fret ' +
      startFret +
      '. Up through the strings and back down. When it is clean, move the whole thing up a fret and go again.',
  };
}
function genCross(): Exercise {
  const [first, second] = pickOf([
    [3, 2],
    [2, 1],
    [1, 0],
    [3, 1],
    [2, 0],
    [3, 0],
  ]);
  const fret = 3 + rnd(6);
  const span = pickOf([2, 3]);
  const steps: TabStep[] = [];
  const reps = pickOf([2, 3]);
  const low = (string: number) => ({ s: string, f: fret, fin: 1 });
  const high = (string: number) => ({ s: string, f: fret + span, fin: span + 1 });
  for (let rep = 0; rep < reps; rep++) {
    steps.push(low(first), low(second), high(first), high(second));
  }
  for (let rep = 0; rep < reps; rep++) {
    steps.push(high(second), high(first), low(second), low(first));
  }
  steps.forEach((step, i) => {
    step.rh = RH[i % 2];
  });
  const skipsAString = Math.abs(first - second) > 1;
  return {
    fam: 'cross',
    title: STRINGS[first].n + ' ↔ ' + STRINGS[second].n + (skipsAString ? ' (skipping)' : ''),
    steps,
    note:
      'Alternate i and m strictly. ' +
      (skipsAString
        ? 'The skipped string in the middle must stay silent — mute it with the plucking finger as you pass.'
        : 'Keep the two notes even in volume; the crossing is where the tone usually dips.'),
  };
}
function genShift(): Exercise {
  const string = rnd(4);
  const route = pickOf([
    [1, 3, 5, 7],
    [5, 7, 9, 7],
    [3, 5, 7, 5, 3],
    [1, 4, 7, 4],
    [7, 5, 3, 5, 7],
  ]);
  const steps: TabStep[] = [];
  for (const position of route) {
    for (let finger = 0; finger < FINGERS; finger++) {
      steps.push({
        s: string,
        f: position + finger,
        fin: finger + 1,
        bar: finger === 0 ? 'fret ' + position : null,
      });
    }
  }
  return {
    fam: 'shift',
    title: 'Shifts on the ' + STRINGS[string].n + ' string',
    steps,
    note: 'Move the whole hand, do not stretch. Look at the fret you are going to before you leave the one you are on.',
  };
}
function genChrom(): Exercise {
  const across = Math.random() < 0.5;
  if (across) {
    const position = 1 + rnd(7);
    return {
      fam: 'chrom',
      title: 'Chromatic across, position ' + position,
      steps: acrossAndBack(position, [0, 1, 2, 3]),
      note: 'The hand never moves. Every finger stays over its own fret for the whole exercise.',
    };
  }
  const string = rnd(4);
  const from = 1 + rnd(3);
  /** eight frets: four, a shift, four more — and back */
  const length = 2 * FINGERS;
  const steps: TabStep[] = [];
  for (let i = 0; i < length; i++) {
    steps.push({
      s: string,
      f: from + i,
      fin: (i % FINGERS) + 1,
      bar: i % FINGERS === 0 ? 'shift ' + (i / FINGERS + 1) : null,
    });
  }
  for (let i = length - 1; i >= 0; i--) {
    steps.push({ s: string, f: from + i, fin: (i % FINGERS) + 1 });
  }
  return {
    fam: 'chrom',
    title: 'Chromatic along the ' + STRINGS[string].n + ' string, from fret ' + from,
    steps,
    note: 'Four frets, shift, four more, and back. The shift should not be audible — no gap, no scoop.',
  };
}
/** The left-hand finger for a fret held all exercise: none when open, the
    index at fret 5, the middle at fret 7 (so the hand sits in position). */
function holdingFinger(fret: number): number {
  if (!fret) {
    return 0;
  }
  return fret === 5 ? 1 : 2;
}
function genRight(): Exercise {
  const fret = pickOf([0, 0, 5, 7]);
  const stringOrder = pickOf([
    [3, 2, 1, 0, 0, 1, 2, 3],
    [3, 1, 2, 0, 3, 1, 2, 0],
    [0, 1, 2, 3, 3, 2, 1, 0],
    [3, 2, 3, 1, 3, 0, 3, 1],
    [0, 2, 1, 3, 0, 2, 1, 3],
  ]);
  const startFinger = rnd(2);
  const steps: TabStep[] = stringOrder.map((string, i) => ({
    s: string,
    f: fret,
    fin: holdingFinger(fret),
    rh: RH[(i + startFinger) % 2],
  }));
  /* a line that only ever moves towards thicker strings can be raked */
  const onlyDescends = stringOrder.every((string, i) => i === 0 || string >= stringOrder[i - 1]);
  return {
    fam: 'right',
    title: 'Alternation, starting with ' + RH[startFinger],
    steps,
    note:
      (fret ? 'All at fret ' + fret + '. ' : 'All open strings. ') +
      'Strict alternation — no repeated finger, even across a string change.' +
      (onlyDescends
        ? ' Where the line moves to a thicker string, let one finger rake through instead.'
        : ''),
  };
}
const BEATS_PER_BAR = 4;
/** Notes per beat → what they are called. */
const SUBDIVISION_NAMES: Record<number, string> = {
  1: 'quarters',
  2: 'eighths',
  3: 'triplets',
  4: 'sixteenths',
};
function genSub(): Exercise {
  const stringOrder = pickOf([
    [3, 2, 1, 0],
    [3, 1, 2, 0],
    [0, 1, 2, 3],
    [3, 2, 3, 1],
  ]);
  const fret = pickOf([0, 5, 7]);
  /** the two subdivisions, as notes per beat: one bar of each */
  const subdivisions = pickOf([
    [1, 2],
    [2, 3],
    [2, 4],
    [1, 3],
  ]);
  const steps: TabStep[] = [];
  for (const perBeat of subdivisions) {
    const notesInBar = BEATS_PER_BAR * perBeat;
    for (let i = 0; i < notesInBar; i++) {
      steps.push({
        s: stringOrder[i % stringOrder.length],
        f: fret,
        fin: fret ? 1 : 0,
        bar: i === 0 ? SUBDIVISION_NAMES[perBeat] : null,
      });
    }
  }
  return {
    fam: 'sub',
    title: SUBDIVISION_NAMES[subdivisions[0]] + ' into ' + SUBDIVISION_NAMES[subdivisions[1]],
    steps,
    sub: subdivisions,
    note: 'Leave the metronome on quarter notes and fit the subdivision between the clicks yourself. One bar of each, no pause at the change — that join is the whole exercise.',
  };
}
const GENS: Record<string, () => Exercise> = {
  perm: genPerm,
  cross: genCross,
  shift: genShift,
  chrom: genChrom,
  right: genRight,
  sub: genSub,
};
export function genExercise(key: string): Exercise {
  return (GENS[key] || genPerm)();
}
