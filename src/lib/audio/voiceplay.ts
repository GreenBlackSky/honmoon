import { ac } from './context';
import { piano, pianoChord, slidePath } from './synth';
import { vRange, type VoicePattern } from '../music/voice';

/* How a teacher does it: one note on its own so you know where you are, a
   breath of silence, then the pattern from that note. Sounding the chord
   underneath the pattern tells you the key but not the pitch you are about
   to sing, and by the time you have found it the first note has gone. So the
   chord moves into the cue, with the starting note clearly on top of it, and
   the pattern starts after the pause. */
/** The chord under the cue note is held this long, then a pause. */
const CUE_CHORD_S = 1.2;
const CUE_GAP_MIN_S = 0.38;
const CUE_GAP_MAX_S = 0.9;
/** Staccato notes sound for this share of their slot; legato nearly all of it. */
const STACCATO_SHARE = 0.35;
const LEGATO_SHARE = 0.95;

export function vCueLen(tempo: number): number {
  const beat = 60 / tempo;
  return CUE_CHORD_S + Math.max(CUE_GAP_MIN_S, Math.min(CUE_GAP_MAX_S, beat * 0.7));
}
/** Plays one run of a pattern from `root`, optionally with the cue first.
    Returns how long the cue, the pattern, and both together take. */
export function vPlayOnce(
  root: number,
  pat: VoicePattern,
  tempo: number,
  cue: boolean,
): { cue: number; pat: number; total: number } {
  const ctx = ac();
  if (!ctx) {
    return { cue: 0, pat: 0.8, total: 0.8 };
  }
  const beat = 60 / tempo;
  const start = ctx.currentTime + 0.06;
  let cueLength = 0;
  if (cue !== false) {
    cueLength = vCueLen(tempo);
    // a soft major chord an octave down, with the starting pitch clearly on top
    const chordRoot = root - 12;
    pianoChord([chordRoot, chordRoot + 4, chordRoot + 7], start, cueLength - 0.25, 0.26);
    piano(root, start + 0.03, cueLength - 0.25, 1);
  }
  const patternStart = start + cueLength;
  const noteLength = beat * pat.beats;
  let patternLength: number;
  if (pat.glide) {
    const top = Math.min(vRange().hi, root + pat.glide);
    slidePath([root, top, root], patternStart, noteLength);
    patternLength = noteLength;
  } else {
    const sounding = noteLength * (pat.staccato ? STACCATO_SHARE : LEGATO_SHARE);
    pat.iv!.forEach((semis, i) => {
      piano(root + semis, patternStart + i * noteLength, sounding, 0.9);
    });
    patternLength = pat.iv!.length * noteLength;
  }
  return { cue: cueLength, pat: patternLength, total: cueLength + patternLength };
}
