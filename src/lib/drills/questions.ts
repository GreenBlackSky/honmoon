import { honmoon } from '../store/honmoon.svelte';
import type { ClefId, Sys } from '../store/types';
import { degName, mdoName, noteName, otherSys, pcOf, relOf } from '../music/notes';
import { STRINGS, findPos, placesFor, positions, type FretPos } from '../music/bass';
import {
  enabledClefs,
  midiForPcInClef,
  staffNotes,
  staffNotesFor,
  type StaffNote,
} from '../music/clefs';
import { chDef, chPool, ivDef, ivPool } from '../music/intervals';
import { vRange } from '../music/voice';
import {
  barCounting,
  barGridStep,
  beatsText,
  gcd2,
  restName,
  rhCards,
  rhMakeBar,
  rhValues,
  rhVariants,
  rlevN,
  rvalDef,
  type Bar,
  type RhEvent,
  type TapGrade,
} from '../music/rhythm';
import {
  SCALES,
  alterOne,
  degPretty,
  enabledScales,
  noteText,
  parseSC,
  randStart,
  scaleAlts,
  scaleCards,
  scaleDef,
  scaleName,
  scaleNotes,
  scaleOn,
  scaleShape,
  scaleSteps,
  staffSig,
  type Shape,
  type ShapePos,
} from '../music/scales';
import { pickOf, rnd, shuffle } from '../util/random';
import type { TempoVerdict } from '../store/types';
import { altOptions, distractors, options, pick, type Choice } from '../learn/session';
import { mdoCards, mdoRels, parseMD, pcs, playPcs } from '../learn/pools';
import { anyDrillDef, isScaleDrill, type DrillDef } from './defs';

/** A place on the neck: string index (0 = G) and fret. */
type Cell = { s: number; f: number };

/* ---------------- the questions ----------------
   One type per way of asking. The drill screen switches on `kind`, so a new
   kind that is not handled there is a compile error rather than a blank
   screen. */
export type Question =
  | { kind: 'fb2name'; id: string; sys: Sys; pos: FretPos; pc: number; opts: number[] }
  | { kind: 'name2fb'; id: string; sys: Sys; pos: FretPos; pc: number }
  | { kind: 'staffkey'; id: string; note: StaffNote; clef: ClefId; pc: number }
  | {
      kind: 'staff2name';
      id: string;
      sys: Sys;
      note: StaffNote;
      clef: ClefId;
      pc: number;
      opts: number[];
    }
  | { kind: 'translate'; id: string; sys: Sys; from: Sys; pc: number; opts: number[] }
  | {
      kind: 'play';
      id: string;
      sys: Sys | 'staff';
      note?: StaffNote;
      clef?: ClefId;
      pc: number;
      target: number | null;
      exact: boolean;
    }
  | {
      kind: 'chhear';
      id: string;
      cid: string;
      root: number;
      notes: number[];
      choices: Choice[];
      played?: boolean;
    }
  | { kind: 'ivhear'; id: string; semis: number; root: number; choices: Choice[]; played?: boolean }
  | { kind: 'ivsee'; id: string; semis: number; a: Cell; b: Cell; choices: Choice[] }
  | { kind: 'ivbuild'; id: string; semis: number; base: Cell; rootMidi: number; target: Cell }
  | { kind: 'singit'; id: string; semis: number; root: number; dir: 1 | -1 }
  | { kind: 'earscale'; id: string; sid: string; root: number; choices: Choice[]; played: boolean }
  | {
      kind: 'singdeg';
      id: string;
      keyPc: number;
      pc: number;
      mode: 'solf' | 'deg' | 'sing';
      ask: string;
      tonic: number;
      target: number;
    }
  | {
      kind: 'deg2fb';
      id: string;
      keyPc: number;
      pc: number;
      mode: 'solf' | 'deg' | 'sing';
      ask: string;
      pos: FretPos;
    }
  | {
      kind: 'mdo';
      id: string;
      keyPc: number;
      pc: number;
      mode: 'solf' | 'deg' | 'sing';
      from: 'staff' | 'name' | 'syll';
      ask: string;
      choices: Choice[];
      clef?: ClefId;
      m?: number;
    }
  | { kind: 'rvalue'; id: string; u: number; rest: boolean; choices: Choice[] }
  | { kind: 'rcount'; id: string; bar: Bar; step: number; choices: Choice[] }
  | { kind: 'rfill'; id: string; bar: Bar; blank: number; miss: RhEvent; choices: Choice[] }
  | { kind: 'rhear'; id: string; bar: Bar; ropts: { b: Bar; ok: boolean }[]; played: boolean }
  | RtapQuestion
  | {
      kind: 'scbuild';
      id: string;
      sid: string;
      root: number;
      start: number;
      shape: Shape;
      idx: number;
      misses: number;
      wrong: Cell | null;
      reveal: boolean;
      scroll?: number;
    }
  | {
      kind: 'scdeg';
      id: string;
      sid: string;
      root: number;
      dir: 'note' | 'deg';
      ask: string;
      choices: Choice[];
    }
  | {
      kind: 'scwrong';
      id: string;
      sid: string;
      root: number;
      start: number;
      shape: Shape;
      shown: ShapePos[];
      bad: number;
    }
  | {
      kind: 'scname';
      id: string;
      sid: string;
      root: number;
      start: number;
      shape: Shape;
      choices: Choice[];
    }
  | { kind: 'scstaff'; id: string; sid: string; root: number; start: number; choices: Choice[] }
  | {
      kind: 'scwrite';
      id: string;
      sid: string;
      root: number;
      start: number;
      sopts: ScaleStaffOpt[];
    }
  | {
      kind: 'scsteps' | 'screcipe';
      id: string;
      sid: string;
      root: number;
      start: number;
      form: 'steps' | 'formula';
      choices: Choice[];
    }
  | {
      kind: 'scplay';
      id: string;
      sid: string;
      root: number;
      start: number;
      show: 'name' | 'letters' | 'staff';
    };

