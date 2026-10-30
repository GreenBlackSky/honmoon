import { honmoon, record, save, queueSave } from '../store/honmoon.svelte';
import { STRINGS } from '../music/bass';
import { pcOf } from '../music/notes';
import { rhBpm, gradeTaps, tapVerdict, rhRecordTempo } from '../music/rhythm';
import { ac, acIfAny } from '../audio/context';
import { holdStop, piano, pianoChord, playInterval, playScaleEar } from '../audio/synth';
import { rhPlay, rhStopPlay } from '../audio/rhythmplay';
import {
  micListen,
  micOn,
  micReason,
  micStart,
  micStop,
  micUsable,
  type MicReason,
} from '../audio/mic';
import { shuffle } from '../util/random';
import { go, nav, onNavigate } from '../nav.svelte';
import { buildSession, cardToItem, drillsForCard, type QueueEntry } from '../learn/session';
import { anyDrillDef } from './defs';
import { makeQ, playToNaming, type Question, type Q } from './questions';

type Cell = { s: number; f: number };

/* ---------------- the drill in progress ---------------- */
export interface DrillState {
  id: string | null;
  q: Question | null;
  /** when the question appeared, for timing the answer */
  t0: number;
  answered: boolean;
  ok: boolean;
  /** answers and correct answers since the drill was opened */
  session: { n: number; c: number };
  /** the family the drill was opened from, for the back button */
  fam: string | null;
  /** a tap still travelling from the last answer must not land on the next question */
  lockUntil: number;
  fbScroll: number;
  wrongCell: Cell | null;
  altCell: Cell | null;
  wrongKey: number | null;
  octaveOff: boolean;
  played: number | null;
  requeued: boolean;
  chosen: number | null;
  chosenIdx: number | null;
  skipped: boolean;
  selfMarked: boolean;
}
/** What is reset for every new question. */
function freshAnswer() {
  return {
    answered: false,
    fbScroll: 0,
    wrongCell: null,
    altCell: null,
    wrongKey: null,
    octaveOff: false,
    played: null,
    requeued: false,
    chosen: null,
    chosenIdx: null,
    skipped: false,
    selfMarked: false,
  };
}
function freshDrill(): DrillState {
  return {
    id: null,
    q: null,
    t0: 0,
    ok: false,
    session: { n: 0, c: 0 },
    fam: null,
    lockUntil: 0,
    ...freshAnswer(),
  };
}
/** The drill on screen: its question and how it has been answered. */
export const drill: DrillState = $state(freshDrill());

export interface Session {
  queue: QueueEntry[];
  /** index of the current entry in the queue */
  i: number;
  right: number;
  wrong: number;
  /** when it started */
  t0: number;
  /** questions planned (missed cards that come back are extra) */
  planned: number;
  plannedDone: number;
  /** missed cards put back into the queue */
  redos: number;
  results: { card: string; drill: string; ok: boolean }[];
  mode: 'scales' | 'theory';
  /** how long it took, set when it ends */
  secs?: number;
}
/** The running session, if any. */
export const session: { current: Session | null } = $state({ current: null });

/** After a new question appears, taps are ignored this long. */
const ANSWER_LOCK_MS = 320;
/** After a right answer, the next question comes this long after. */
const AUTO_ADVANCE_MS = 1200;
/** Ear questions play by themselves this long after they appear. */
const AUTOPLAY_DELAY_MS = 260;
/** A missed card comes back 6–9 questions later. */
const RETRY_MIN_GAP = 6;
const RETRY_EXTRA_GAP = 4;
/** Card-and-drill pairs tried before giving up on finding a question. */
const MAX_SKIPPED_PAIRS = 25;

export function locked(): boolean {
  return !!(drill.lockUntil && Date.now() < drill.lockUntil);
}

/* ---------------- starting and moving on ---------------- */
export function startDrill(id: string, fam?: string | null): void {
  const def = anyDrillDef(id);
  Object.assign(drill, freshDrill(), { id, fam: fam ?? (def ? def.g : null) });
  go('drill', { id });
  nextQ();
}

/** The next question of the running session. A card and a drill can turn out
    not to fit each other at the current range — a degree that lands on a note
    the neck does not reach here, say. Drop the pairing and take the next one
    rather than showing a dead end, and shorten the plan so the count stays
    honest. */
