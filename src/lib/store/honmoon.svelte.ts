import type { Card, HonmoonState, Payload, Settings } from './types';
import { todayKey } from '../util/text';
import type { SyncAdapter } from './sync';

export const DEF: Settings = {
  pref: 'sharp',
  level: 'l1',
  acc: false,
  bass: true,
  mic: true,
  sound: true,
  labels: true,
  slen: 30,
  off: [],
  woff: [],
  wlen: 3,
  sen: null,
  sroots: 'nat',
  sstart: 'both',
  sslen: 20,
  sdoff: [],
  wmode: 'bass',
  vlo: null,
  vhi: null,
  voff: null,
  vtempo: 76,
  vgap: true,
  ivset: 'basic',
  clefs: ['bass'],
  mdo: false,
  rlev: 'r1',
  rtempo: 72,
  rfloor: 50,
  rlat: 0,
  theme: 'auto',
  hints: true,
  doff: [],
};

/** Everything the app knows about you. Reactive: any screen reading from it
    redraws by itself when it changes. */
export const honmoon: HonmoonState = $state({
  cards: {},
  daily: {},
  tempo: {},
  settings: { ...DEF, off: [], woff: [], sdoff: [], doff: [], clefs: ['bass'] },
  answers: 0,
});

/* ---------------- configuration ----------------
   Each app keeps its own copy of everything under its own key, and tells the
   store how to tidy a payload it loads (an old save may name drills or
   families that no longer exist). */
interface StoreConfig {
  key: string;
  normalize: ((s: Settings) => void)[];
  sync: SyncAdapter | null;
}
const cfg: StoreConfig = { key: 'honmoon.v1', normalize: [], sync: null };

export function configureStore(options: { key: string; sync?: SyncAdapter | null }): void {
  cfg.key = options.key;
  cfg.sync = options.sync ?? null;
}
/** Register a tidy-up step applied to settings whenever a payload is adopted. */
export function addNormalizer(normalize: (settings: Settings) => void): void {
  cfg.normalize.push(normalize);
}
function runNormalizers(settings: Settings): void {
  for (const normalize of cfg.normalize) {
    normalize(settings);
  }
}

/* ---------------- cards ----------------
   A card's mastery climbs one step for each right answer and falls two for
   each wrong one, between 0 (new or shaky) and 5 (solid). */
const MAX_MASTERY = 5;
const MASTERY_UP = 1;
const MASTERY_DOWN = 2;
/** Time spent on one answer counts for at most a minute (a phone left on). */
const MAX_ANSWER_MS = 60000;

export function card(id: string): Card {
  if (!honmoon.cards[id]) {
    honmoon.cards[id] = { s: 0, c: 0, t: 0, k: 0 };
  }
  return honmoon.cards[id];
}
export function mastery(id: string): number {
  const existing = honmoon.cards[id];
  if (!existing || !existing.s) {
    return 0;
  }
  return Math.max(0, Math.min(MAX_MASTERY, existing.k));
}
/** Count one answer to a card: its counts and mastery, and today's log. */
export function record(id: string, ok: boolean, ms: number): void {
  const answered = card(id);
  answered.s++;
  if (ok) {
    answered.c++;
    answered.k = Math.min(MAX_MASTERY, (answered.k || 0) + MASTERY_UP);
  } else {
    answered.k = Math.max(0, (answered.k || 0) - MASTERY_DOWN);
  }
  answered.t = Date.now();
  const dayKey = todayKey();
  const today = honmoon.daily[dayKey] || { n: 0, c: 0, ms: 0 };
  today.n++;
  if (ok) {
    today.c++;
  }
  today.ms += Math.min(ms || 0, MAX_ANSWER_MS);
  honmoon.daily[dayKey] = today;
  honmoon.answers++;
  queueSave();
}

/* ---------------- saving ---------------- */
let dirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let synced = false;
/** Progress is written a few seconds after the last change, not on every answer. */
const SAVE_DELAY_MS = 3500;

export function queueSave(): void {
  dirty = true;
  if (saveTimer) {
    return;
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    save();
  }, SAVE_DELAY_MS);
}

export function payload(): Payload {
  const snapshot = $state.snapshot(honmoon);
  return {
    v: 1,
    t: Date.now(),
    cards: snapshot.cards,
    daily: snapshot.daily,
    tempo: snapshot.tempo,
    settings: snapshot.settings,
  };
}

function writeLocal(): void {
  try {
    localStorage.setItem(cfg.key, JSON.stringify(payload()));
  } catch {
    /* private mode, quota: progress stays in memory */
  }
}

/** Settings are written through at once: they are tiny, and a preference that
    vanishes because the page was closed within the save delay is maddening.
    Progress still goes through the debounce. */
export function saveLocal(): void {
  writeLocal();
}