export interface RtapQuestion {
  kind: 'rtap';
  id: string;
  bar: Bar;
  phase: 'ready' | 'run' | 'done';
  taps: number[];
  grade: TapGrade | null;
  counting?: boolean;
  playedAt?: number;
  gstart?: number;
  gspu?: number;
  tv?: TempoVerdict;
  newBest?: boolean;
  nextBpm?: number;
}
export interface ScaleStaffOpt {
  sid: string;
  ok: boolean;
  alter?: { k: number; dir: number };
}
export type QuestionKind = Question['kind'];
export type Q<K extends QuestionKind> = Extract<Question, { kind: K }>;

/** A forced card, as cardToItem() describes it. Loosely typed on purpose: each
    maker reads only the fields its own card prefix carries. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Forced = any;

/* ---------------- shared helpers ---------------- */
/** Multiple choice is offered with up to four options. */
const MAX_CHOICES = 4;
/** Add a wrong answer unless the list is full or the label is already there.
    Two options that read the same make a question unanswerable. */
function addDistinct(choices: Choice[], used: Set<string>, label: string): void {
  if (choices.length >= MAX_CHOICES || used.has(label)) {
    return;
  }
  used.add(label);
  choices.push({ t: label, ok: false });
}
/** The right answer, then wrong ones from `wrongLabels` in order until full. */
function choicesFrom(correct: string, wrongLabels: string[]): Choice[] {
  const choices: Choice[] = [{ t: correct, ok: true }];
  const used = new Set([correct]);
  wrongLabels.forEach((label) => addDistinct(choices, used, label));
  return choices;
}
/** The right pitch class among three others near it, shuffled. */
function pcOptions(pc: number): number[] {
  return shuffle([pc].concat(distractors(pc, 3)));
}

/* ---------------- interval and chord questions ---------------- */
/** Ear questions on a bass sound in E2–E3: a comfortable middle register. */
const EAR_LOW = 40;
const EAR_SPAN = 13;
/** A comfortable place to hear an interval: middle of the bass range, or the
    singer's range for the sing-it drill. */
