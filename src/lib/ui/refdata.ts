/* Generated from the original app: the vocabulary, the Learn index and the
   degree questions, word for word. */

export interface GlossSection {
  g: string;
  items: [string, string][];
}
/** Every term the drills use, one line each. Definitions may carry <b>/<i>. */
export const GLOSS: GlossSection[] = [
  {
    g: 'Notes and names',
    items: [
      [
        'Pitch',
        'How high or low a sound is. Two notes can be the same pitch and be played in completely different places on the neck.',
      ],
      [
        'Note',
        'A pitch with a name, and on paper a length as well. <b>A</b> is a note; so is the dot on the page that says to play it for one beat.',
      ],
      [
        'Natural',
        'One of the seven notes with a plain letter name: A B C D E F G. The white keys on a piano.',
      ],
      [
        'Sharp ♯',
        'A note one fret higher than the natural of the same letter. F♯ is one fret above F.',
      ],
      ['Flat ♭', 'A note one fret lower. G♭ is one fret below G.'],
      [
        'Accidental',
        'A sharp, a flat or a natural sign — anything that shifts a note off its plain letter. Switch <i>Sharps and flats</i> on in Setup and these join the drills.',
      ],
      [
        'Enharmonic',
        'Two names for the same pitch. F♯ and G♭ are the same fret; which name is right depends on the key you are in.',
      ],
      [
        'Octave',
        'The distance from a note to the next note of the same name, up or down. Twelve frets. They sound so alike that most people hear them as the same note.',
      ],
      [
        'Pitch class',
        'A note name with the octave thrown away. Every E on the bass is the same pitch class. Several drills ask for a pitch class, which is why any E counts.',
      ],
      [
        'Solfège',
        'Singing names for notes — Do Re Mi Fa Sol La Si. This app uses them as a second name for the letters unless you switch movable do on.',
      ],
      [
        'Fixed do',
        'Do is always C, in every key. A second label for a letter, and the app’s default.',
      ],
      [
        'Movable do',
        'Do is whichever note the key is built on, so the syllables describe the <i>role</i> a note plays rather than its pitch. Off by default; turn it on in Setup.',
      ],
    ],
  },
  {
    g: 'Distance',
    items: [
      [
        'Semitone / half step',
        'The smallest step in this system: one fret. B to C is a half step, and so is F to F♯.',
      ],
      ['Whole step', 'Two frets. Two half steps.'],
      [
        'Interval',
        'The distance between two notes, counted in semitones. A perfect fifth is seven. The distance is the same wherever you play it, which is why one shape works in every key.',
      ],
      [
        'Harmonic / melodic',
        'Two notes together is harmonic; one after the other is melodic. The ear drills use both.',
      ],
      [
        'Consonant / dissonant',
        'Roughly, whether two notes sound settled together or restless. The tritone — six semitones — is the classic restless one.',
      ],
    ],
  },
  {
    g: 'Scales and keys',
    items: [
      [
        'Scale',
        'A chosen set of notes, in order, starting from a root. The set is what gives music built on it its flavour.',
      ],
      [
        'Root',
        'The note a scale or chord is built from and named after. The root of A minor pentatonic is A.',
      ],
      [
        'Tonic',
        'The note a piece of music treats as home. In a key, the root and the tonic are the same note.',
      ],
      [
        'Key',
        'The scale a piece of music is living in, named after its tonic: <i>the key of G major</i>.',
      ],
      [
        'Step (of a scale)',
        'The gap between one note of a scale and the next, in frets. Major goes whole whole half whole whole whole half. The steps of any scale add up to twelve.',
      ],
      [
        'Degree',
        'Which note of the scale you are on, counting the root as 1. A ♭ in front means a semitone below where the major scale would put it, so ♭3 is the note that makes a chord minor.',
      ],
      [
        'Major / minor',
        'The two families most Western music lives in, and the difference is mostly the third degree: a bright major third, or a darker minor third one fret lower.',
      ],
      [
        'Mode',
        'A scale built from the same notes as another but treating a different note as home. Dorian is the major scale starting from its second degree, and sounds nothing like it.',
      ],
      [
        'Pentatonic',
        'A five-note scale. Leaving two notes out leaves bigger gaps and no half steps, which is why it is so hard to play a wrong note with one.',
      ],
      ['Chord', 'Three or more notes sounding together.'],
      ['Triad', 'A three-note chord: root, third, fifth. Major or minor depending on that third.'],
      [
        'Arpeggio',
        'A chord played one note at a time instead of all at once. What a bass line usually is.',
      ],
    ],
  },
  {
    g: 'On the page',
    items: [
      [
        'Staff',
        'The five lines notes are written on. Higher on the staff means higher in pitch — that is all the vertical direction means.',
      ],
      [
        'Clef',
        'The sign at the start of the staff that says which pitches the lines stand for. Bass clef is the one you need; the others are here for when you meet them.',
      ],
      [
        'Ledger line',
        'A short extra line above or below the staff, for notes that run off the end of it.',
      ],
      [
        'Notehead, stem',
        'The oval that says which pitch, and the line off it that helps say how long. A filled head with a stem is a quarter note; a hollow one is a half.',
      ],
      [
        'Written pitch',
        'Bass is written an octave above where it sounds, so the page stays readable without a forest of ledger lines. Your frets and your ears agree; only the paper is transposed.',
      ],
      [
        'Landmark',
        'A note whose position on the staff you know instantly, used to find its neighbours by counting from it rather than from the bottom line every time.',
      ],
    ],
  },
  {
    g: 'Time',
    items: [
      ['Beat', 'The pulse you tap your foot to.'],
      [
        'Tempo',
        'How fast the beats go, in <b>bpm</b> — beats per minute. 60 bpm is one beat a second.',
      ],
      [
        'Bar (measure)',
        'A group of beats, marked off by vertical lines. A bar holds exactly what its time signature promises, no more.',
      ],
      [
        'Time signature',
        'The two stacked numbers at the start. The top is how many beats are in a bar; the bottom says which note value gets one beat. 4 on the bottom means a quarter note.',
      ],
      [
        'Note value',
        'How long a note lasts, in beats: whole, half, quarter, eighth, sixteenth, each half the one before.',
      ],
      [
        'Rest',
        'A silence of a written length. Music, not a gap — reading them accurately is what keeps a line from turning to mush.',
      ],
      [
        'Dot',
        'A dot after a note adds half of it again. A dotted quarter is a beat and a half, and is where most syncopation starts.',
      ],
      [
        'Tie',
        'A curve joining two noteheads: play the first, hold through the second. One sound, both lengths.',
      ],
      [
        'Beam',
        'The thick line joining short notes into groups of one beat. Not decoration — it draws the beat for you.',
      ],
      [
        'Subdivision',
        'The smaller units inside a beat. Counted out loud, four sixteenths are <i>1 e &amp; a</i> and two eighths are <i>1 &amp;</i>.',
      ],
      [
        'Syncopation',
        'Notes landing off the beat rather than on it. What makes a line push or groove instead of march.',
      ],
      ['Count-in', 'The clicks before a bar starts, so you know where beat one is.'],
    ],
  },
  {
    g: 'On the bass',
    items: [
      ['Open string', 'A string played without pressing a fret. Yours are E A D G, low to high.'],
      [
        'Fret',
        'One of the metal bars, and by extension the space behind it. One fret is one semitone.',
      ],
      [
        'Position',
        'Where your hand sits on the neck — which fret your first finger is covering. Most of a line is played without moving it.',
      ],
      [
        'Shape',
        'A pattern of fingers that keeps its meaning wherever you slide it, because every fret is the same distance. The one real advantage a fretted instrument has over a piano.',
      ],
      [
        'Fundamental',
        'The lowest and loudest frequency in a played note, and the one that gives it its pitch. The listening drills are hunting for this, which is why rolling the tone knob back helps.',
      ],
    ],
  },
  {
    g: 'Voice',
    items: [
      [
        'Range',
        'The span from the lowest note you can sing to the highest. Everything this app asks you to sing is moved to sit inside yours.',
      ],
      [
        'Register',
        'A part of your range that feels like one mechanism — chest low down, head high up. The joins between them are what warm-ups smooth out.',
      ],
      ['Onset', 'How a note starts. A clean onset begins without a push of air or a click.'],
      [
        'Semi-occluded',
        'Singing through a partly closed mouth — a lip trill, a hum, a straw. It balances the pressure across the vocal folds, and is the safest thing to do to a cold voice.',
      ],
      [
        'Vocal fry',
        'The low, creaky rattle at the very bottom of your voice. Used gently, it wakes the folds up without effort.',
      ],
      [
        'Siren',
        'A slow slide from low to high and back, on one sound. Finds the joins between registers and smooths them.',
      ],
    ],
  },
  {
    g: 'Words this app uses',
    items: [
      [
        'Card',
        'One thing you can be asked about — a fret, a note on the staff, an interval, a scale in a key. Your progress is kept per card.',
      ],
      [
        'Solid',
        'A card you have answered correctly enough times in a row that it has dropped out of rotation for now. Five in a row, and a wrong answer knocks it back two.',
      ],
      [
        'Spaced repetition',
        'Asking you about the things you are worst at, more often, and leaving alone the things you know. It is why ten minutes most days beats an hour on Sunday.',
      ],
      [
        'Session',
        'A run of cards drawn from every family you have left switched on. Miss one and it comes back later in the same session.',
      ],
      [
        'Family',
        'One of the six groups of drills on the Practice screen — the neck, reading, names, ear, voice, scales.',
      ],
      [
        'Range (setting)',
        'How far up the neck the drills go. Separate from <i>Sharps and flats</i>, which decides whether the black notes are in at all.',
      ],
    ],
  },
];