function nextSessionQuestion(current: Session): Question | null {
  for (let tries = 0; current.i < current.queue.length && tries < MAX_SKIPPED_PAIRS; tries++) {
    const entry = current.queue[current.i];
    drill.id = entry.drill;
    const question = makeQ(entry.drill, cardToItem(entry.card));
    if (question) {
      return question;
    }
    current.queue.splice(current.i, 1);
    if (!entry.retry) {
      current.planned = Math.max(current.plannedDone, current.planned - 1);
    }
  }
  return null;
}
/** Ear questions sound by themselves, a moment after they appear. */
function autoplayIfEar(question: Question | null): void {
  if (!question || !['ivhear', 'chhear', 'earscale'].includes(question.kind)) {
    return;
  }
  setTimeout(() => {
    const q = drill.q;
    if (!q || drill.answered) {
      return;
    }
    if (q.kind === 'chhear') {
      pianoChord(q.notes, null, 2.2, 0.75);
    } else if (q.kind === 'earscale') {
      playScaleEar(q.sid, q.root);
    } else if (q.kind === 'ivhear') {
      playInterval(q.root, q.semis, false);
    }
  }, AUTOPLAY_DELAY_MS);
}
export function nextQ(): void {
  holdStop();
  Object.assign(drill, freshAnswer());
  drill.lockUntil = Date.now() + ANSWER_LOCK_MS;
  const current = session.current;
  if (current) {
    drill.q = null;
    drill.q = nextSessionQuestion(current);
    if (!drill.q) {
      endSession();
      return;
    }
  } else {
    drill.q = makeQ(drill.id!);
  }
  drill.t0 = Date.now();
  if (drill.q && drill.q.kind === 'play') {
    armListen();
  }
  autoplayIfEar(drill.q);
}

export type AnswerExtra = Partial<
  Pick<
    DrillState,
    'wrongCell' | 'altCell' | 'wrongKey' | 'octaveOff' | 'played' | 'skipped' | 'selfMarked'
  >
>;

/** Count an answer in the running session; a missed card is put back to come
    round again. */
function recordInSession(current: Session, ok: boolean): void {
  if (current.i >= current.queue.length) {
    return;
  }
  const entry = current.queue[current.i];
  current.results.push({ card: entry.card, drill: entry.drill, ok });
  if (!entry.retry) {
    current.plannedDone++;
  }
  if (ok) {
    current.right++;
  } else {
    current.wrong++;
    /* Within-session spacing: a missed card comes back a handful of
       questions later, once, so you get a second attempt while it is still
       fresh. That second pass is what makes a session stick. */
    if (!entry.retry) {
      const gap = RETRY_MIN_GAP + Math.floor(Math.random() * RETRY_EXTRA_GAP);
      const at = Math.min(current.queue.length, current.i + gap);
      current.queue.splice(at, 0, { card: entry.card, drill: entry.drill, retry: 1 });
      current.redos++;
      drill.requeued = true;
    }
  }
  current.i++;
}
export function answer(ok: boolean, extra?: AnswerExtra): void {
  if (drill.answered || !drill.q || locked()) {
    return;
  }
  drill.answered = true;
  drill.ok = ok;
  drill.session.n++;
  if (ok) {
    drill.session.c++;
  }
  record(drill.q.id, ok, Date.now() - drill.t0);
  if (extra) {
    Object.assign(drill, extra);
  }
  if (session.current) {
    recordInSession(session.current, ok);
  }
  if (ok) {
    setTimeout(() => {
      if (nav.view.name === 'drill' && drill.answered) {
        nextQ();
      }
    }, AUTO_ADVANCE_MS);
  }
}
export function skip(): void {
  if (!drill.answered) {
    answer(false, { skipped: true });
  }
}
export function selfMark(ok: boolean): void {
  if (!drill.answered && !locked()) {
    answer(ok, { selfMarked: true });
  }
}
/** A tap on one of the multiple-choice options (choices, bars or staves). */
export function chooseOption(index: number): void {
  const q = drill.q;
  if (drill.answered || !q || locked()) {
    return;
  }
  let list: { ok: boolean }[] | null = null;
  if ('choices' in q) {
    list = q.choices;
  } else if ('ropts' in q) {
    list = q.ropts;
  } else if ('sopts' in q) {
    list = q.sopts;
  }
  if (!list) {
    return;
  }
  drill.chosen = index;
  answer(!!list[index].ok);
}
/** A tap on a note-name key. */
export function choosePc(pc: number): void {
  if (drill.answered || locked() || !drill.q) {
    return;
  }
  drill.chosen = pc;
  answer(pc === (drill.q as { pc: number }).pc);
}