function earRoot(forVoice: boolean): number {
  if (forVoice) {
    const range = vRange();
    return range.lo + rnd(Math.max(1, range.hi - range.lo - 12));
  }
  return EAR_LOW + rnd(EAR_SPAN);
}
function makeChordQ(chordId: string | null): Question {
  const cid = chordId ?? pickOf(chPool()).id;
  const chord = chDef(cid);
  const root = EAR_LOW + rnd(EAR_SPAN);
  const otherNames = chPool()
    .filter((other) => other.id !== cid)
    .map((other) => other.n);
  return {
    kind: 'chhear',
    id: 'ch:' + cid,
    cid,
    root,
    notes: chord.iv.map((semis) => root + semis),
    choices: options(chord.n, otherNames),
  };
}
/** Two notes an interval apart on the neck, the second found from the first's
    string up; null if no such pair turns up in a few tries. */
function intervalOnNeck(semis: number): { a: Cell; b: Cell } | null {
  let first: Cell | null = null;
  let second: Cell | null = null;
  for (let tries = 0; tries < 40 && (!first || !second); tries++) {
    first = findPos(EAR_LOW + rnd(16), rnd(4));
    second = first ? findPos(STRINGS[first.s].open + first.f + semis, first.s) : null;
  }
  return first && second ? { a: first, b: second } : null;
}
/** A root on one string with room for the interval above it on the same string. */
function intervalBase(semis: number): Cell {
  const highestFret = 15;
  let base: Cell;
  let tries = 0;
  do {
    base = { s: rnd(4), f: rnd(Math.max(1, 13 - semis)) };
    tries++;
  } while (base.f + semis > highestFret && tries < 30);
  return base;
}
function makeEarQ(drill: { id: string }, forced?: Forced): Question | null {
  const wantsChord = drill.id === 'chhear';
  let card = forced;
  if (!card) {
    /* pick from the pool this drill actually uses, or a chord card lands in
       the middle of an interval drill */
    const ids = wantsChord
      ? chPool().map((chord) => 'ch:' + chord.id)
      : ivPool().map((semis) => 'iv:' + semis);
    card = pick(ids.map((id) => ({ id })));
  }
  if (!card) {
    return null;
  }
  const id: string = card.id;
  const isChordCard = id.startsWith('ch:');
  if (wantsChord || isChordCard) {
    return makeChordQ(isChordCard ? id.slice(3) : null);
  }
  const semis = +id.slice(3);
  const intervalChoices = () =>
    options(
      ivDef(semis).n,
      ivPool()
        .filter((other) => other !== semis)
        .map((other) => ivDef(other).n),
    );
  if (drill.id === 'ivhear') {
    return { kind: 'ivhear', id, semis, root: earRoot(false), choices: intervalChoices() };
  }
  if (drill.id === 'ivsee') {
    const pair = intervalOnNeck(semis);
    if (!pair) {
      return makeEarQ({ id: 'ivhear' }, card);
    }
    return { kind: 'ivsee', id, semis, a: pair.a, b: pair.b, choices: intervalChoices() };
  }
  if (drill.id === 'ivbuild') {
    const base = intervalBase(semis);
    const rootMidi = STRINGS[base.s].open + base.f;
    return { kind: 'ivbuild', id, semis, base, rootMidi, target: { s: base.s, f: base.f + semis } };
  }
  /* sing it: mostly upwards */
  const root = earRoot(true);
  return { kind: 'singit', id, semis, root, dir: Math.random() < 0.75 ? 1 : -1 };
}

