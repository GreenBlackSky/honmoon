import { honmoon } from '../store/honmoon.svelte';
import { STRINGS } from '../music/bass';
import { bothNames, degName, keyName, noteName, pcOf } from '../music/notes';
import { clefDef, parseST } from '../music/clefs';
import { chDef, ivDef } from '../music/intervals';
import { restName, rvalDef } from '../music/rhythm';
import { parseSC, scaleDef, scaleName } from '../music/scales';
import { parseMD } from './pools';

const BAR_DRILL_WORDS: Record<string, string> = {
  count: 'counting a bar',
  fill: 'completing a bar',
  hear: 'hearing a bar',
  tap: 'tapping a bar',
};
function describeRhythm(id: string): string {
  const [, kind, value] = id.split(':');
  if (kind === 'v') {
    return 'Rhythm — ' + rvalDef(+value).n;
  }
  if (kind === 'r') {
    return 'Rhythm — ' + restName(+value);
  }
  return 'Rhythm — ' + (BAR_DRILL_WORDS[kind] || kind);
}

/** A card id in words, for the session summary and the weakest-spots list. */
export function describeCard(id: string): string {
  const pref = honmoon.settings.pref;
  const rest = id.slice(3);
  switch (id.slice(0, 3)) {
    case 'sc:': {
      const { sid, root } = parseSC(id);
      return scaleName(sid, root);
    }
    case 'iv:':
      return 'Interval — ' + ivDef(+rest).n;
    case 'ch:':
      return 'Chord by ear — ' + chDef(rest).n;
    case 'fb:': {
      const [, stringPart, fretPart] = id.split(':');
      const string = STRINGS[+stringPart];
      const pc = pcOf(string.open + +fretPart);
      return string.n + ' string, fret ' + fretPart + ' — ' + bothNames(pc, pref);
    }
    case 'st:': {
      const { clef, m } = parseST(id);
      return 'On the ' + clefDef(clef).n.toLowerCase() + ' staff — ' + bothNames(pcOf(m), pref);
    }
    case 'md:': {
      const { keyPc, pc } = parseMD(id);
      const note = noteName(pc, 'en', pref);
      return 'In ' + keyName(keyPc) + ' — ' + note + ', the ' + degName(pc, keyPc, pref);
    }
    case 'rh:':
      return describeRhythm(id);
    case 'pl:':
      return 'Playing ' + bothNames(+rest, pref);
    case 'se:': {
      const scale = scaleDef(rest);
      return 'Scale by ear — ' + (scale ? scale.n : rest);
    }
    case 'tr:':
      return 'Naming ' + bothNames(+rest, pref);
    default:
      /* A card type with no description of its own used to fall into the line
         above and be read as a pitch class, which turned "se:dorian" into
         "Naming undefined · undefined". Printing the id looks daft; printing
         nonsense confidently is worse. */
      return id;
  }
}
