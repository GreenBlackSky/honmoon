/* @greenblacksky/honmoon — everything the three apps (Mira, Rumi, Zoey) share.
   Logic and data are plain TypeScript; the screens and widgets are Svelte
   components under ui/. Import what you need from the package root. */

/* store */
export * from './store/types';
export {
  honmoon,
  DEF,
  configureStore,
  addNormalizer,
  card,
  mastery,
  record,
  queueSave,
  save,
  saveLocal,
  setSetting,
  payload,
  load,
  apply,
  resetProgress,
  exportText,
  importText,
  syncLabel,
} from './store/honmoon.svelte';
export { FirebaseSync, type SyncAdapter, type FirebaseSyncOptions } from './store/sync';

/* music */
export * from './music/notes';
export * from './music/bass';
export * from './music/scales';
export * from './music/clefs';
export * from './music/intervals';
export * from './music/voice';
export * from './music/rhythm';

/* notation */
export * from './notation/glyphs';
export * from './notation/staff';
export * from './notation/fretboard';
export * from './notation/keyboard';
export * from './notation/rhythmsvg';
export * from './notation/tab';
export { IC, type IconName } from './notation/icons';

/* audio */
export { ac, acIfAny, audioGate } from './audio/context';
export * from './audio/synth';
export * from './audio/rhythmplay';
export * from './audio/metronome.svelte';
export * from './audio/mic';
export { nsdfPitch, decimate } from './audio/pitch';

/* learning */
export * from './learn/pools';
export * from './learn/session';
export * from './drills/defs';
export * from './drills/registry.svelte';
export * from './drills/questions';
export * from './drills/runtime.svelte';

/* navigation */
export * from './nav.svelte';

/* utilities */
export * from './util/random';
export * from './util/text';
export * from './util/list';

/* progress and descriptions */
export * from './learn/progress';
export { describeCard } from './learn/describe';
export { verdictOf, type Verdict } from './drills/verdict';

/* ui: building blocks */
export { installTapFix } from './ui/tapfix';
export { hscroll, fretFrac, type HScrollParams } from './ui/actions';
export { follow, kbFollow, kbFollowStop } from './ui/keyfollow.svelte';
export * from './ui/scaleboard';
export * from './ui/types';
export { GLOSS, LEARN, DEGQ, DEGTABS } from './ui/refdata';
export { default as Shell } from './ui/Shell.svelte';
export { default as Fretboard } from './ui/Fretboard.svelte';
export { default as Keyboard } from './ui/Keyboard.svelte';
export { default as StaffRun } from './ui/StaffRun.svelte';
export { default as RhythmBar } from './ui/RhythmBar.svelte';
export { default as Chips } from './ui/Chips.svelte';
export { default as Stat } from './ui/Stat.svelte';
export { default as BackBar } from './ui/BackBar.svelte';
export { default as BassRow } from './ui/BassRow.svelte';
export { default as AccRow } from './ui/AccRow.svelte';
export { default as DataCard } from './ui/DataCard.svelte';
export { default as MetronomePanel } from './ui/MetronomePanel.svelte';

/* ui: screens */
export { default as PracticeHome } from './ui/screens/PracticeHome.svelte';
export { default as FamilyScreen } from './ui/screens/FamilyScreen.svelte';
export { default as ScalesScreen } from './ui/screens/ScalesScreen.svelte';
export { default as DrillScreen } from './ui/screens/DrillScreen.svelte';
export { default as SessionDone } from './ui/screens/SessionDone.svelte';
export { default as StatsScreen } from './ui/screens/StatsScreen.svelte';
export { default as SetupScreen } from './ui/screens/SetupScreen.svelte';
export { default as StaffMap } from './ui/screens/StaffMap.svelte';
export { default as RhythmRef } from './ui/screens/RhythmRef.svelte';
export { default as IntervalRef } from './ui/screens/IntervalRef.svelte';
export { default as DegreesRef } from './ui/screens/DegreesRef.svelte';
export { default as Glossary } from './ui/screens/Glossary.svelte';
export { default as Explorer } from './ui/screens/Explorer.svelte';
export { default as LearnIndex } from './ui/screens/LearnIndex.svelte';
export { default as TapCalibration } from './ui/screens/TapCalibration.svelte';
export { default as MetronomeScreen } from './ui/screens/MetronomeScreen.svelte';

/* warm-ups */
export * from './music/warmups';
export { vCueLen, vPlayOnce } from './audio/voiceplay';
export { installDefaultNormalizers } from './store/normalize';