/* ---------------- a scale by ear ---------------- */
function makeScalearQ(forced?: Forced): Question | null {
  const pool = enabledScales();
  if (pool.length < 2) {
    return null;
  }
  const sid = forced && forced.id ? forced.id.slice(3) : pickOf(pool).id;
  const scale = scaleDef(sid);
  if (!scale || !scaleOn(sid)) {
    return null;
  }
  /* Distractors with the same number of notes first: a five-note scale set
     against seven-note ones gives the answer away on length alone. */
  const others = pool.filter((other) => other.id !== sid);
  const sameSize = shuffle(others.filter((other) => other.iv.length === scale.iv.length));
  const otherSize = shuffle(others.filter((other) => other.iv.length !== scale.iv.length));
  /* options() shuffles whatever it is handed, so the same-length ones have to
     be chosen here rather than merely listed first. */
  const wrongNames = sameSize
    .concat(otherSize)
    .map((other) => other.n)
    .slice(0, 3);
  const choices = options(scale.n, wrongNames);
  return {
    kind: 'earscale',
    id: 'se:' + sid,
    sid,
    root: EAR_LOW + rnd(10),
    choices,
    played: false,
  };
}

/* ---------------- movable do and degrees ---------------- */
type Pref = 'sharp' | 'flat';
function mdoLabel(pc: number, keyPc: number, mode: string, pref: Pref): string {
  return mode === 'deg' ? degName(pc, keyPc, pref) : mdoName(pc, keyPc, pref);
}
/** The other degrees in rotation, shuffled — the source of wrong answers. */
function otherDegrees(pc: number, keyPc: number): number[] {
  const mine = relOf(pc, keyPc);
  return shuffle(mdoRels().filter((degree) => degree !== mine));
}
/** The wrong answers are other degrees of the same key, never random
    syllables: confusing Mi with Fa is the mistake worth drilling. */
function mdoDistract(pc: number, keyPc: number, mode: string, pref: Pref, count: number) {
  const out: { pc: number; t: string }[] = [];
  const used = new Set([mdoLabel(pc, keyPc, mode, pref)]);
  for (const degree of otherDegrees(pc, keyPc)) {
    if (out.length >= count) {
      continue;
    }
    const otherPc = pcOf(keyPc + degree);
    const label = mdoLabel(otherPc, keyPc, mode, pref);
    if (used.has(label)) {
      continue;
    }
    used.add(label);
    out.push({ pc: otherPc, t: label });
  }
  return out;
}
function noteDistract(pc: number, keyPc: number, pref: Pref, count: number) {
  return otherDegrees(pc, keyPc)
    .slice(0, count)
    .map((degree) => {
      const otherPc = pcOf(keyPc + degree);
      return { pc: otherPc, t: noteName(otherPc, 'en', pref) };
    });
}
/** The movable-do card to ask: the forced one, or one picked by need (for the
    neck drill, only notes the current range reaches). */
function chooseMdoCard(drill: DrillDef, forced?: Forced) {
  if (forced && forced.id && forced.id.startsWith('md:')) {
    return { keyPc: forced.keyPc as number, pc: forced.pc as number, id: forced.id as string };
  }
  let ids = mdoCards();
  if (drill.from === 'fb') {
    ids = ids.filter((id) => placesFor(parseMD(id).pc).length > 0);
  }
  const chosen = pick(ids.map((id) => ({ id })));
  if (!chosen) {
    return null;
  }
  return { ...parseMD(chosen.id), id: chosen.id };
}
/** Sung degrees are pitched around C3, in the key's own octave. */
const SING_TONIC_BASE = 48;
function makeMdoQ(drill: DrillDef, forced?: Forced): Question | null {
  const pref = honmoon.settings.pref;
  const card = chooseMdoCard(drill, forced);
  if (!card) {
    return null;
  }
  const { keyPc, pc, id } = card;
  const mode = drill.mode!;
  const correct = mdoLabel(pc, keyPc, mode, pref);

  if (drill.from === 'sing') {
    const tonic = SING_TONIC_BASE + (keyPc % 12);
    return {
      kind: 'singdeg',
      id,
      keyPc,
      pc,
      mode,
      ask: correct,
      tonic,
      target: tonic + relOf(pc, keyPc),
    };
  }
  if (drill.from === 'fb') {
    const where = placesFor(pc);
    if (!where.length) {
      return null;
    }
    const pos = where[rnd(where.length)];
    return { kind: 'deg2fb', id, keyPc, pc, mode, ask: correct, pos };
  }
  if (drill.from === 'syll') {
    const wrongNotes = noteDistract(pc, keyPc, pref, 5).map((item) => item.t);
    return {
      kind: 'mdo',
      id,
      keyPc,
      pc,
      mode,
      from: 'syll',
      ask: correct,
      choices: options(noteName(pc, 'en', pref), wrongNotes),
    };
  }
  const wrongLabels = mdoDistract(pc, keyPc, mode, pref, 5).map((item) => item.t);
  const question: Q<'mdo'> = {
    kind: 'mdo',
    id,
    keyPc,
    pc,
    mode,
    from: drill.from as 'staff' | 'name',
    ask: correct,
    choices: options(correct, wrongLabels),
  };
  if (drill.from === 'staff') {
    const clef = enabledClefs()[rnd(enabledClefs().length)];
    question.clef = clef;
    question.m = midiForPcInClef(pc, clef);
  }
  return question;
}

