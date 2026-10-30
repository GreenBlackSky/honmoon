import { ac, acIfAny, audioGate } from './context';
import { honmoon } from '../store/honmoon.svelte';
import { freqOfSounding } from '../music/notes';
import { STRINGS } from '../music/bass';
import { scaleDef, scaleShape } from '../music/scales';
import type { TimeSig } from '../music/rhythm';

/** Exponential ramps cannot start from or reach zero; this is "silent". */
const SILENT = 0.0001;
/** After a sound ends, how long its tail still reaches the microphone. */
const TAIL_S = 0.3;

/** Keep the pitch detector deaf until this sound has died away. */
function muteMicUntil(ctx: AudioContext, start: number, length: number): void {
  audioGate.muteUntil = Math.max(
    audioGate.muteUntil,
    Date.now() + (start - ctx.currentTime + length + TAIL_S) * 1000,
  );
}

/* ---------------- bass pluck ---------------- */
const PLUCK_LENGTH_S = 1.25;
/** A plucked bass note at a sounding pitch. */
export function pluck(soundingMidi: number): void {
  if (!honmoon.settings.sound || !isFinite(soundingMidi)) {
    return;
  }
  const ctx = ac();
  if (!ctx) {
    return;
  }
  const freq = freqOfSounding(soundingMidi);
  const now = ctx.currentTime;
  const length = PLUCK_LENGTH_S;
  audioGate.muteUntil = Date.now() + (length + 0.35) * 1000;
  // the string: a triangle wave, and a quieter, shorter octave above it
  const body = ctx.createOscillator();
  body.type = 'triangle';
  body.frequency.value = freq;
  const octave = ctx.createOscillator();
  octave.type = 'sine';
  octave.frequency.value = freq * 2;
  const bodyGain = ctx.createGain();
  const octaveGain = ctx.createGain();
  // the tone darkens as the note decays
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(Math.min(freq * 10, 6000), now);
  lowpass.frequency.exponentialRampToValueAtTime(Math.max(freq * 2, 110), now + length);
  bodyGain.gain.setValueAtTime(SILENT, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.32, now + 0.01);
  bodyGain.gain.exponentialRampToValueAtTime(SILENT, now + length);
  octaveGain.gain.setValueAtTime(SILENT, now);
  octaveGain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
  octaveGain.gain.exponentialRampToValueAtTime(SILENT, now + length * 0.55);
  body.connect(bodyGain);
  octave.connect(octaveGain);
  bodyGain.connect(lowpass);
  octaveGain.connect(lowpass);
  lowpass.connect(ctx.destination);
  body.start(now);
  octave.start(now);
  body.stop(now + length + 0.1);
  octave.stop(now + length + 0.1);
}

/* ---------------- piano ----------------
   A struck string decays towards silence at its own rate rather than being
   ramped to zero on a deadline, so the envelope is setTargetAtTime with a
   time constant. Low notes ring far longer than high ones, and the upper
   partials fade first, which is what makes a piano mellow as it sustains.
   `dur` is how long the key is held down: at the end the damper lands. */

/** How long a note at this pitch takes to fade: ~6 s at A2, halving every
    26 semitones up, kept between 1.2 and 9 seconds. */
function pianoTau(midi: number): number {
  return Math.max(1.2, Math.min(9, 6.2 * Math.pow(0.5, (midi - 45) / 26)));
}
/** Each partial: harmonic number, slight sharpening (a real string's
    inharmonicity), and loudness relative to the fundamental. */
const PIANO_PARTIALS = [
  [1, 1.0, 1],
  [2, 1.0013, 0.34],
  [3, 1.0035, 0.13],
  [4, 1.007, 0.055],
  [5, 1.011, 0.025],
  [6, 1.016, 0.012],
] as const;
const PIANO_LOUDNESS = 0.23;
/** Partials above this would only alias. */
const HIGHEST_PARTIAL_HZ = 15500;
const DAMPER_TAU = 0.06;

