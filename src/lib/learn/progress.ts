import { honmoon, mastery } from '../store/honmoon.svelte';
import { dayKey, todayKey } from '../util/text';
import { positions } from '../music/bass';
import { staffNotes } from '../music/clefs';
import { earCards } from '../music/intervals';
import { scaleCards } from '../music/scales';
import { pcs, playPcs, scalearCards } from './pools';
import { drillDef, famDrills, groupDef } from '../drills/registry.svelte';
import type { DrillDef } from '../drills/defs';

const MAX_MASTERY = 5;
/** Mastery summed over some cards, as a percentage of all of them being solid. */
function masteryPercent(ids: string[]): number {
  const total = ids.reduce((sum, id) => sum + mastery(id), 0);
  return Math.round((100 * total) / (ids.length * MAX_MASTERY));
}

/** The cards a drill is measured over. */
function cardsMeasuredBy(drill: DrillDef): string[] {
  const asIds = (items: { id: string }[]) => items.map((item) => item.id);
  switch (drill.kind) {
    case 'earscale':
      return scalearCards();
    case 'ear':
      return earCards();
    case 'translate':
      return asIds(pcs());
    case 'staff2name':
    case 'staffkey':
      return asIds(staffNotes());
    case 'play':
      return drill.sys === 'staff' ? asIds(staffNotes()) : asIds(playPcs());
    default:
      return asIds(positions());
  }
}
/** How solid a drill's cards are, as a percentage of full mastery. */
export function drillMastery(id: string): { pct: number; n: number } {
  const drill = drillDef(id);
  if (!drill) {
    return { pct: 0, n: 0 };
  }
  const ids = cardsMeasuredBy(drill);
  if (!ids.length) {
    return { pct: 0, n: 0 };
  }
  return { pct: masteryPercent(ids), n: ids.length };
}
/** How solid the scale-and-key pairs in rotation are. */
export function scaleDrillMastery(): number {
  const ids = scaleCards();
  return ids.length ? masteryPercent(ids) : 0;
}
export function famMastery(familyKey: string): { pct: number; n: number } {
  const drills = famDrills(familyKey);
  if (!drills.length) {
    return { pct: 0, n: 0 };
  }
  /* (The original added scale mastery as an object's missing .pct here, which
     made the family's figure NaN and hid it. It is a plain number now.) */
  const isScaleFamily = groupDef(familyKey)?.k === 'scale';
  let total = 0;
  for (const drill of drills) {
    total += isScaleFamily ? scaleDrillMastery() : drillMastery(drill.id).pct;
  }
  return { pct: Math.round(total / drills.length), n: drills.length };
}

/** Don't count back further than this many days. */
const MAX_STREAK = 400;
/** Consecutive days with at least one answer, counting today only once it has one. */
export function streakDays(): number {
  const day = new Date();
  let streak = 0;
  for (;;) {
    const key = dayKey(day);
    if (honmoon.daily[key] && honmoon.daily[key].n > 0) {
      streak++;
      day.setDate(day.getDate() - 1);
    } else if (streak === 0 && key === todayKey()) {
      // nothing yet today: the streak can still be yesterday's
      day.setDate(day.getDate() - 1);
    } else {
      break;
    }
    if (streak > MAX_STREAK) {
      break;
    }
  }
  return streak;
}
export function totals(): { n: number; c: number; acc: number } {
  let answers = 0;
  let correct = 0;
  for (const key in honmoon.daily) {
    answers += honmoon.daily[key].n;
    correct += honmoon.daily[key].c;
  }
  return { n: answers, c: correct, acc: answers ? Math.round((100 * correct) / answers) : 0 };
}