/* ---------------- rhythm questions ---------------- */
/** A note-value card: forced, or picked by need from the value and rest cards. */
function chooseValueCard(forcedId: string | null): { id: string; u: number; rest: boolean } | null {
  let id = forcedId;
  if (!id) {
    const kindOf = (cardId: string) => cardId.split(':')[1];
    const pool = rhCards()
      .filter((cardId) => kindOf(cardId) === 'v' || kindOf(cardId) === 'r')
      .map((cardId) => ({ id: cardId }));
    const chosen = pick(pool);
    if (!chosen) {
      return null;
    }
    id = chosen.id;
  }
  const [, kind, value] = id.split(':');
  return { id, u: +value, rest: kind === 'r' };
}
function makeValueQ(forcedId: string | null, level: number): Question | null {
  const card = chooseValueCard(forcedId);
  if (!card) {
    return null;
  }
  const { u, rest } = card;
  const others = shuffle(rhValues(level).filter((value) => value !== u));
  const choices = choicesFrom(
    beatsText(u),
    others.map((value) => beatsText(value)),
  );
  return { kind: 'rvalue', id: card.id, u, rest, choices: shuffle(choices) };
}
const PADDING_TRIES = 30;
/** "Which counting is this bar?": the real counting against those of similar
    bars, all written on one grid fine enough for every one of them. */
function makeCountQ(bar: Bar, id: string, level: number): Question {
  const variants = rhVariants(bar, 3).filter((variant) => variant.u === bar.u);
  let step = barGridStep(bar);
  variants.forEach((variant) => {
    step = gcd2(step, barGridStep(variant));
  });
  step = Math.max(1, step);
  const choices = choicesFrom(
    barCounting(bar, step),
    variants.map((variant) => barCounting(variant, step)),
  );
  const used = new Set(choices.map((choice) => choice.t));
  for (let tries = 0; choices.length < MAX_CHOICES && tries < PADDING_TRIES; tries++) {
    const extra = rhMakeBar(level);
    if (extra.u === bar.u) {
      addDistinct(choices, used, barCounting(extra, step));
    }
  }
  return { kind: 'rcount', id, bar, step, choices: shuffle(choices) };
}
/** Blank out one event and ask which value fills the bar. */
function makeFillQ(bar: Bar, id: string, level: number): Question {
  const blank = rnd(bar.ev.length);
  const missing = bar.ev[blank];
  const nameOf = (value: number) => (missing.r ? restName(value) : rvalDef(value).n);
  const others = shuffle(rhValues(level).filter((value) => value !== missing.u));
  const choices = choicesFrom(nameOf(missing.u), others.map(nameOf));
  return { kind: 'rfill', id, bar, blank, miss: missing, choices: shuffle(choices) };
}
function makeRhythmQ(drill: DrillDef, forced?: Forced): Question | null {
  const forcedId: string | null = (forced && forced.id) || null;
  const level = rlevN();
  if (drill.rk === 'value') {
    return makeValueQ(forcedId, level);
  }
  const bar = rhMakeBar(level);
  const cardId = (kind: string) => forcedId || 'rh:' + kind + ':' + level;
  if (drill.rk === 'count') {
    return makeCountQ(bar, cardId('count'), level);
  }
  if (drill.rk === 'fill') {
    return makeFillQ(bar, cardId('fill'), level);
  }
  if (drill.rk === 'hear') {
    const soundAlikes = rhVariants(bar, 2, true);
    if (soundAlikes.length < 2) {
      return null; /* rather no question than a guess */
    }
    const order = shuffle([bar, ...soundAlikes].map((option, i) => ({ b: option, ok: i === 0 })));
    return { kind: 'rhear', id: cardId('hear'), bar, ropts: order, played: false };
  }
  return { kind: 'rtap', id: cardId('tap'), bar, phase: 'ready', taps: [], grade: null };
}

