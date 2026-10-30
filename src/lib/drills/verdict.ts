import { honmoon } from '../store/honmoon.svelte';
import { STRINGS, placesFor } from '../music/bass';
import { bothNames, degName, keyName, mdoName, noteName, pcOf } from '../music/notes';
import { chDef, ivDef } from '../music/intervals';
import { scaleDef, degPretty, scaleName, scaleNotes, noteText } from '../music/scales';
import { barCounting, beatsText, restName, rvalDef } from '../music/rhythm';
import { anA } from '../util/text';
import type { Q, Question } from './questions';
import type { DrillState } from './runtime.svelte';

/** What the answer panel says: the headline, and the lines under it. */
export interface Verdict {
  ok: boolean;
  txt: string;
  subs: string[];
}

const plural = (count: number, word: string) => count + ' ' + word + (count === 1 ? '' : 's');
/** The note at a tapped place on the neck. */
const pcAtCell = (cell: { s: number; f: number }) => pcOf(STRINGS[cell.s].open + cell.f);

type Pref = 'sharp' | 'flat';

function degreeVerdict(
  q: Q<'mdo'> | Q<'deg2fb'> | Q<'singdeg'>,
  state: DrillState,
  pref: Pref,
): Verdict {
  const ok = state.ok;
  const rightAnswer = q.kind === 'mdo' && q.from === 'syll' ? noteName(q.pc, 'en', pref) : q.ask;
  let headline = ok ? 'Correct' : rightAnswer;
  if (q.kind === 'singdeg') {
    headline = ok ? 'Marked clean' : 'Marked missed';
  }
  if (q.kind === 'deg2fb' && !ok && state.wrongCell) {
    const tappedPc = pcAtCell(state.wrongCell);
    headline =
      'That is ' +
      noteName(tappedPc, 'en', pref) +
      ', the ' +
      degName(tappedPc, q.keyPc, pref) +
      ' of this key';
  }
  const explanation =
    'In ' +
    keyName(q.keyPc) +
    ': ' +
    noteName(q.pc, 'en', pref) +
    ' is ' +
    degName(q.pc, q.keyPc, pref) +
    ' · ' +
    mdoName(q.pc, q.keyPc, pref);
  return { ok, txt: headline, subs: [explanation] };
}
function valueVerdict(q: Q<'rvalue'>, ok: boolean): Verdict {
  const name = q.rest ? restName(q.u) : rvalDef(q.u).n;
  const explanation = name + ' · ' + beatsText(q.u) + ' in 4/4 · ' + plural(q.u, 'sixteenth');
  return { ok, txt: ok ? 'Correct' : beatsText(q.u), subs: [explanation] };
}
function barVerdict(q: Q<'rcount'> | Q<'rhear'> | Q<'rfill'>, ok: boolean): Verdict {
  let headline: string;
  if (ok) {
    headline = 'Correct';
  } else if (q.kind === 'rcount') {
    headline = barCounting(q.bar);
  } else if (q.kind === 'rfill') {
    headline = q.miss.r ? restName(q.miss.u) : rvalDef(q.miss.u).n;
  } else {
    headline = 'That was a different bar';
  }
  return { ok, txt: headline, subs: ['Count it: ' + barCounting(q.bar)] };
}
function tapVerdictText(q: Q<'rtap'>, ok: boolean): Verdict {
  const grade = q.grade || { got: 0, n: 0, extra: 0, mean: 0 };
  let headline: string;
  if (q.newBest) {
    headline = 'New best — ' + q.playedAt + ' bpm';
  } else if (q.tv === 'clean') {
    headline = 'Tight';
  } else if (q.tv === 'sloppy') {
    headline = 'All there, a little loose';
  } else if (grade.got < grade.n) {
    headline = grade.n - grade.got + ' missed';
  } else {
    headline = plural(grade.extra, 'extra tap');
  }
  const averageOffMs = Math.round(grade.mean * 1000);
  const subs = [
    q.playedAt +
      ' bpm · ' +
      grade.got +
      ' of ' +
      grade.n +
      ' landed' +
      (grade.extra ? ', ' + grade.extra + ' extra' : '') +
      (grade.got ? ' · average ' + averageOffMs + ' ms off' : ''),
  ];
  if (q.nextBpm && q.nextBpm !== q.playedAt) {
    subs.push(
      q.nextBpm > q.playedAt!
        ? 'Nudging up to ' + q.nextBpm + ' bpm — press − if that is too much.'
        : 'Easing back to ' + q.nextBpm + ' bpm. Tempo you can hold beats tempo you can survive.',
    );
  }
  return { ok, txt: headline, subs };
}
function intervalVerdict(
  q: Q<'ivhear'> | Q<'ivsee'> | Q<'singit'> | Q<'ivbuild'>,
  state: DrillState,
): Verdict {
  const ok = state.ok;
  const interval = ivDef(q.semis);
  let headline: string;
  if (ok) {
    headline = 'Correct';
  } else if (q.kind === 'ivbuild') {
    const fretsUp = state.wrongCell ? state.wrongCell.f - q.base.f : 0;
    const whatYouTapped =
      fretsUp < 0 ? 'That is below the root' : 'That is ' + plural(fretsUp, 'fret');
    headline = whatYouTapped + ' — ' + anA(interval.n.toLowerCase()) + ' is ' + q.semis;
  } else {
    headline = interval.n;
  }
  return { ok, txt: headline, subs: [interval.n + ' · ' + q.semis + ' semitones · ' + interval.c] };
}
function scaleHeadline(q: Question & { sid: string }, ok: boolean): string {
  switch (q.kind) {
    case 'scbuild':
      return ok
        ? 'Clean run'
        : 'Finished with ' + q.misses + ' wrong ' + (q.misses === 1 ? 'tap' : 'taps');
    case 'scwrong':
      return ok ? 'Correct' : 'The moved note was the ' + degPretty(q.shape.pos[q.bad].deg.deg);
    case 'scplay':
      return ok ? 'Marked clean' : 'Marked missed';
    case 'scwrite': {
      const rightStaff = q.sopts.findIndex((staff) => staff.ok); // exactly one is right
      return ok ? 'Correct' : 'It was staff ' + (rightStaff + 1);
    }
    default:
      if (ok) {
        return 'Correct';
      }
      return 'choices' in q ? q.choices.filter((choice) => choice.ok)[0].t : '';
  }
}
/** The plain note questions: naming, finding and playing a note. */
function noteVerdict(q: Question, state: DrillState, pref: Pref): Verdict {
  const ok = state.ok;
  let headline: string;
  if (ok) {
    headline = state.octaveOff ? 'Right note, different octave' : 'Correct';
  } else if (q.kind === 'name2fb') {
    /* Skipping leaves no tapped cell, and this line used to read it blind and
       throw, which took the whole answer panel down with it. */
    headline = state.wrongCell
      ? 'That was ' +
        bothNames(pcAtCell(state.wrongCell), pref) +
        ' — the answer is fret ' +
        q.pos.f
      : 'Fret ' + q.pos.f + ' on the ' + STRINGS[q.pos.s].n + ' string';
  } else if (q.kind === 'play' && state.played != null) {
    headline =
      'Heard ' + bothNames(pcOf(state.played), pref) + ' — wanted ' + bothNames(q.pc, pref);
  } else {
    headline = bothNames((q as { pc: number }).pc, pref);
  }
  const subs: string[] = [];
  if (q.kind === 'play' && q.sys !== 'staff' && !ok) {
    const where = placesFor(q.pc)
      .slice(0, 3)
      .map((pos) => STRINGS[pos.s].n + ' ' + pos.f)
      .join(', ');
    if (where) {
      subs.push('Try: ' + where);
    }
  }
  if (state.requeued) {
    subs.push('Back again later in this session.');
  }
  return { ok, txt: headline, subs };
}

