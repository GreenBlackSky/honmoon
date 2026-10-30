import type { Sys } from '../store/types';
import type { IconName } from '../notation/icons';
import type { RhythmKind } from '../music/rhythm';
import { mdoOn } from '../music/notes';
import { enabledScales } from '../music/scales';

/** How a drill asks its question. Several drills share a kind and differ only
    in a parameter — C → Do and Do → C are both 'translate'. */
export type DrillKind =
  | 'fb2name'
  | 'name2fb'
  | 'staff2name'
  | 'staffkey'
  | 'translate'
  | 'play'
  | 'ear'
  | 'earscale'
  | 'mdo'
  | 'rhythm'
  | 'scale';

export interface DrillDef {
  id: string;
  /** the family it belonged to in Fretboard Fluency; apps may regroup */
  g: string;
  /** name, as listed */
  nm: string;
  /** one-line description under the name */
  sb: string;
  kind: DrillKind;
  /** the naming system the answer is in, or 'staff' when read off a staff */
  sys?: Sys | 'staff';
  /** needs the bass in your hands */
  bass?: boolean;
  /** only offered when this returns true (e.g. movable do switched on) */
  need?: () => boolean;
  /** a short explanation shown under the question until hints are off */
  how?: string;
  ic: IconName;
  /* movable-do drills: what is asked for, and what it is asked from */
  mode?: 'solf' | 'deg' | 'sing';
  from?: 'staff' | 'name' | 'syll' | 'fb' | 'sing';
  /* rhythm drills: which kind of rhythm card */
  rk?: RhythmKind;
}

/* Each drill names one direction outright, so nothing depends on a global
   notation setting — C → Do and Do → C are separate exercises, not one
   exercise with a switch that can quietly turn it into C → C.
   The order matters: when a card fits several drills, one is drawn at random
   by its position in this list, so reordering changes which drills sessions
   pick (it matched the original app's order when ported). */