/* ---------------- scale questions ---------------- */
/** Every degree a wrong answer can name. */
const ALL_DEGREES = ['1', '2', 'b2', 'b3', '3', '4', '#4', 'b5', '5', 'b6', '6', 'b7', '7', '8'];
/** Nothing in a shape is placed above this fret. */
const HIGHEST_SHAPE_FRET = 17;

function makeDegreeQ(id: string, sid: string, root: number): Question {
  const notes = scaleNotes(sid, root);
  const toNote = Math.random() < 0.5;
  const index = 1 + rnd(notes.length - 1);
  const target = notes[index];
  if (toNote) {
    /* distractors are the scale's own other notes — being wrong by a degree
       is the mistake worth catching, not being wrong by a random letter */
    const wrongNotes = notes.filter((_, i) => i !== index).map(noteText);
    const choices = options(noteText(target), wrongNotes);
    return { kind: 'scdeg', id, sid, root, dir: 'note', ask: degPretty(target.deg), choices };
  }
  const wrongDegrees = ALL_DEGREES.filter((degree) => degree !== target.deg).map(degPretty);
  const choices = options(degPretty(target.deg), wrongDegrees);
  return { kind: 'scdeg', id, sid, root, dir: 'deg', ask: noteText(target), choices };
}
/** Every note of a shape (but the first) that can be moved a fret up or down
    without leaving the neck or landing on another note of the shape. */
function movableNotes(shape: Shape): { i: number; d: number }[] {
  const moves: { i: number; d: number }[] = [];
  for (let i = 1; i < shape.pos.length; i++) {
    for (const direction of [1, -1]) {
      const note = shape.pos[i];
      const fret = note.f + direction;
      if (fret < 0 || fret > HIGHEST_SHAPE_FRET) {
        continue;
      }
      const occupied = shape.pos.some(
        (other, j) => j !== i && other.s === note.s && other.f === fret,
      );
      if (!occupied) {
        moves.push({ i, d: direction });
      }
    }
  }
  return moves;
}
function makeWrongNoteQ(card: Forced, id: string, sid: string, root: number): Question | null {
  const start = randStart();
  const shape = scaleShape(sid, root, start, 1);
  const moves = movableNotes(shape);
  if (!moves.length) {
    return makeScaleQ({ id: 'scbuild' }, card);
  }
  const move = moves[rnd(moves.length)];
  const shown: ShapePos[] = shape.pos.map((pos) => ({
    s: pos.s,
    f: pos.f,
    fin: pos.fin,
    deg: pos.deg,
    shift: false,
  }));
  shown[move.i] = { ...shown[move.i], f: shape.pos[move.i].f + move.d };
  return { kind: 'scwrong', id, sid, root, start, shape, shown, bad: move.i };
}
/** Three staves on the same root: the scale asked for, and two others with
    the same number of notes, so the difference is an accidental or two and has
    to be read rather than counted. */