/** What the answer panel says for a question once it is answered. */
export function verdictOf(q: Question, state: DrillState): Verdict {
  const ok = state.ok;
  const pref = honmoon.settings.pref;
  switch (q.kind) {
    case 'mdo':
    case 'deg2fb':
    case 'singdeg':
      return degreeVerdict(q, state, pref);
    case 'rvalue':
      return valueVerdict(q, ok);
    case 'rcount':
    case 'rhear':
    case 'rfill':
      return barVerdict(q, ok);
    case 'rtap':
      return tapVerdictText(q, ok);
    case 'ivhear':
    case 'ivsee':
    case 'singit':
    case 'ivbuild':
      return intervalVerdict(q, state);
    case 'chhear': {
      const chord = chDef(q.cid);
      const intervals = chord.iv.map((semis) => ivDef(semis).ab).join(' ');
      return {
        ok,
        txt: ok ? 'Correct' : chord.n,
        subs: [chord.n + ' · ' + intervals + ' from the root'],
      };
    }
    case 'earscale': {
      const scale = scaleDef(q.sid);
      const degrees = scale.dg.map(degPretty).join(' ');
      return {
        ok,
        txt: ok ? 'Correct' : scale.n,
        subs: [scale.n + ' · ' + degrees + ' · ' + scale.d],
      };
    }
    case 'staffkey': {
      let headline: string;
      if (ok) {
        headline = 'Correct';
      } else if (state.wrongKey != null) {
        headline = 'That was ' + noteName(pcOf(state.wrongKey), 'en', pref);
      } else {
        headline = noteName(q.pc, 'en', pref);
      }
      return { ok, txt: headline, subs: [bothNames(q.pc, pref)] };
    }
  }
  if (q.kind.startsWith('sc') && 'sid' in q) {
    const notes = scaleNotes(q.sid, q.root).map(noteText).join(' ');
    return { ok, txt: scaleHeadline(q, ok), subs: [scaleName(q.sid, q.root) + ' · ' + notes] };
  }
  return noteVerdict(q, state, pref);
}