export interface PianoNote {
  damp(): void;
}
export function piano(
  soundingMidi: number,
  when?: number | null,
  dur?: number,
  vel?: number | null,
): PianoNote | null {
  const ctx = ac();
  if (!ctx || !isFinite(soundingMidi)) {
    return null;
  }
  const start = when == null ? ctx.currentTime + 0.02 : when;
  const freq = freqOfSounding(soundingMidi);
  const held = dur || 1.6;
  const velocity = vel == null ? 1 : vel;
  if (freq < 20 || freq > 4500) {
    return null;
  }
  const tau = pianoTau(soundingMidi);
  const out = ctx.createGain();
  out.gain.value = 1;
  out.connect(ctx.destination);
  const gains: GainNode[] = [];
  const oscillators: OscillatorNode[] = [];
  for (const [harmonic, stretch, relative] of PIANO_PARTIALS) {
    if (freq * harmonic > HIGHEST_PARTIAL_HZ) {
      continue;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * harmonic * stretch, start);
    const level = PIANO_LOUDNESS * velocity * relative;
    // higher partials fade faster
    const partialTau = tau / (1 + 0.6 * (harmonic - 1));
    gain.gain.setValueAtTime(SILENT, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), start + 0.005);
    gain.gain.setTargetAtTime(0, start + 0.006, partialTau);
    gain.gain.setTargetAtTime(0, start + held, DAMPER_TAU);
    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + held + 0.5);
    gains.push(gain);
    oscillators.push(osc);
  }
  muteMicUntil(ctx, start, Math.min(held, 4));
  return {
    damp() {
      const now = ctx.currentTime;
      gains.forEach((gain) => {
        try {
          if (gain.gain.cancelAndHoldAtTime) {
            gain.gain.cancelAndHoldAtTime(now);
          } else {
            const current = gain.gain.value;
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(current, now);
          }
          gain.gain.setTargetAtTime(0, now, DAMPER_TAU);
        } catch {
          /* already stopped */
        }
      });
      setTimeout(
        () =>
          oscillators.forEach((osc) => {
            try {
              osc.stop();
            } catch {
              /* already stopped */
            }
          }),
        500,
      );
    },
  };
}
/** The notes of a chord, a hair apart, like fingers landing. */
const CHORD_SPREAD_S = 0.012;
export function pianoChord(
  midis: number[],
  when?: number | null,
  dur?: number,
  vel?: number | null,
): void {
  midis.forEach((midi, i) => {
    piano(midi, when == null ? null : when + i * CHORD_SPREAD_S, dur, vel == null ? 0.7 : vel);
  });
}

/* One held note, pedal down, until it is stopped. */
const HELD_NOTE_S = 16;
const HOLD: { h: PianoNote | null; midi: number | null } = { h: null, midi: null };
export function holdStop(): void {
  if (HOLD.h) {
    try {
      HOLD.h.damp();
    } catch {
      /* gone */
    }
  }
  HOLD.h = null;
  HOLD.midi = null;
}
export function holdNote(midi: number): void {
  holdStop();
  HOLD.h = piano(midi, null, HELD_NOTE_S, 1);
  HOLD.midi = midi;
}

/* ---------------- the siren ----------------
   A raw sawtooth swept through a fixed filter is a machine, not a singer: the
   harmonics all rise together and nothing about it breathes. A voice on "ng"
   is a handful of partials falling away steeply, two soft resonances that stay
   put while the pitch moves under them, and a vibrato that arrives after the
   note has settled rather than being switched on with it. That is what this
   builds, and why it is one oscillator over a path of waypoints instead of two
   separate slides butted together — a siren does not re-attack at the top. */
let voiceWaveCache: PeriodicWave | null = null;
/** Amplitude of each harmonic of the voice tone, falling away steeply. */
const VOICE_HARMONICS = [0, 1, 0.52, 0.3, 0.16, 0.085, 0.045, 0.024, 0.012, 0.006];
function voiceWave(ctx: AudioContext): PeriodicWave {
  if (voiceWaveCache) {
    return voiceWaveCache;
  }
  const real = new Float32Array(VOICE_HARMONICS.length);
  const imaginary = Float32Array.from(VOICE_HARMONICS);
  voiceWaveCache = ctx.createPeriodicWave(real, imaginary, { disableNormalization: false });
  return voiceWaveCache;
}
const VIBRATO_HZ = 5.1;
const VIBRATO_CENTS = 13;
/** The two resonances of an "ng"/"ah"-like voice, held still. */
const FORMANTS = [
  { hz: 430, q: 1.1, gain: 1 },
  { hz: 1180, q: 1.5, gain: 0.45 },
];
const SIREN_PEAK = 0.15;

