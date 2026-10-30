import { honmoon, mastery } from '../store/honmoon.svelte';
import { STRINGS, allowedPc, bassHere, placesFor, positions } from '../music/bass';
import { parseST, staffNotes } from '../music/clefs';
import { earCards } from '../music/intervals';
import { mdoOn } from '../music/notes';
import { rhCardFits, rhCards } from '../music/rhythm';
import { parseSC, scaleCards, scaleOn } from '../music/scales';
import { shuffle } from '../util/random';
import {
  appDrills,
  drillAvailable,
  drillOn,
  groupOfDrill,
  groupUsable,
  sdrillOn,
} from '../drills/registry.svelte';
import { isScaleDrill, type DrillDef } from '../drills/defs';
import { mdoCards, parseMD, pcs, playPcs, scalearCards } from './pools';

/* ---------------- sampling ----------------
   How badly a card needs practice: error rate, how stale it is, whether it has
   ever been seen, and how far its mastery is from solid. */
const MS_PER_HOUR = 3600000;
/** Staleness stops counting after three days. */
const MAX_STALE_HOURS = 72;
/** Every this many hours unseen adds the card's base weight again. */
const STALE_SCALE_HOURS = 22;
const ERROR_RATE_WEIGHT = 3.2;
const NEVER_SEEN_BOOST = 2.4;
/** Each step of mastery short of solid adds this share. */
const PER_MISSING_MASTERY = 0.22;
/** The card just asked is this much less likely to come straight back. */
const JUST_ASKED_FACTOR = 0.06;

export function weightOf(id: string): number {
  const stats = honmoon.cards[id];
  const seen = stats ? stats.s : 0;
  const wrong = stats ? stats.s - stats.c : 0;
  const errorRate = seen ? wrong / seen : 0;
  const hoursStale =
    stats && stats.t
      ? Math.min((Date.now() - stats.t) / MS_PER_HOUR, MAX_STALE_HOURS)
      : MAX_STALE_HOURS;
  return (
    (1 + ERROR_RATE_WEIGHT * errorRate) *
    (1 + hoursStale / STALE_SCALE_HOURS) *
    (seen === 0 ? NEVER_SEEN_BOOST : 1) *
    (1 + (5 - mastery(id)) * PER_MISSING_MASTERY)
  );
}
/** A random index, each chosen with probability proportional to its weight. */
function weightedIndex(weights: number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    remaining -= weights[i];
    if (remaining <= 0) {
      return i;
    }
  }
  return weights.length - 1;
}
let lastId: string | null = null;
/** One card from a pool, weighted by need — and almost never the one just asked. */
export function pick<T extends { id: string }>(pool: T[]): T | null {
  if (!pool.length) {
    return null;
  }
  const weights = pool.map((item) => {
    const weight = weightOf(item.id);
    return item.id === lastId && pool.length > 1 ? weight * JUST_ASKED_FACTOR : weight;
  });
  const chosen = pool[weightedIndex(weights)];
  lastId = chosen.id;
  return chosen;
}

/** Semitones between two pitch classes, the short way round (0–6). */
function pcDistance(a: number, b: number): number {
  const apart = Math.abs(a - b);
  return Math.min(apart, 12 - apart);
}
/** Take a random element out of an array. */
function takeRandom<T>(items: T[]): T {
  return items.splice(Math.floor(Math.random() * items.length), 1)[0];
}
/** Wrong answers near the right one: a semitone or two away first. */
export function distractors(correctPc: number, count: number): number[] {
  const pool: number[] = [];
  for (let pc = 0; pc < 12; pc++) {
    if (allowedPc(pc) && pc !== correctPc) {
      pool.push(pc);
    }
  }
  const near = pool.filter((pc) => pcDistance(pc, correctPc) <= 2);
  const out: number[] = [];
  while (out.length < count && near.length) {
    out.push(takeRandom(near));
  }
  while (out.length < count && pool.length) {
    const pc = takeRandom(pool);
    if (!out.includes(pc)) {
      out.push(pc);
    }
  }
  return out;
}
export interface Choice {
  /** the label shown */
  t: string;
  /** whether it is the right answer */
  ok: boolean;
}
/** Multiple-choice answers, built safely.
    Every option must read differently from every other, and exactly one is
    right. When a pool cannot supply four distinct labels the question asks
    with fewer — padding it out by repeating a label does not make the
    question harder, it makes it unanswerable, because the correct answer
    becomes indistinguishable from a wrong one. */
export function options(correct: string, pool: string[], count?: number): Choice[] {
  const max = count || 4;
  const out: Choice[] = [{ t: correct, ok: true }];
  const used = new Set([correct]);
  for (const label of shuffle(pool.slice())) {
    if (out.length >= max || used.has(label)) {
      continue;
    }
    used.add(label);
    out.push({ t: label, ok: false });
  }
  return shuffle(out);
}
/** options() shuffles what it is handed, so the best three wrong answers are
    chosen here, after dropping any that would read the same as the right one. */
export function altOptions(correct: string, labels: string[]): Choice[] {
  const used = new Set([correct]);
  const keep: string[] = [];
  for (const label of labels) {
    if (!used.has(label) && keep.length < 3) {
      used.add(label);
      keep.push(label);
    }
  }
  return options(correct, keep);
}

/* ---------------- which drills can ask a card ---------------- */
/** For an ordinary (non-scale, non-ear) card: which drill kinds can ask it,
    by card prefix. */
