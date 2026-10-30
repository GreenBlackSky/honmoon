/* ---------------- pitch detection (MPM / NSDF) ----------------
   McLeod's normalised square difference function: find the first lag whose
   self-similarity is close to the best one, which is the period. Pure maths,
   no audio objects, so it can be tested with synthetic tones. */

/** Keep every `factor`-th sample: a cheap way to lower the sample rate. */
export function decimate(samples: Float32Array, factor: number): Float32Array {
  const length = Math.floor(samples.length / factor);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = samples[i * factor];
  }
  return out;
}

/** The search band: a bass guitar's open B to well above a sung soprano's
    lower range. */
const MIN_HZ = 36;
const MAX_HZ = 460;
/** Below this the strongest self-similarity is too weak to call a pitch. */
const MIN_CLARITY = 0.62;
/** The first peak within this share of the strongest one is the period —
    picking the strongest outright would often land on a multiple of it. */
const PEAK_SHARE = 0.93;

/** The normalised square difference for every lag in range: 1 means the
    signal repeats perfectly after that many samples. */
function nsdfCurve(buf: Float32Array, minLag: number, maxLag: number): Float32Array {
  const curve = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let autocorrelation = 0;
    let energy = 0;
    const limit = buf.length - lag;
    for (let i = 0; i < limit; i++) {
      const a = buf[i];
      const b = buf[i + lag];
      autocorrelation += a * b;
      energy += a * a + b * b;
    }
    curve[lag] = energy > 1e-12 ? (2 * autocorrelation) / energy : 0;
  }
  return curve;
}
/** The highest point of each stretch where the curve is above zero, as
    [lag, value]. */
function positivePeaks(curve: Float32Array, minLag: number, maxLag: number): [number, number][] {
  const peaks: [number, number][] = [];
  let inside = false;
  let bestLag = -1;
  let bestValue = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const value = curve[lag];
    if (!inside) {
      if (value > 0) {
        inside = true;
        bestLag = lag;
        bestValue = value;
      }
      continue;
    }
    if (value > bestValue) {
      bestValue = value;
      bestLag = lag;
    }
    if (value <= 0) {
      if (bestLag > 0) {
        peaks.push([bestLag, bestValue]);
      }
      inside = false;
      bestLag = -1;
      bestValue = -1;
    }
  }
  if (inside && bestLag > 0) {
    peaks.push([bestLag, bestValue]);
  }
  return peaks;
}
/** Refine a peak to a fraction of a sample by fitting a parabola through it
    and its two neighbours. */
function refinedLag(curve: Float32Array, lag: number): number {
  const before = curve[lag - 1] || 0;
  const at = curve[lag];
  const after = curve[lag + 1] || 0;
  const denominator = 2 * (2 * at - after - before);
  const shift = denominator !== 0 ? (after - before) / denominator : 0;
  return lag + shift;
}

/** Returns the fundamental in Hz and how clear it was, or null for no pitch.
    The search band is 36–460 Hz: a bass guitar's open B to well above a
    sung soprano's lower range. */
export function nsdfPitch(
  buf: Float32Array,
  sampleRate: number,
): { f: number; clarity: number } | null {
  const maxLag = Math.min(buf.length - 2, Math.floor(sampleRate / MIN_HZ));
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  if (maxLag <= minLag) {
    return null;
  }
  const curve = nsdfCurve(buf, minLag, maxLag);
  const peaks = positivePeaks(curve, minLag, maxLag);
  if (!peaks.length) {
    return null;
  }
  let strongest = 0;
  for (const [, value] of peaks) {
    if (value > strongest) {
      strongest = value;
    }
  }
  if (strongest < MIN_CLARITY) {
    return null;
  }
  const chosen = peaks.find(([, value]) => value >= PEAK_SHARE * strongest);
  if (!chosen) {
    return null;
  }
  const period = refinedLag(curve, chosen[0]);
  if (period <= 0) {
    return null;
  }
  let frequency = sampleRate / period;
  /* just above the band: probably the octave of a note inside it */
  if (frequency > MAX_HZ && frequency / 2 >= MIN_HZ) {
    frequency = frequency / 2;
  }
  if (frequency < MIN_HZ || frequency > MAX_HZ) {
    return null;
  }
  return { f: frequency, clarity: chosen[1] };
}
