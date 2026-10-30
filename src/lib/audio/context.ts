/* One AudioContext for the whole app, created on first use — browsers only
   allow sound after a user gesture, and every first use here is one. */
let context: AudioContext | null = null;

export function ac(): AudioContext | null {
  if (!context) {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      context = new AudioContextClass();
    } catch {
      context = null;
    }
  }
  if (context && context.state === 'suspended') {
    context.resume();
  }
  return context;
}
/** The context if it already exists, without creating one. */
export function acIfAny(): AudioContext | null {
  return context;
}

/** While the app itself is making sound, the pitch detector would hear it and
    grade it as your playing. Every sound pushes this out to when it will have
    died away, and the detector ignores everything before then. */
export const audioGate = { muteUntil: 0 };