const ASKS_CARD: Record<string, (drill: DrillDef, id: string) => boolean> = {
  'fb:': (drill) => drill.kind === 'fb2name' || drill.kind === 'name2fb',
  'st:': (drill, id) =>
    drill.kind === 'staff2name' ||
    drill.kind === 'staffkey' ||
    (drill.kind === 'play' && drill.sys === 'staff' && parseST(id).clef === 'bass'),
  'tr:': (drill) => drill.kind === 'translate',
  'pl:': (drill) => drill.kind === 'play' && drill.sys !== 'staff',
  'md:': (drill, id) =>
    drill.kind === 'mdo' && (drill.from !== 'fb' || placesFor(parseMD(id).pc).length > 0),
  'rh:': (drill, id) => drill.kind === 'rhythm' && rhCardFits(id, drill.rk!),
  'se:': (drill, id) => drill.kind === 'earscale' && scaleOn(id.slice(3)),
};
export function drillsForCard(id: string): DrillDef[] {
  const prefix = id.slice(0, 3);
  const drills = appDrills();
  if (prefix === 'sc:') {
    return drills.filter(
      (drill) => isScaleDrill(drill.id) && sdrillOn(drill.id) && (!drill.bass || bassHere()),
    );
  }
  if (prefix === 'iv:' || prefix === 'ch:') {
    return drills.filter((drill) => {
      if (drill.kind !== 'ear' || !groupUsable(groupOfDrill(drill.id)!) || !drillOn(drill.id)) {
        return false;
      }
      // chords are asked only by the chord drill, intervals by the others
      return prefix === 'ch:' ? drill.id === 'chhear' : drill.id !== 'chhear';
    });
  }
  const asks = ASKS_CARD[prefix];
  return drills.filter(
    (drill) =>
      !isScaleDrill(drill.id) &&
      groupUsable(groupOfDrill(drill.id)!) &&
      drillOn(drill.id) &&
      drillAvailable(drill) &&
      !!asks &&
      asks(drill, id),
  );
}

/** Every card the daily session can draw from, in this app. */
export function allCards(): string[] {
  const out: string[] = [];
  if (groupUsable('ear') || groupUsable('voice')) {
    out.push(...earCards());
  }
  if (groupUsable('ear')) {
    out.push(...scalearCards());
  }
  out.push(...positions().map((pos) => pos.id));
  out.push(...staffNotes().map((note) => note.id));
  out.push(...pcs().map((item) => item.id));
  out.push(...playPcs().map((item) => item.id));
  if (mdoOn()) {
    out.push(...mdoCards());
  }
  if (groupUsable('read')) {
    out.push(...rhCards());
  }
  /* Scale-and-key pairs join the daily mix when the family is left on. The
     Scales screen keeps its own session for when you want a run of nothing
     else, and that one ignores this switch. */
  if (groupUsable('scale')) {
    out.push(...scaleCards());
  }
  return out.filter((id) => drillsForCard(id).length > 0);
}

export interface QueueEntry {
  card: string;
  drill: string;
  /** a card coming back after being missed */
  retry?: 1;
}
/** Draw the weakest cards first, but without replacement, so one bad note
    cannot eat the whole session. Refill if the range is smaller than the
    session length. */
export function buildSession(length: number, mode?: 'scales' | 'theory'): QueueEntry[] {
  const cards =
    mode === 'scales' ? scaleCards().filter((id) => drillsForCard(id).length > 0) : allCards();
  if (!cards.length) {
    return [];
  }
  let pool = cards.slice();
  const out: QueueEntry[] = [];
  for (let k = 0; k < length; k++) {
    if (!pool.length) {
      pool = cards.slice();
    }
    const index = weightedIndex(pool.map(weightOf));
    const id = pool.splice(index, 1)[0];
    const drills = drillsForCard(id);
    out.push({ card: id, drill: drills[Math.floor(Math.random() * drills.length)].id });
  }
  return decluster(shuffle(out));
}
/** No drill three times running, if it can be helped. */
function decluster(queue: QueueEntry[]): QueueEntry[] {
  for (let i = 2; i < queue.length; i++) {
    const threeInARow =
      queue[i].drill === queue[i - 1].drill && queue[i - 1].drill === queue[i - 2].drill;
    if (!threeInARow) {
      continue;
    }
    for (let j = i + 1; j < queue.length; j++) {
      if (queue[j].drill !== queue[i].drill) {
        [queue[i], queue[j]] = [queue[j], queue[i]];
        break;
      }
    }
  }
  return queue;
}

/** What a card id stands for, as the question makers want it. */
export type CardItem =
  | { id: string; sid: string; root: number }
  | { id: string; s: number; f: number; m: number }
  | { id: string; m: number; clef: string }
  | { id: string; keyPc: number; pc: number }
  | { id: string; pc: number }
  | { id: string };
export function cardToItem(id: string): CardItem | null {
  const prefix = id.slice(0, 3);
  switch (prefix) {
    case 'sc:': {
      const { sid, root } = parseSC(id);
      return { sid, root, id };
    }
    case 'iv:':
    case 'ch:':
    case 'se:':
    case 'rh:':
      return { id };
    case 'fb:': {
      const [, string, fret] = id.split(':').map(Number);
      return { s: string, f: fret, m: STRINGS[string].open + fret, id };
    }
    case 'st:': {
      const { m, clef } = parseST(id);
      return { m, clef, id };
    }
    case 'md:': {
      const { keyPc, pc } = parseMD(id);
      return { keyPc, pc, id };
    }
    case 'tr:':
    case 'pl:':
      return { pc: +id.slice(3), id };
    default:
      return null;
  }
}