/** The references, in the order the Learn tab lists them. */
export const LEARN: { go: string; n: string; sb: string }[] = [
  {
    go: 'ref',
    n: 'The staff, note by note',
    sb: 'Every note in order, what it is called, and where it sits on the neck. Lines, spaces, landmarks, and any clef you have switched on.',
  },
  {
    go: 'rref',
    n: 'How rhythm is written',
    sb: 'Note values, dots, ties and rests; bars and time signatures; and how to count a bar out loud so your hands can follow.',
  },
  {
    go: 'ivref',
    n: 'What an interval is',
    sb: 'All twelve gaps, what each one sounds like, and why one shape works in every key.',
  },
  {
    go: 'sx',
    n: 'Scale explorer',
    sb: 'Any scale in any key: the notes, the degrees and the shape on the neck, with nothing being asked of you.',
  },
  {
    go: 'degref',
    n: 'Reading scale degrees',
    sb: 'What 1, ♭3 and ♯4 mean, how to read a scale’s formula, and where each degree sits under your hand. Five short pages, with pictures.',
  },
  {
    go: 'gloss',
    n: 'Vocabulary',
    sb: 'Every term the drills use at you — tonic, degree, subdivision, semi-occluded — defined in one line each, searchable.',
  },
];

/** Try-it questions on the last degrees page: question (may carry <b>), answer, why. */
export const DEGQ: [string, string, string][] = [
  [
    'In G major, what is the <b>5</b>?',
    'D',
    'Count G A B C D — the fifth letter. Or seven frets up from G.',
  ],
  ['In D major, what is the <b>3</b>?', 'F♯', 'D E F♯. Four frets up from D.'],
  ['In A minor, what is the <b>♭3</b>?', 'C', 'A major’s 3 is C♯; a fret lower is C.'],
  [
    'In E minor, what is the <b>♭6</b>?',
    'C',
    'E major has C♯ there; minor lowers it. A flat degree, a natural note.',
  ],
  [
    'In F major, what is the <b>4</b>?',
    'B♭',
    'A flat note, but a plain degree — it is where major puts the 4 in F.',
  ],
  ['In C, which degree is <b>F</b>?', '4', 'C D E F — fourth letter, five frets up.'],
  [
    'In A, which degree is <b>G</b>?',
    '♭7',
    'A major’s 7 is G♯. G is a fret lower, so ♭7. The note that gives A7 its bite.',
  ],
  [
    'On the neck: root on the E string, fret 5. Where is the <b>5</b>?',
    'A string, fret 7',
    'Same shape from any root: one string up, two frets along.',
  ],
  [
    'Minor pentatonic is 1 ♭3 4 5 ♭7. In E, what are its notes?',
    'E G A B D',
    'E major would be E G♯ A B D♯; lower the 3 and 7.',
  ],
];

export const DEGTABS = ['The idea', 'Flats and sharps', 'Scale formulas', 'On the neck', 'Try it'];