export function save(): void {
  if (!dirty) {
    return;
  }
  dirty = false;
  writeLocal();
  if (cfg.sync && synced) {
    cfg.sync.save(payload()).catch(() => {});
  }
}

/** Change one setting, write it through, and schedule a sync. */
export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  honmoon.settings[key] = value;
  saveLocal();
  queueSave();
}

/** A label for the Stats screen. */
export function syncLabel(): string {
  return cfg.sync && synced ? 'Synced across your devices' : 'Saved in this browser only';
}

/* ---------------- loading ---------------- */
/** Total answers recorded in a set of cards. */
function answersIn(cards: Record<string, Card> | undefined): number {
  let total = 0;
  for (const id in cards || {}) {
    total += cards![id].s || 0;
  }
  return total;
}
function progressOf(saved: Partial<Payload> | null): number {
  if (!saved || typeof saved !== 'object') {
    return 0;
  }
  return answersIn(saved.cards);
}
/** Snapshots from a store may be frozen, so nothing read from one goes into
    honmoon directly — the first c.s++ would throw. Copy before adopting. */
function thaw<T>(value: T): T | null {
  try {
    return value ? JSON.parse(JSON.stringify(value)) : null;
  } catch {
    return null;
  }
}
/** Bring settings from an older save up to date. */
function upgradeSettings(settings: Settings): void {
  /* An old save may name a level that no longer exists. "All 12 notes" was the
     full neck plus the black notes, so it becomes exactly that. */
  if ((settings.level as string) === 'l3') {
    settings.level = 'l2';
    settings.acc = true;
  }
  if (!['l0', 'l1', 'l2'].includes(settings.level)) {
    settings.level = 'l1';
  }
  /* an older save has no clef list; bass is where everyone starts */
  if (!Array.isArray(settings.clefs) || !settings.clefs.length) {
    settings.clefs = ['bass'];
  }
  if (!Array.isArray(settings.doff)) {
    settings.doff = [];
  }
}

/** Adopt a saved payload as the current state. */
export function apply(saved: Partial<Payload> | null, keepSettings?: boolean): void {
  if (!saved) {
    return;
  }
  honmoon.cards = thaw(saved.cards) || {};
  honmoon.daily = thaw(saved.daily) || {};
  honmoon.tempo = thaw(saved.tempo) || {};
  if (!keepSettings) {
    honmoon.settings = Object.assign({}, structuredClone(DEF), thaw(saved.settings) || {});
  }
  upgradeSettings(honmoon.settings);
  runNormalizers(honmoon.settings);
  honmoon.answers = answersIn(honmoon.cards);
}

/** Read what this browser has, then — if a sync service is configured — take
    progress from wherever there is more of it, and settings from whichever
    copy was written last. Otherwise a sync from a device you have not touched
    in a week quietly undoes the preferences you changed a minute ago. */
export function load(): void {
  let local: Partial<Payload> | null = null;
  try {
    const raw = localStorage.getItem(cfg.key);
    if (raw) {
      local = JSON.parse(raw);
    }
  } catch {
    /* unreadable: start fresh */
  }
  if (local) {
    apply(local);
  } else {
    runNormalizers(honmoon.settings);
  }
  const sync = cfg.sync;
  if (!sync) {
    return;
  }
  sync
    .load()
    .then((remote) => {
      synced = true;
      if (remote && remote.cards && progressOf(remote) >= progressOf(local)) {
        const localWrittenAt = (local && local.t) || 0;
        const remoteWrittenAt = remote.t || 0;
        const keepLocalSettings = remoteWrittenAt <= localWrittenAt && !!(local && local.settings);
        apply(remote, keepLocalSettings);
      } else {
        dirty = true;
        save();
      }
    })
    .catch(() => {});
}

export function resetProgress(): void {
  honmoon.cards = {};
  honmoon.daily = {};
  honmoon.answers = 0;
  dirty = true;
  save();
}

/** Progress as a JSON file's text, for the export button. */
export function exportText(): string {
  return JSON.stringify(payload(), null, 1);
}

/** Replace progress with an exported payload — from any of the apps or from the original
    Fretboard Fluency (same format). Settings are kept unless asked for. */
export function importText(
  text: string,
  withSettings = false,
): { ok: boolean; answers: number; msg: string } {
  let imported: Partial<Payload>;
  try {
    imported = JSON.parse(text);
  } catch {
    return { ok: false, answers: 0, msg: 'That file is not readable JSON.' };
  }
  if (!imported || typeof imported !== 'object' || !imported.cards) {
    return { ok: false, answers: 0, msg: 'That file has no progress in it.' };
  }
  apply(imported, !withSettings);
  dirty = true;
  save();
  return { ok: true, answers: honmoon.answers, msg: 'Imported ' + honmoon.answers + ' answers.' };
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      save();
    }
  });
  window.addEventListener('pagehide', save);
}
