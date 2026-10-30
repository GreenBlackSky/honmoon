import { addNormalizer } from './honmoon.svelte';
import { SCALES } from '../music/scales';
import { VSTAGES } from '../music/voice';
import { appHasDrill, appHasGroup } from '../drills/registry.svelte';

/** The tidy-ups the original applied to every save it loaded. Call once at
    start-up, after configureGroups(). */
export function installDefaultNormalizers(): void {
  addNormalizer((settings) => {
    if (!settings.sen) {
      settings.sen = SCALES.filter((scale) => scale.on).map((scale) => scale.id);
    }
    if (!settings.voff) {
      settings.voff = VSTAGES.filter((stage) => !stage.on).map((stage) => stage.k);
    }
    /* The families were regrouped; an old save may hold keys that no longer
       name anything. Guessing what the owner meant would switch off the wrong
       half, so anything unrecognised is simply dropped and that family comes
       back on. */
    settings.off = Array.isArray(settings.off) ? settings.off.filter(appHasGroup) : [];
    settings.doff = Array.isArray(settings.doff) ? settings.doff.filter(appHasDrill) : [];
  });
}