/* ---------------- sessions ---------------- */
function newSession(queue: QueueEntry[], mode: 'scales' | 'theory'): Session {
  return {
    queue,
    i: 0,
    right: 0,
    wrong: 0,
    t0: Date.now(),
    planned: queue.length,
    plannedDone: 0,
    redos: 0,
    results: [],
    mode,
  };
}
function beginSession(current: Session): void {
  session.current = current;
  Object.assign(drill, freshDrill(), { id: current.queue[0].drill });
  go('drill');
  nextQ();
}
export function startSession(mode: 'scales' | 'theory'): void {
  const length = mode === 'scales' ? honmoon.settings.sslen || 20 : honmoon.settings.slen || 30;
  const queue = buildSession(length, mode);
  if (!queue.length) {
    return;
  }
  beginSession(newSession(queue, mode || 'theory'));
}
export function endSession(): void {
  const current = session.current;
  if (!current) {
    return;
  }
  current.secs = Math.round((Date.now() - current.t0) / 1000);
  save();
  if (micOn()) {
    micStop();
  }
  go('done');
}
/** The cards missed in this session and never got right afterwards. */
export function stillMissed(current: Session): string[] {
  const missed: string[] = [];
  const lastResult: Record<string, boolean> = {};
  for (const result of current.results) {
    if (!result.ok && !missed.includes(result.card)) {
      missed.push(result.card);
    }
    lastResult[result.card] = result.ok;
  }
  return missed.filter((card) => !lastResult[card]);
}
/** A short session of just the given cards, each with a drill that can ask it. */
export function startMissSession(cards: string[]): void {
  const queue = cards
    .map((card) => {
      const drills = drillsForCard(card);
      if (!drills.length) {
        return null;
      }
      return { card, drill: drills[Math.floor(Math.random() * drills.length)].id };
    })
    .filter(Boolean) as QueueEntry[];
  if (!queue.length) {
    go('home');
    return;
  }
  const current = newSession(shuffle(queue), 'theory');
  current.planned = queue.length;
  beginSession(current);
}

/* ---------------- taps on the instruments ---------------- */
/** A tap on a key. In play mode it just sounds; in a drill it is the answer,
    and the note sounds as feedback — by then the answer is committed, so
    nothing can be hunted for by ear beforehand. */
export function handleKey(midi: number): void {
  if (!isFinite(midi)) {
    return;
  }
  const q = drill.q;
  if (nav.view.name === 'drill' && q && q.kind === 'staffkey' && !drill.answered && !locked()) {
    const ok = pcOf(midi) === q.pc;
    piano(midi, null, 1.1, 0.85);
    answer(ok, { wrongKey: ok ? null : midi });
    return;
  }
  piano(midi, null, 1.4, 0.8);
}
/** A tap on the neck, at string `string` (0 = G), fret `fret`. */
export function handleFret(string: number, fret: number, scrollLeft = 0): void {
  const q = drill.q;
  if (drill.answered || !q || locked()) {
    return;
  }
  const tapped = { s: string, f: fret };
  switch (q.kind) {
    case 'scbuild':
      return buildTap(q, string, fret, scrollLeft);
    case 'scwrong':
      return wrongTap(q, string, fret);
    case 'ivbuild': {
      const ok = string === q.target.s && fret === q.target.f;
      return answer(ok, { wrongCell: ok ? null : tapped });
    }
    case 'deg2fb': {
      /* any octave counts: the question is which degree, not which fret */
      const ok = pcOf(STRINGS[string].open + fret) === q.pc;
      return answer(ok, { wrongCell: ok ? null : tapped });
    }
    case 'name2fb':
      return findNoteTap(q, string, fret, scrollLeft);
  }
}
/** "Find A on the A string" has two answers on a twelve-fret neck: the open
    string and the twelfth fret. The question does not say which, so both
    count — it only says so afterwards, when it can point at the other one
    without giving anything away. */