function makeWriteQ(id: string, sid: string, root: number): Question {
  const scale = scaleDef(sid);
  const sameSize = scaleAlts(sid).filter((other) => other.iv.length === scale.iv.length);
  const staves: ScaleStaffOpt[] = [{ sid, ok: true }].concat(
    sameSize.slice(0, 2).map((other) => ({ sid: other.id, ok: false })),
  );
  /* Pentatonics and the six-note scales have only one relative of the same
     size. Rather than pad with a scale you could rule out by counting, the
     missing staff is the right scale with one note moved a fret — the most
     useful wrong answer there is, because it is the one you would write by
     mistake. */
  const written = new Set(staves.map((staff) => staffSig(staff, root)));
  for (let tries = 0; staves.length < 3 && tries < PADDING_TRIES; tries++) {
    const alter = alterOne(sid, root);
    if (!alter) {
      break;
    }
    const candidate: ScaleStaffOpt = { sid, ok: false, alter };
    const signature = staffSig(candidate, root);
    if (written.has(signature)) {
      continue;
    }
    written.add(signature);
    staves.push(candidate);
  }
  return { kind: 'scwrite', id, sid, root, start: randStart(), sopts: shuffle(staves) };
}
/** Name the scale from its steps, or its steps/formula from the name. */
function makeRecipeQ(
  kind: 'scsteps' | 'screcipe',
  id: string,
  sid: string,
  root: number,
): Question {
  const form = Math.random() < 0.5 ? 'steps' : 'formula';
  const recipe = (scaleId: string) =>
    form === 'steps'
      ? scaleSteps(scaleId)
          .filter((step) => step > 0)
          .join(' ')
      : scaleDef(scaleId).dg.map(degPretty).join(' ');
  const alternatives = scaleAlts(sid);
  // (randomness is drawn in a fixed order: the start string, then the options)
  const start = randStart();
  if (kind === 'scsteps') {
    const choices = altOptions(
      scaleDef(sid).n,
      alternatives.map((other) => other.n),
    );
    return { kind, id, sid, root, start, form, choices };
  }
  const choices = altOptions(
    recipe(sid),
    alternatives.map((other) => recipe(other.id)),
  );
  return { kind, id, sid, root, start, form, choices };
}
function makeScaleQ(drill: { id: string }, forced?: Forced): Question | null {
  const card = forced || pick(scaleCards().map((id) => ({ id })));
  if (!card) {
    return null;
  }
  const info = card.sid ? card : parseSC(card.id);
  const sid: string = info.sid;
  const root: number = info.root;
  const id: string = card.id || 'sc:' + sid + ':' + root;
  const scale = scaleDef(sid);
  switch (drill.id) {
    case 'scbuild': {
      const start = randStart();
      const shape = scaleShape(sid, root, start, 1);
      return {
        kind: 'scbuild',
        id,
        sid,
        root,
        start,
        shape,
        idx: 0,
        misses: 0,
        wrong: null,
        reveal: false,
      };
    }
    case 'scdeg':
      return makeDegreeQ(id, sid, root);
    case 'scwrong':
      return makeWrongNoteQ(card, id, sid, root);
    case 'scname': {
      const start = randStart();
      const shape = scaleShape(sid, root, start, 1);
      const sameSize = shuffle(
        SCALES.filter((other) => other.id !== sid && other.iv.length === scale.iv.length),
      );
      const otherSize = shuffle(
        SCALES.filter((other) => other.id !== sid && other.iv.length !== scale.iv.length),
      );
      const choices = options(
        scale.n,
        sameSize.concat(otherSize).map((other) => other.n),
      );
      return { kind: 'scname', id, sid, root, start, shape, choices };
    }
    case 'scstaff': {
      const alternatives = scaleAlts(sid);
      // (randomness is drawn in a fixed order: the start string, then the options)
      const start = randStart();
      const choices = altOptions(
        scaleName(sid, root),
        alternatives.map((other) => scaleName(other.id, root)),
      );
      return { kind: 'scstaff', id, sid, root, start, choices };
    }
    case 'scwrite':
      return makeWriteQ(id, sid, root);
    case 'scsteps':
    case 'screcipe':
      return makeRecipeQ(drill.id, id, sid, root);
    default: {
      const show = (['name', 'letters', 'staff'] as const)[rnd(3)];
      return { kind: 'scplay', id, sid, root, start: randStart(), show };
    }
  }
}