export const DRILLS: DrillDef[] = [
  {
    id: 'fb2en',
    g: 'neck',
    nm: 'Fret → C',
    sb: 'A fret is marked. Name it in letters.',
    kind: 'fb2name',
    sys: 'en',
    ic: 'dot',
  },
  {
    id: 'fb2solf',
    g: 'neck',
    nm: 'Fret → Do',
    sb: 'A fret is marked. Name it in solfège.',
    kind: 'fb2name',
    sys: 'solf',
    ic: 'dot',
  },
  {
    id: 'en2fb',
    g: 'neck',
    nm: 'C → Fret',
    sb: 'Letter name. Find it on a given string.',
    kind: 'name2fb',
    sys: 'en',
    ic: 'target',
  },
  {
    id: 'solf2fb',
    g: 'neck',
    nm: 'Do → Fret',
    sb: 'Solfège name. Find it on a given string.',
    kind: 'name2fb',
    sys: 'solf',
    ic: 'target',
  },
  {
    id: 'st2en',
    g: 'read',
    nm: 'Staff → C',
    sb: 'Read the note, answer in letters.',
    kind: 'staff2name',
    sys: 'en',
    ic: 'staff',
  },
  {
    id: 'st2solf',
    g: 'read',
    nm: 'Staff → Do',
    sb: 'Read the note, answer in solfège.',
    kind: 'staff2name',
    sys: 'solf',
    ic: 'staff',
  },
  {
    id: 'en2solf',
    g: 'names',
    nm: 'C → Do',
    sb: 'Letters into solfège.',
    kind: 'translate',
    sys: 'solf',
    ic: 'swap',
  },
  {
    id: 'solf2en',
    g: 'names',
    nm: 'Do → C',
    sb: 'Solfège into letters.',
    kind: 'translate',
    sys: 'en',
    ic: 'swap',
  },
  {
    id: 'st2play',
    g: 'read',
    nm: 'Staff → play',
    sb: 'Read it, then play it on the bass.',
    kind: 'play',
    bass: true,
    sys: 'staff',
    ic: 'wave',
  },
  /* The same reading question answered on a keyboard instead of by name:
     one note, one key, nothing to eliminate and nothing to guess from. */
  {
    id: 'st2key',
    g: 'read',
    nm: 'Staff → key',
    sb: 'Read the note and find it on a keyboard.',
    kind: 'staffkey',
    ic: 'dot',
    how: 'The staff and a keyboard are the same picture stood on end: step up a line or a space and you step to the next white key. Work out the letter, then find it. Which octave you pick does not matter — the board shows one, and any C is a C.',
  },
  {
    id: 'en2play',
    g: 'neck',
    nm: 'C → play',
    sb: 'See a letter name, play that note.',
    kind: 'play',
    bass: true,
    sys: 'en',
    ic: 'wave',
  },
  {
    id: 'solf2play',
    g: 'neck',
    nm: 'Do → play',
    sb: 'See a solfège name, play that note.',
    kind: 'play',
    bass: true,
    sys: 'solf',
    ic: 'wave',
  },
  {
    id: 'ivhear',
    g: 'ear',
    nm: 'Hear the interval',
    sb: 'Two notes played. How far apart?',
    kind: 'ear',
    ic: 'wave',
  },
  {
    id: 'ivsee',
    g: 'ear',
    nm: 'See the interval',
    sb: 'Two dots on the neck. Name the gap.',
    kind: 'ear',
    ic: 'dot',
  },
  {
    id: 'ivbuild',
    g: 'ear',
    nm: 'Build the interval',
    sb: 'A fifth above this note — find it.',
    kind: 'ear',
    ic: 'target',
  },
  {
    id: 'chhear',
    g: 'ear',
    nm: 'Hear the chord',
    sb: 'Major, minor, or something else?',
    kind: 'ear',
    ic: 'swap',
  },
  /* Naming a scale by ear is a different skill from naming its notes: you are
     listening for where the half steps fall, not counting them. Which scales
     turn up is whatever you have switched on in Scales, so the two stay in
     step. */
  {
    id: 'scalehear',
    g: 'ear',
    nm: 'Hear the scale',
    sb: 'A scale is played. Which one was it?',
    kind: 'earscale',
    ic: 'wave',
    need: () => enabledScales().length >= 2,
    how: 'The scale runs up from its root to the octave. Do not try to name the notes — you are not told the key and it does not matter. Listen for the shape: how many notes there are, whether the third sounds bright or dark, and whether the seventh leans into the octave or sits a whole step below it. The scales offered are the ones you have switched on over in Scales.',
  },
  {
    id: 'singit',
    g: 'voice',
    nm: 'Sing the interval',
    sb: 'It gives you a note. You sing the next.',
    kind: 'ear',
    ic: 'wave',
  },
  /* Movable do and degrees stay switched off until you turn them on in Setup:
     they are a second way of hearing the same notes, and learning both at
     once is how people end up confident in neither. */
  {
    id: 'st2mdo',
    g: 'names',
    nm: 'Staff → movable do',
    sb: 'A key is given. Read the note as a syllable in that key.',
    kind: 'mdo',
    mode: 'solf',
    from: 'staff',
    ic: 'staff',
    need: mdoOn,
    how: 'In movable do the syllables belong to the <b>key</b>, not to the letters. Do is whatever note the key is built on — in C that is C, in G it is G — and the rest follow up the scale from there. That is what lets one tune keep the same syllables in every key.',
  },
  {
    id: 'en2mdo',
    g: 'names',
    nm: 'C → movable do',
    sb: 'A key is given. Which syllable is that note?',
    kind: 'mdo',
    mode: 'solf',
    from: 'name',
    ic: 'swap',
    need: mdoOn,
    how: "Find the key's Do first, then count up the scale to the note you were given: Do Re Mi Fa Sol La Ti. The chromatic notes in between raise to Di Ri Fi Si Li, or lower to Te Le Se Me Ra.",
  },
  {
    id: 'mdo2en',
    g: 'names',
    nm: 'Movable do → C',
    sb: 'A key is given. Which note is that syllable?',
    kind: 'mdo',
    mode: 'solf',
    from: 'syll',
    ic: 'swap',
    need: mdoOn,
    how: "The same trip backwards: start at the key's Do and count up the scale until you reach the syllable, then name the note you landed on.",
  },
  {
    id: 'en2deg',
    g: 'names',
    nm: 'C → degree',
    sb: 'A key is given. Which degree of it is that note?',
    kind: 'mdo',
    mode: 'deg',
    from: 'name',
    ic: 'target',
    need: mdoOn,
    how: "A scale degree is just the syllable written as a number: the key's home note is 1, the next step up is 2, and so on to 7. It is the same idea as movable do with the singing taken out, and it is how chords and progressions get talked about.",
  },
  {
    id: 'deg2en',
    g: 'names',
    nm: 'Degree → C',
    sb: 'A key is given. Which note is the ♭6 of it?',
    kind: 'mdo',
    mode: 'deg',
    from: 'syll',
    ic: 'target',
    need: mdoOn,
    how: "Count up the scale from the key's home note. A flat in front lowers that degree by a fret, a sharp raises it.",
  },
  {
    id: 'deg2fb',
    g: 'names',
    nm: 'Degree → fret',
    sb: 'A key is given. Find that degree on the neck.',
    kind: 'mdo',
    mode: 'deg',
    from: 'fb',
    ic: 'dot',
    need: mdoOn,
    how: 'Work out which note the degree names, then play it anywhere — any string, any octave. The question is the degree, not the fret.',
  },
  {
    id: 'singdeg',
    g: 'voice',
    nm: 'Sing the degree',
    sb: 'It plays the key, then names a degree. You sing it.',
    kind: 'mdo',
    mode: 'sing',
    from: 'sing',
    ic: 'wave',
    need: mdoOn,
    how: 'Play the key first and let your ear settle on home, then find the degree from there rather than from any particular pitch. Being able to do that is what makes a written line singable without hunting for a starting note.',
  },
  /* Rhythm: values first, then counting, then the bar, then tapping it. */
  {
    id: 'rvalue',
    g: 'read',
    nm: 'Note values',
    sb: 'How long is this note or rest?',
    kind: 'rhythm',
    rk: 'value',
    ic: 'book',
    how: 'A value is how long a note lasts, measured in beats. Counting in 4/4, a quarter note is one beat, a half note two, a whole note four, and an eighth half a beat. A dot after the note adds half of it again. A rest is the same length of time, deliberately not played.',
  },
  {
    id: 'rcount',
    g: 'read',
    nm: 'Count the bar',
    sb: 'Read a bar and pick the counting that says it out loud.',
    kind: 'rhythm',
    rk: 'count',
    ic: 'book',
    how: 'Counting is how you say a rhythm out loud, so your hands have something to follow. Every beat gets its number. Halfway through a beat is <b>&amp;</b> (“and”), and the quarter-points are <b>e</b> and <b>a</b> — so a beat made of four sixteenths is said <i>1 e &amp; a</i>, and two eighths are <i>1 &amp;</i>.<br><br>Each answer writes out the whole bar in order, one slot per step: a syllable where a note starts, a <b>·</b> where nothing does. Count the written bar out loud, then find the line that says the same thing.',
  },
  {
    id: 'rfill',
    g: 'read',
    nm: 'Complete the bar',
    sb: 'One value is missing. Which one fits?',
    kind: 'rhythm',
    rk: 'fill',
    ic: 'target',
    how: 'A bar holds exactly what its time signature promises and not a fraction more: 4/4 is four beats, 3/4 is three. Add up what is written, take it from the total, and the gap is the missing value.',
  },
  {
    id: 'rhear',
    g: 'read',
    nm: 'Hear the rhythm',
    sb: 'A rhythm is played. Which bar was it?',
    kind: 'rhythm',
    rk: 'hear',
    ic: 'wave',
    how: 'Four clicks count you in, then the rhythm plays over the beat. Listen for which notes land on a beat and which fall between, then find the bar that puts them there.',
  },
  {
    id: 'rtap',
    g: 'read',
    nm: 'Tap the rhythm',
    sb: 'Read the bar and tap it with the click.',
    kind: 'rhythm',
    rk: 'tap',
    ic: 'wave',
    how: 'Read the bar first and count it through in your head. Four clicks count you in, then the beats keep going and you tap the rhythm on the pad. Each tap is matched to the note it was aiming for, and anything within about a sixth of a beat counts as on time. Miss and it eases the tempo back; land it cleanly and it nudges the tempo up.',
  },
];

