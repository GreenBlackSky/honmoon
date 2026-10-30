import { honmoon } from '../store/honmoon.svelte';
import { bassHere } from '../music/bass';
import { ALL_DRILLS, SDRILLS, type DrillDef } from './defs';
import { IC, type IconName } from '../notation/icons';

/* ---------------- what this app contains ----------------
   The engine knows every drill; each app says which families it shows and
   which drills sit in each. Everything that used to read the global lists —
   sessions, mastery, the Practice screen — reads through here, so a drill the
   app does not include simply does not exist for it. */

export interface GroupDef {
  /** keep the original keys (neck, read, names, ear, voice, scale): the
      session and stats logic refer to them */
  k: string;
  n: string;
  sb: string;
  /** what the family needs: "Screen, and sound for the rhythm drills" */
  need: string;
  ic: IconName;
  /** drill ids, in the order they are listed */
  drills: string[];
  /** left out of the daily-session "Include" row (the scales family has its own session) */
  sep?: boolean;
}

/** The six families of the original app, as defaults an app can reuse or reword. */
export const DEFAULT_GROUPS: Record<string, Omit<GroupDef, 'drills'>> = {
  neck: {
    k: 'neck',
    n: 'The neck',
    sb: 'Where a note lives on the bass, and what the thing under your finger is called.',
    need: 'Screen — two of them want the bass in your hands',
    ic: 'dot',
  },
  read: {
    k: 'read',
    n: 'Reading',
    sb: 'Getting music off the page: pitch on the staff, and rhythm in time.',
    need: 'Screen, and sound for the rhythm drills',
    ic: 'staff',
  },
  names: {
    k: 'names',
    n: 'Names & keys',
    sb: 'The same note under different names, and what it is doing inside a key.',
    need: 'Nothing but the screen',
    ic: 'swap',
  },
  ear: {
    k: 'ear',
    n: 'Ear',
    sb: 'Intervals and chords by sound alone.',
    need: 'Sound on',
    ic: 'wave',
  },
  voice: {
    k: 'voice',
    n: 'Voice',
    sb: 'Singing what you read, and finding a note from the key rather than from a reference pitch.',
    need: 'Your voice, and sound on',
    ic: 'voice',
  },
  scale: {
    k: 'scale',
    n: 'Scales',
    sb: 'Shapes, degrees and the keys they live in.',
    need: 'Screen; one drill wants the bass',
    ic: 'target',
  },
};

const app = $state({ groups: [] as GroupDef[] });

/** Called once by each app at start-up. */
export function configureGroups(groups: GroupDef[]): void {
  app.groups = groups;
}
export function appGroups(): GroupDef[] {
  return app.groups;
}
export function groupDef(key: string): GroupDef | null {
  return app.groups.find((group) => group.k === key) ?? null;
}
export function groupName(key: string): string {
  return groupDef(key)?.n ?? key;
}
export function groupIcon(group: GroupDef): string {
  return IC[group.ic];
}
/** The family a drill sits in, in this app. */
export function groupOfDrill(id: string): string | null {
  return app.groups.find((group) => group.drills.includes(id))?.k ?? null;
}
/** Every drill this app includes, in the engine's canonical order. */
export function appDrills(): DrillDef[] {
  return ALL_DRILLS.filter((drill) => groupOfDrill(drill.id) != null);
}
export function appHasDrill(id: string): boolean {
  return groupOfDrill(id) != null;
}
export function appHasGroup(key: string): boolean {
  return groupDef(key) != null;
}
/** A drill this app includes, or null. */
export function drillDef(id: string): DrillDef | null {
  return appHasDrill(id) ? (ALL_DRILLS.find((drill) => drill.id === id) ?? null) : null;
}
export function scaleDrillsInApp(): DrillDef[] {
  return SDRILLS.filter((drill) => appHasDrill(drill.id));
}
export function sessionGroups(): GroupDef[] {
  return app.groups.filter((group) => !group.sep);
}

/* ---------------- what is switched on ---------------- */
export function groupOff(key: string): boolean {
  return (honmoon.settings.off || []).includes(key);
}
/** In this app, and not switched off for the daily session. */
export function groupUsable(key: string): boolean {
  return appHasGroup(key) && !groupOff(key);
}
/** A single drill you would rather not meet. It stays on its family screen so
    you can still open it by hand — switching it off only keeps it out of the
    daily session, which is where an exercise you dislike does the most damage:
    it turns up unasked, between things you did want. */
export function drillOn(id: string): boolean {
  return !(honmoon.settings.doff || []).includes(id);
}
export function sdrillOn(id: string): boolean {
  return !(honmoon.settings.sdoff || []).includes(id);
}
/** Whether a drill can run right now: its settings need is met, and if it
    wants the bass in your hands, it is. */
export function drillAvailable(drill: DrillDef): boolean {
  if (drill.need && !drill.need()) {
    return false;
  }
  return !(drill.bass && !bassHere());
}
/** A family's drills that this app includes, in the app's order. */
function familyDrillDefs(key: string): DrillDef[] {
  const group = groupDef(key);
  if (!group) {
    return [];
  }
  return group.drills.map((id) => drillDef(id)).filter((drill): drill is DrillDef => !!drill);
}
/** The drills a family shows, as the app lists them. */
export function famDrills(key: string): DrillDef[] {
  const drills = familyDrillDefs(key);
  if (groupDef(key)?.k === 'scale') {
    return drills.filter((drill) => !drill.bass || bassHere());
  }
  return drills.filter(drillAvailable);
}
/** Drills a family owns but is not showing because of a setting. */
export function famHidden(key: string): number {
  return familyDrillDefs(key).filter((drill) => drill.need && !drill.need()).length;
}
/** Drills a family is not showing only because the bass is not to hand. */
export function famNoBass(key: string): number {
  return familyDrillDefs(key).filter(
    (drill) => drill.bass && !bassHere() && (key === 'scale' || !drill.need || drill.need()),
  ).length;
}