function findNoteTap(q: Q<'name2fb'>, string: number, fret: number, scrollLeft: number): void {
  drill.fbScroll = scrollLeft;
  const exact = string === q.pos.s && fret === q.pos.f;
  const sameNote = string === q.pos.s && pcOf(STRINGS[string].open + fret) === q.pc;
  const ok = exact || sameNote;
  answer(ok, {
    wrongCell: ok ? null : { s: string, f: fret },
    octaveOff: ok && !exact,
    altCell: ok && !exact ? { s: string, f: fret } : null,
  });
}
/** After two misses in a scale run, the next note is shown. */
const MISSES_BEFORE_REVEAL = 2;
function buildTap(q: Q<'scbuild'>, string: number, fret: number, scrollLeft: number): void {
  const wanted = q.shape.pos[q.idx];
  q.scroll = scrollLeft;
  if (wanted.s === string && wanted.f === fret) {
    q.wrong = null;
    q.reveal = false;
    q.idx++;
    if (q.idx >= q.shape.pos.length) {
      answer(q.misses === 0);
    }
    return;
  }
  q.misses++;
  q.wrong = { s: string, f: fret };
  if (q.misses >= MISSES_BEFORE_REVEAL) {
    q.reveal = true;
  }
}
function wrongTap(q: Q<'scwrong'>, string: number, fret: number): void {
  const hit = q.shown.findIndex((pos) => pos.s === string && pos.f === fret);
  if (hit < 0) {
    return;
  }
  drill.chosenIdx = hit;
  answer(hit === q.bad);
}

/* ---------------- listening for the play-along drills ---------------- */
export const listen: {
  status: 'idle' | 'on' | 'fail';
  freq: number;
  midi: number;
  rms: number;
  reason: MicReason | null;
} = $state({ status: 'idle', freq: 0, midi: 0, rms: 0, reason: null });

/** A wrong note only counts as an answer when it is this close (in
    semitones) to the target: further off is more likely noise, or the
    instrument still being picked up. */
const WRONG_NOTE_RANGE_EXACT = 7;
const WRONG_NOTE_RANGE_ANY_OCTAVE = 9;

/** Grade a stable note heard by the mic against a play-along question. */
function gradeHeardNote(q: Q<'play'>, heard: number): void {
  if (q.exact) {
    if (heard === q.target) {
      answer(true);
    } else if (pcOf(heard) === pcOf(q.target!)) {
      answer(true, { octaveOff: true });
    } else if (Math.abs(heard - q.target!) <= WRONG_NOTE_RANGE_EXACT) {
      answer(false, { played: heard });
    }
    return;
  }
  if (pcOf(heard) === q.pc) {
    answer(true);
  } else if (q.target == null || Math.abs(heard - q.target) <= WRONG_NOTE_RANGE_ANY_OCTAVE) {
    answer(false, { played: heard });
  }
}
export function armListen(): void {
  const q = drill.q;
  if (!q || q.kind !== 'play' || !honmoon.settings.mic || !micUsable()) {
    return;
  }
  Object.assign(listen, { status: 'on', freq: 0, midi: 0, rms: 0, reason: null });
  micStart()
    .then(() => {
      micListen((reading) => {
        if (nav.view.name !== 'drill' || !drill.q || drill.q.kind !== 'play') {
          return;
        }
        listen.rms = reading.rms || 0;
        listen.freq = reading.freq || 0;
        listen.midi = reading.midi || 0;
        if (drill.answered || !reading.stable || reading.muted) {
          return;
        }
        gradeHeardNote(q, Math.round(reading.midi!));
      });
    })
    .catch((error) => {
      listen.status = 'fail';
      listen.reason = micReason(error);
    });
}
/** "Answer by tapping": give up on the mic for this and future questions. */
export function tapInstead(): void {
  micStop();
  honmoon.settings.mic = false;
  queueSave();
  if (drill.q && drill.q.kind === 'play' && drill.q.sys === 'staff') {
    drill.q = playToNaming(drill.q);
  }
}