/** A voice sliding smoothly through the given notes, `dur` seconds in all. */
export function slidePath(midis: number[], when: number | null, dur: number): void {
  const ctx = ac();
  if (!ctx || !midis || midis.length < 2) {
    return;
  }
  const start = when == null ? ctx.currentTime + 0.02 : when;
  const legLength = dur / (midis.length - 1);
  const freqs = midis.map(freqOfSounding);
  if (!freqs.every((freq) => freq > 20 && freq < 4000)) {
    return;
  }

  const osc = ctx.createOscillator();
  osc.setPeriodicWave(voiceWave(ctx));
  osc.frequency.setValueAtTime(freqs[0], start);
  /* exponential in frequency is linear in semitones, so the sweep sounds even */
  for (let i = 1; i < freqs.length; i++) {
    osc.frequency.exponentialRampToValueAtTime(freqs[i], start + i * legLength);
  }

  // vibrato fades in once the note has settled
  const lfo = ctx.createOscillator();
  const vibratoDepth = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.value = VIBRATO_HZ;
  vibratoDepth.gain.setValueAtTime(0, start);
  vibratoDepth.gain.linearRampToValueAtTime(VIBRATO_CENTS, start + Math.min(1.1, dur * 0.45));
  lfo.connect(vibratoDepth);
  vibratoDepth.connect(osc.detune);

  /* two formants, fixed in place while the pitch moves through them, plus a
     little of the dry tone, all through a lowpass that follows the pitch */
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.Q.value = 0.7;
  for (const formant of FORMANTS) {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = formant.hz;
    band.Q.value = formant.q;
    const level = ctx.createGain();
    level.gain.value = formant.gain;
    osc.connect(band);
    band.connect(level);
    level.connect(lowpass);
  }
  const dry = ctx.createGain();
  dry.gain.value = 0.22;
  osc.connect(dry);
  dry.connect(lowpass);
  const brightness = (freq: number) => Math.max(900, Math.min(5000, freq * 6 + 600));
  lowpass.frequency.setValueAtTime(brightness(freqs[0]), start);
  for (let i = 1; i < freqs.length; i++) {
    lowpass.frequency.exponentialRampToValueAtTime(brightness(freqs[i]), start + i * legLength);
  }

  const envelope = ctx.createGain();
  const attack = Math.min(0.26, dur * 0.22);
  const release = Math.min(0.3, dur * 0.25);
  envelope.gain.setValueAtTime(SILENT, start);
  envelope.gain.exponentialRampToValueAtTime(SIREN_PEAK, start + attack);
  envelope.gain.setValueAtTime(SIREN_PEAK, start + Math.max(attack + 0.01, dur - release));
  envelope.gain.exponentialRampToValueAtTime(SILENT, start + dur);

  lowpass.connect(envelope);
  envelope.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.1);
  lfo.start(start);
  lfo.stop(start + dur + 0.1);
  muteMicUntil(ctx, start, dur);
}

/* ---------------- metronome click ---------------- */
const CLICKS = {
  accent: { hz: 1600, level: 0.5 },
  beat: { hz: 1050, level: 0.34 },
  sub: { hz: 820, level: 0.12 },
};
/** A metronome click on the audio clock. */
export function metClick(time: number, kind: 'accent' | 'beat' | 'sub'): void {
  const ctx = acIfAny();
  if (!ctx) {
    return;
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(CLICKS[kind].hz, time);
  gain.gain.setValueAtTime(SILENT, time);
  gain.gain.exponentialRampToValueAtTime(CLICKS[kind].level, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(SILENT, time + 0.045);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.06);
}

/** Two notes, one after the other — or together when harmonic. */
export function playInterval(root: number, semis: number, harmonic?: boolean): void {
  if (harmonic) {
    pianoChord([root, root + semis], null, 1.8, 0.8);
    return;
  }
  const ctx = ac();
  if (!ctx) {
    return;
  }
  const start = ctx.currentTime + 0.06;
  piano(root, start, 1.0);
  piano(root + semis, start + 0.62, 1.6);
}

/** Time between notes when a scale is plucked up the neck. */
const SCALE_NOTE_MS = 330;
/** A scale as a bass plays it: up the box from the given string. */
export function playScale(sid: string, root: number, start: number): void {
  if (!honmoon.settings.sound) {
    return;
  }
  const shape = scaleShape(sid, root, start, 1);
  if (!ac()) {
    return;
  }
  shape.pos.forEach((pos, i) => {
    // written pitch to sounding pitch: a bass sounds an octave lower
    setTimeout(() => pluck(STRINGS[pos.s].open + pos.f - 12), i * SCALE_NOTE_MS);
  });
}
/** The scale sounded plainly, straight up and landing on the octave, so what
    you are judging is the pattern of steps and nothing else — no shape on the
    neck, no rhythm to hang on to. */
export function playScaleEar(sid: string, root: number): void {
  if (!honmoon.settings.sound) {
    return;
  }
  const scale = scaleDef(sid);
  const ctx = ac();
  if (!scale || !ctx) {
    return;
  }
  const noteGap = 0.3;
  const start = ctx.currentTime + 0.06;
  scale.iv.concat([12]).forEach((semis, i) => {
    piano(root + semis, start + i * noteGap, noteGap * 1.6, 0.85);
  });
}

/** Two bars of the bare pulse. A time signature is a thing you feel before it
    is a thing you read, and the difference between three and four is obvious
    the moment you hear where the accent lands. */
export function playMeter(ts: TimeSig): void {
  const ctx = ac();
  if (!ctx) {
    return;
  }
  const [count, unit] = ts;
  const compound = unit === 8 && count % 3 === 0 && count > 3;
  const bpm = compound ? 168 : 88;
  const secondsPerClick = 60 / bpm;
  const start = ctx.currentTime + 0.2;
  for (let bar = 0; bar < 2; bar++) {
    for (let i = 0; i < count; i++) {
      let kind: 'accent' | 'beat' | 'sub' = 'beat';
      if (i === 0) {
        kind = 'accent';
      } else if (compound && i % 3 !== 0) {
        kind = 'sub';
      }
      metClick(start + (bar * count + i) * secondsPerClick, kind);
    }
  }
}