/* ---------------- the simple note questions ---------------- */
function makeFretToNameQ(drill: DrillDef, forced?: Forced): Question | null {
  const pos = forced || pick(positions());
  if (!pos) {
    return null;
  }
  const pc = pcOf(pos.m);
  return { kind: 'fb2name', sys: drill.sys as Sys, pos, id: pos.id, pc, opts: pcOptions(pc) };
}
function makeNameToFretQ(drill: DrillDef, forced?: Forced): Question | null {
  const pos = forced || pick(positions());
  if (!pos) {
    return null;
  }
  return { kind: 'name2fb', sys: drill.sys as Sys, pos, id: pos.id, pc: pcOf(pos.m) };
}
function makeStaffKeyQ(forced?: Forced): Question | null {
  const note = forced || pick(staffNotes());
  if (!note) {
    return null;
  }
  return { kind: 'staffkey', note, clef: note.clef || 'bass', id: note.id, pc: pcOf(note.m) };
}
function makeStaffToNameQ(drill: DrillDef, forced?: Forced): Question | null {
  const note = forced || pick(staffNotes());
  if (!note) {
    return null;
  }
  const pc = pcOf(note.m);
  return {
    kind: 'staff2name',
    sys: drill.sys as Sys,
    note,
    clef: note.clef || 'bass',
    id: note.id,
    pc,
    opts: pcOptions(pc),
  };
}
function makeTranslateQ(drill: DrillDef, forced?: Forced): Question | null {
  const item = forced || pick(pcs());
  if (!item) {
    return null;
  }
  return {
    kind: 'translate',
    sys: drill.sys as Sys,
    from: otherSys(drill.sys as Sys),
    id: item.id,
    pc: item.pc,
    opts: pcOptions(item.pc),
  };
}
/** Play the note on the bass. Written pitch is an octave above sounding, so
    the pitch to listen for is twelve below. */
function makePlayQ(drill: DrillDef, forced?: Forced): Question | null {
  if (drill.sys === 'staff') {
    const note = forced || pick(staffNotesFor('bass'));
    if (!note) {
      return null;
    }
    return {
      kind: 'play',
      sys: 'staff',
      note,
      clef: 'bass',
      id: note.id,
      pc: pcOf(note.m),
      target: note.m - 12,
      exact: true,
    };
  }
  const item = forced || pick(playPcs());
  if (!item) {
    return null;
  }
  const where = placesFor(item.pc);
  return {
    kind: 'play',
    sys: drill.sys as Sys,
    id: item.id,
    pc: item.pc,
    target: where.length ? where[0].m - 12 : null,
    exact: false,
  };
}

/* ---------------- one question for a drill ----------------
   `forced` is a card the session wants asked; without one the drill picks its
   own, weighted by need. */
export function makeQ(id: string, forced?: Forced): Question | null {
  const drill = anyDrillDef(id);
  if (!drill) {
    return null;
  }
  switch (drill.kind) {
    case 'earscale':
      return makeScalearQ(forced);
    case 'fb2name':
      return makeFretToNameQ(drill, forced);
    case 'name2fb':
      return makeNameToFretQ(drill, forced);
    case 'staffkey':
      return makeStaffKeyQ(forced);
    case 'staff2name':
      return makeStaffToNameQ(drill, forced);
    case 'translate':
      return makeTranslateQ(drill, forced);
    case 'ear':
      return makeEarQ(drill, forced);
    case 'mdo':
      return makeMdoQ(drill, forced);
    case 'rhythm':
      return makeRhythmQ(drill, forced);
  }
  if (isScaleDrill(drill.id)) {
    return makeScaleQ(drill, forced);
  }
  if (drill.kind === 'play') {
    return makePlayQ(drill, forced);
  }
  return null;
}

/** "Answer by tapping" turns a play-along staff question into a naming one. */
export function playToNaming(question: Q<'play'>): Question {
  return {
    kind: 'staff2name',
    id: question.id,
    sys: 'en',
    note: question.note!,
    clef: question.clef || 'bass',
    pc: question.pc,
    opts: pcOptions(question.pc),
  };
}

export { anyDrillDef };