/* ---------------- tapping a rhythm ----------------
   Taps are timestamped off the audio clock, the same clock the clicks were
   scheduled on, so the comparison is exact to the sample. Screen and speaker
   latency is a fixed offset measured once in calibration and subtracted. */
const RTAP: {
  /** ends the count-in */
  t1: ReturnType<typeof setTimeout> | undefined;
  /** grades the bar after it has ended */
  t2: ReturnType<typeof setTimeout> | undefined;
} = { t1: undefined, t2: undefined };
/** The pad's flash, for a fraction of a second after each tap. */
export const tapPad = $state({ flash: false });
const PAD_FLASH_MS = 90;
/** Taps start counting a moment before the bar, and grading waits a moment after. */
const COUNT_IN_END_EARLY_MS = 60;
const GRADE_AFTER_MS = 260;

function clearRhythmTimers(): void {
  clearTimeout(RTAP.t1);
  clearTimeout(RTAP.t2);
}
export function rtapGo(): void {
  const q = drill.q;
  if (!q || q.kind !== 'rtap' || q.phase === 'run') {
    return;
  }
  const ctx = ac();
  if (!ctx) {
    return;
  }
  q.taps = [];
  q.grade = null;
  q.phase = 'run';
  q.counting = true;
  q.playedAt = rhBpm();
  const timing = rhPlay(q.bar, q.playedAt, { countIn: 4, beats: true, silent: true });
  if (!timing) {
    q.phase = 'ready';
    return;
  }
  q.gstart = timing.start;
  q.gspu = timing.spu;
  clearRhythmTimers();
  const msUntil = (time: number) => (time - ctx.currentTime) * 1000;
  RTAP.t1 = setTimeout(
    () => {
      if (!drill.q || drill.q !== q || q.phase !== 'run') {
        return;
      }
      q.counting = false;
    },
    Math.max(0, msUntil(timing.start) - COUNT_IN_END_EARLY_MS),
  );
  RTAP.t2 = setTimeout(() => rtapFinish(q), Math.max(0, msUntil(timing.end) + GRADE_AFTER_MS));
}
/** Called on pointerdown, not on click: the pad has to register the instant
    the finger lands. */
export function rtapHit(): void {
  const q = drill.q;
  const ctx = acIfAny();
  if (!q || q.kind !== 'rtap' || q.phase !== 'run' || !ctx) {
    return;
  }
  if (q.counting) {
    return; /* the count-in is not part of the bar */
  }
  q.taps.push(ctx.currentTime);
  tapPad.flash = true;
  setTimeout(() => {
    tapPad.flash = false;
  }, PAD_FLASH_MS);
}
export function rtapCancel(): void {
  clearRhythmTimers();
  rhStopPlay();
  const q = drill.q;
  if (q && q.kind === 'rtap') {
    q.phase = 'ready';
    q.taps = [];
    q.counting = false;
  }
}
function rtapFinish(q: Q<'rtap'>): void {
  if (!drill.q || drill.q !== q || q.phase !== 'run' || drill.answered) {
    return;
  }
  clearRhythmTimers();
  q.phase = 'done';
  q.grade = gradeTaps(q.bar, q.taps, q.gstart!, q.gspu!, honmoon.settings.rlat || 0);
  q.tv = tapVerdict(q.grade);
  q.newBest = rhRecordTempo(q.playedAt!, q.tv);
  q.nextBpm = rhBpm();
  answer(q.grade.ok);
}

/* ---------------- leaving the drill screen ---------------- */
/** Screens a session survives a visit to: its summary, and the references
    and calibration a drill links to. */
const SESSION_KEEPS_ON = ['drill', 'done', 'ref', 'rref', 'rcal'];
onNavigate((from, to) => {
  if (to !== 'drill') {
    clearRhythmTimers();
    rhStopPlay();
  }
  if (from === 'drill' && to !== 'drill') {
    save();
    if (micOn() && to !== 'setup') {
      micStop();
    }
  }
  if (session.current && !SESSION_KEEPS_ON.includes(to)) {
    session.current = null;
  }
});