/* ---------------- scale drills ---------------- */
export const SDRILLS: DrillDef[] = [
  {
    id: 'scbuild',
    g: 'scale',
    kind: 'scale',
    nm: 'Build it',
    sb: 'Tap the scale in order on the neck.',
    bass: false,
    ic: 'target',
  },
  {
    id: 'scdeg',
    g: 'scale',
    kind: 'scale',
    nm: 'Degrees',
    sb: 'Which note is the ♭3? Which degree is this?',
    bass: false,
    ic: 'swap',
  },
  {
    id: 'scwrong',
    g: 'scale',
    kind: 'scale',
    nm: 'Wrong note',
    sb: 'One note has moved a fret. Find it.',
    bass: false,
    ic: 'dot',
  },
  {
    id: 'scname',
    g: 'scale',
    kind: 'scale',
    nm: 'Name it',
    sb: 'Given the shape, which scale is it?',
    bass: false,
    ic: 'dot',
  },
  /* Four reading-and-recipe drills: the same scale met as notes on a staff and
     as a pattern of distances, both ways round. None of them needs the bass. */
  {
    id: 'scstaff',
    g: 'scale',
    kind: 'scale',
    nm: 'Staff → scale',
    sb: 'A scale is written out. Which one is it?',
    bass: false,
    ic: 'staff',
    how: 'Read the notes up from the root, then compare them with the major scale on the same root. Every note that is a fret lower than major is a ♭ degree, and those tell you the scale: a ♭3 means minor-family, a ♭7 alone means Mixolydian, ♭3 with a plain 6 means Dorian. Count the notes first — five is a pentatonic.',
  },
  {
    id: 'scwrite',
    g: 'scale',
    kind: 'scale',
    nm: 'Scale → staff',
    sb: 'Which staff shows D Dorian?',
    bass: false,
    ic: 'staff',
    how: 'The options all start on the same note and usually differ by one or two accidentals. Work out the scale’s notes from its formula first — major, then flatten what the formula flattens — and look for the staff that has exactly those sharps and flats.',
  },
  {
    id: 'scsteps',
    g: 'scale',
    kind: 'scale',
    nm: 'Steps → scale',
    sb: 'Given its steps or its formula, name the scale.',
    bass: false,
    ic: 'book',
    how: '<b>Steps</b> are the gaps from each note to the next, in frets: major is 2 2 1 2 2 2 1. A <b>formula</b> is every note measured from the root instead: major is 1 2 3 4 5 6 7. Same scale, two ways of writing it. Look for where the 1s (half steps) fall, or which degrees carry a ♭.',
  },
  {
    id: 'screcipe',
    g: 'scale',
    kind: 'scale',
    nm: 'Scale → steps',
    sb: 'Pick the right step pattern or formula for a scale.',
    bass: false,
    ic: 'book',
    how: 'Build it from what you know. Start with major — steps 2 2 1 2 2 2 1, formula 1 2 3 4 5 6 7 — and change what the scale changes. Lowering a degree by one fret shortens the step into it by one and lengthens the step out of it by one, so the steps always still add up to 12.',
  },
  {
    id: 'scplay',
    g: 'scale',
    kind: 'scale',
    nm: 'Play it',
    sb: 'Play the scale, then mark yourself.',
    bass: true,
    ic: 'wave',
  },
];

export const ALL_DRILLS: DrillDef[] = DRILLS.concat(SDRILLS);

export function anyDrillDef(id: string): DrillDef | null {
  return ALL_DRILLS.find((drill) => drill.id === id) ?? null;
}
export function isScaleDrill(id: string): boolean {
  return SDRILLS.some((drill) => drill.id === id);
}
