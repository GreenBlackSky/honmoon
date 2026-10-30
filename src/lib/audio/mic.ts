import { ac, acIfAny, audioGate } from './context';
import { decimate, nsdfPitch } from './pitch';

/** What the listener reports on every animation frame while the mic is on. */
export interface MicReading {
  rms: number;
  /** the app's own sound was playing, so nothing was measured */
  muted?: boolean;
  freq?: number;
  /** median of the last few frames, as a fractional MIDI number */
  midi?: number;
  clarity?: number;
  /** the last three frames agree to within 40 cents */
  stable?: boolean;
}

const mic = {
  on: false,
  stream: null as MediaStream | null,
  an: null as AnalyserNode | null,
  buf: null as Float32Array | null,
  raf: 0,
  floor: 0.004,
  cb: null as ((r: MicReading) => void) | null,
  hist: [] as number[],
};

export function micOn(): boolean {
  return mic.on;
}
/** Who hears the readings. One listener at a time: the drill or the Setup check. */
export function micListen(cb: ((r: MicReading) => void) | null): void {
  mic.cb = cb;
}

/* A microphone can fail in five quite different ways and they need five
   different answers. In particular: inside an embedded frame the browser
   refuses WITHOUT ever showing a prompt, which looks exactly like a dead
   button, and no site setting can override it. */
export interface MicEnv {
  secure: boolean;
  api: boolean;
  framed: boolean;
  policy: boolean | null;
}
export function micEnv(): MicEnv {
  const doc = document as unknown as {
    featurePolicy?: { allowsFeature(feature: string): boolean };
    permissionsPolicy?: { allowsFeature(feature: string): boolean };
  };
  const policy = doc.featurePolicy || doc.permissionsPolicy || null;
  let allowedByPolicy: boolean | null = null;
  let framed: boolean;
  try {
    if (policy && policy.allowsFeature) {
      allowedByPolicy = policy.allowsFeature('microphone');
    }
  } catch {
    allowedByPolicy = null;
  }
  try {
    framed = window.top !== window.self;
  } catch {
    framed = true;
  }
  return {
    secure: !!window.isSecureContext,
    api: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    framed,
    policy: allowedByPolicy,
  };
}
export function micUsable(): boolean {
  const env = micEnv();
  return env.api && env.secure && env.policy !== false;
}
export interface MicReason {
  t: string;
  m: string;
  tab: boolean;
}
export function micReason(err: unknown): MicReason {
  const env = micEnv();
  const errorName = (err && (err as { name?: string }).name) || '';
  if (!env.api || !env.secure) {
    return {
      t: 'No microphone API here',
      m: 'This page cannot reach a microphone at all — the connection is not secure, or the browser exposes no capture API in this context.',
      tab: false,
    };
  }
  if (env.policy === false) {
    return {
      t: 'No microphone in this viewer',
      m: 'The page this app runs inside does not pass microphone access through to it, so the prompt never appears and no browser setting can override it. Nothing here can change that — the play-along drills fall back to marking yourself, and everything else is unaffected.',
      tab: false,
    };
  }
  if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
    return env.framed
      ? {
          t: 'Refused without asking',
          m: 'The browser said no without showing a prompt, which almost always means the embedding page is not passing microphone access through to this frame. Try opening the app in its own browser tab.',
          tab: true,
        }
      : {
          t: 'Permission refused',
          m: 'Tap the padlock or camera icon in the address bar, set Microphone to Allow, then press Start listening again.',
          tab: false,
        };
  }
  if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError') {
    return {
      t: 'No microphone found',
      m: 'The browser reports no capture device on this machine.',
      tab: false,
    };
  }
  if (errorName === 'NotReadableError' || errorName === 'AbortError') {
    return {
      t: 'Microphone is busy',
      m: 'Another app is holding it. Close that app and try again.',
      tab: false,
    };
  }
  return {
    t: 'Could not start the microphone',
    m:
      (errorName || 'unknown error') +
      '. Everything except the play-along drills works without it.',
    tab: env.framed,
  };
}

/** Band kept from the microphone: rumble below a bass's low B goes, and so
    does everything above the pitches the detector looks for. */
const HIGHPASS_HZ = 32;
const LOWPASS_HZ = 1400;
/** Samples per analysis frame. */
const FRAME_SIZE = 8192;
/** Pitch detection runs on the signal decimated to about this rate. */
const ANALYSIS_RATE = 12000;
/** Readings kept for the median, and how close (in semitones) the last two
    must be to it to count as a stable note. */
const HISTORY_LENGTH = 5;
const STABLE_WITHIN = 0.4;

export function micStart(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (mic.on) {
      return resolve();
    }
    const ctx = ac();
    if (!ctx) {
      return reject(new Error('no-audio'));
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return reject(new Error('no-mic'));
    }
    navigator.mediaDevices
      .getUserMedia({
        // raw signal: the browser's voice-call processing would distort pitch
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      .then((stream) => {
        mic.stream = stream;
        const source = ctx.createMediaStreamSource(stream);
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = HIGHPASS_HZ;
        highpass.Q.value = 0.7;
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = LOWPASS_HZ;
        lowpass.Q.value = 0.7;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FRAME_SIZE;
        analyser.smoothingTimeConstant = 0;
        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(analyser);
        mic.an = analyser;
        mic.buf = new Float32Array(analyser.fftSize);
        mic.on = true;
        mic.hist = [];
        loop();
        resolve();
      })
      .catch(reject);
  });
}
export function micStop(): void {
  if (mic.raf) {
    cancelAnimationFrame(mic.raf);
  }
  mic.raf = 0;
  if (mic.stream) {
    mic.stream.getTracks().forEach((track) => track.stop());
  }
  mic.stream = null;
  mic.on = false;
  mic.cb = null;
}

function rootMeanSquare(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}
/** Frequency to a fractional MIDI number (A4 = 440 Hz = 69). */
function midiOfFrequency(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}
/** Each animation frame: measure, then report to whoever is listening. */
function loop(): void {
  mic.raf = requestAnimationFrame(loop);
  const ctx = acIfAny();
  if (!mic.an || !mic.cb || !mic.buf || !ctx) {
    return;
  }
  mic.an.getFloatTimeDomainData(mic.buf as Float32Array<ArrayBuffer>);
  const rms = rootMeanSquare(mic.buf);
  if (Date.now() < audioGate.muteUntil) {
    mic.cb({ rms, muted: true });
    return;
  }
  if (rms < mic.floor) {
    mic.hist.length = 0;
    mic.cb({ rms });
    return;
  }
  const factor = Math.max(1, Math.round(ctx.sampleRate / ANALYSIS_RATE));
  const pitch = nsdfPitch(decimate(mic.buf, factor), ctx.sampleRate / factor);
  if (!pitch) {
    mic.cb({ rms });
    return;
  }
  const history = mic.hist;
  history.push(midiOfFrequency(pitch.f));
  if (history.length > HISTORY_LENGTH) {
    history.shift();
  }
  const sorted = history.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const last = history[history.length - 1];
  const beforeLast = history[history.length - 2];
  const stable =
    history.length >= 3 &&
    Math.abs(last - median) < STABLE_WITHIN &&
    Math.abs(beforeLast - median) < STABLE_WITHIN;
  mic.cb({ rms, freq: pitch.f, midi: median, clarity: pitch.clarity, stable });
}
