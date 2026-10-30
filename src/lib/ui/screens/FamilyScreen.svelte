<!-- One family: what it is about, what it keeps next to its drills, and the drills. -->
<script lang="ts" module>
  /* Rolled up by default, and it stays as you left it across re-draws — a
     panel that snapped shut every time you toggled a chip would be unusable. */
  const FOLD: Record<string, boolean> = $state({});
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import { honmoon, setSetting, queueSave, saveLocal } from '../../store/honmoon.svelte';
  import { LEVELS, accOn, lvl, positions } from '../../music/bass';
  import { staffNotes, multiClef } from '../../music/clefs';
  import { midiName } from '../../music/notes';
  import { vRange } from '../../music/voice';
  import { IC } from '../../notation/icons';
  import { drillOn, famDrills, famHidden, famNoBass, groupDef } from '../../drills/registry.svelte';
  import { drillMastery } from '../../learn/progress';
  import { startDrill } from '../../drills/runtime.svelte';
  import { go, hasRoute } from '../../nav.svelte';
  import { toggledIn } from '../../util/list';
  import AccRow from '../AccRow.svelte';
  import ScalesScreen from './ScalesScreen.svelte';

  interface Props {
    fam: string;
    /** where the voice family's "Vocal warm-up" button goes */
    voiceWarmup?: string;
    /** anything an app wants to add above the drill list */
    extra?: Snippet<[string]>;
  }
  const { fam, voiceWarmup = 'warmhome', extra }: Props = $props();

  const group = $derived(groupDef(fam));
  const level = $derived(lvl());
  const drills = $derived(famDrills(fam));
  const noBassCount = $derived(famNoBass(fam));
  const hiddenCount = $derived(famHidden(fam));
  const offHere = $derived(drills.filter((def) => !drillOn(def.id)).length);
  const open = $derived(FOLD[fam] || offHere > 0);
  interface ReadingLink {
    route: string;
    title: string;
    blurb: string;
  }
  /** The reference pages worth reading alongside this family. */
  const refs = $derived.by(() => {
    const links: ReadingLink[] = [];
    if (fam === 'read') {
      links.push({
        route: 'ref',
        title: 'Staff map',
        blurb:
          'Every note on ' +
          (multiClef() ? 'each clef you have on' : 'the bass clef') +
          ', what it is called and where to play it.',
      });
      links.push({
        route: 'rref',
        title: 'How rhythm is written',
        blurb: 'Values, dots, ties, rests, time signatures and how to count a bar out loud.',
      });
    }
    if (fam === 'ear') {
      links.push({
        route: 'ivref',
        title: 'What an interval is',
        blurb: 'All twelve, what they sound like, and why one shape works in every key.',
      });
    }
    return links.filter((link) => hasRoute(link.route));
  });

  function toggleDoff(id: string) {
    honmoon.settings.doff = toggledIn(honmoon.settings.doff || [], id);
    saveLocal();
    queueSave();
  }
</script>

{#if fam === 'scale'}
  <ScalesScreen />
{:else if group}
  <div class="sec">
    <div class="bar">
      <button class="ghost" id="back" onclick={() => go('home')}>← Practice</button>
      <span class="spacer"></span><span class="tick">{group.need}</span>
    </div>
  </div>
  <div class="sec">
    <h2>{group.n}</h2>
    <div class="card"><p class="note" style="margin:0">{group.sb}</p></div>
  </div>

  {#if fam === 'neck'}
    <div class="sec">
      <h2>Range</h2>
      <div class="levels" id="lvls">
        {#each LEVELS as range (range.id)}
          <button
            class="chip"
            data-lvl={range.id}
            aria-pressed={range.id === level.id}
            onclick={() => setSetting('level', range.id)}>{range.name}</button
          >
        {/each}
      </div>
      <div class="card" style="margin-top:10px"><AccRow /></div>
      <p class="note">
        {level.desc}{accOn() ? ', sharps and flats included' : ', natural notes only'} — {positions()
          .length} fretboard positions, {staffNotes().length} distinct notes on the staff. Both of these
        apply everywhere, not only here: the reading drills, the daily session and the maps on Stats all
        follow them.
      </p>
    </div>
  {/if}
  {#if fam === 'ear'}
    <div class="sec">
      <h2>Intervals in rotation</h2>
      <div class="levels">
        <button
          class="chip sm"
          data-set="ivset"
          data-val="basic"
          aria-pressed={honmoon.settings.ivset !== 'all'}
          onclick={() => setSetting('ivset', 'basic')}>The common six</button
        >
        <button
          class="chip sm"
          data-set="ivset"
          data-val="all"
          aria-pressed={honmoon.settings.ivset === 'all'}
          onclick={() => setSetting('ivset', 'all')}>All twelve</button
        >
      </div>
      <p class="note">
        {drills.some((def) => def.id === 'scalehear')
          ? 'Hear the scale draws on whatever is switched on over in Scales, not on this row. '
          : ''}Start with 2nds, 3rds, 4ths, 5ths and the octave — they cover most of what you will
        meet. The full set adds the tritone, 6ths and 7ths{drills.some((def) => def.id === 'chhear')
          ? ', and both chord drills widen from major/minor to seven types'
          : ''}.
      </p>
    </div>
  {/if}
  {#if fam === 'voice'}
    {@const voiceRange = vRange()}
    <div class="sec">
      <h2>Your voice</h2>
      <div class="card stack">
        <div class="setrow" style="border:none;padding:0">
          <span class="lbl">Range</span><span class="tick"
            >{voiceRange.set
              ? midiName(voiceRange.lo) + ' – ' + midiName(voiceRange.hi)
              : 'not measured — using ' +
                midiName(voiceRange.lo) +
                ' – ' +
                midiName(voiceRange.hi)}</span
          >
        </div>
        <p class="note">
          Everything sung here is transposed to sit inside that range, so nothing asks you for a
          note you do not have.
        </p>
        <div class="bar">
          {#if hasRoute('range')}<button
              class="ghost"
              data-go="range"
              onclick={() => go('range', { from: 'fam' })}>Find my range</button
            >{/if}
          <span class="spacer"></span>
          {#if hasRoute(voiceWarmup)}<button
              class="ghost"
              id="tovoicewarm"
              onclick={() => go(voiceWarmup)}>Vocal warm-up</button
            >{/if}
        </div>
      </div>
    </div>
  {/if}
  {#if noBassCount}
    <div class="sec">
      <div class="card stack">
        <p class="note">
          {noBassCount === 1 ? 'One drill here is' : noBassCount + ' drills here are'} put away because
          you said the bass is not with you. Nothing else in this family needs it.
        </p>
        <div class="bar">
          <button
            class="ghost"
            data-set="bass"
            data-val="true"
            onclick={() => setSetting('bass', true)}>I have it with me</button
          >
        </div>
      </div>
    </div>
  {/if}
  {#if hiddenCount}
    <div class="sec">
      <div class="card stack">
        <p class="note">
          {hiddenCount === 1 ? 'One more drill here is' : hiddenCount + ' more drills here are'} switched
          off: movable do and scale degrees — hearing a note as <i>the fifth of this key</i> rather
          than as
          <i>G</i>. It is a second language, and worth starting once what is below feels easy.
        </p>
        {#if hasRoute('setup')}<div class="bar">
            <button class="ghost" data-go="setup" onclick={() => go('setup')}
              >Turn it on in Setup</button
            >
          </div>{/if}
      </div>
    </div>
  {/if}
  {@render extra?.(fam)}

  {#if refs.length}
    <div class="sec">
      <h2>Read about it</h2>
      {#each refs as link (link.route)}
        <button class="drill ref" data-go={link.route} onclick={() => go(link.route)}
          ><span class="ic">{@html IC.book}</span><span
            ><span class="nm">{link.title}</span><br /><span class="sb">{link.blurb}</span></span
          ><span class="mast">→</span></button
        >
      {/each}
    </div>
  {/if}

  <div class="sec">
    <h2>Drills</h2>
    <div class="drills">
      {#each drills as def (def.id)}
        <button
          class="drill"
          class:muted={!drillOn(def.id)}
          data-drill={def.id}
          onclick={() => startDrill(def.id, fam)}
          ><span class="ic">{@html IC[def.ic]}</span>
          <span
            ><span class="nm"
              >{def.nm}{#if !drillOn(def.id)}
                <i class="offtag">not in the session</i>{/if}</span
            >
            <br /><span class="sb">{def.sb}</span></span
          ><span class="mast">{drillMastery(def.id).pct}%</span></button
        >
      {/each}
    </div>
    <div class="fold" class:open>
      <button
        class="foldhead"
        data-fold={fam}
        aria-expanded={open}
        onclick={() => {
          FOLD[fam] = !FOLD[fam];
        }}
        >In the daily session{offHere ? ' · ' + offHere + ' off' : ''}<span class="caret"
          >{open ? '▴' : '▾'}</span
        ></button
      >
      {#if open}
        <div class="levels" style="margin-top:10px">
          {#each drills as def (def.id)}
            <button
              class="chip sm tog"
              data-doff={def.id}
              aria-pressed={drillOn(def.id)}
              onclick={() => toggleDoff(def.id)}>{def.nm}</button
            >
          {/each}
        </div>
        <p class="note">
          Switch one off and the daily session stops asking for it. It stays in the list above, so
          you can still open it whenever you want to give it another go.
        </p>
      {/if}
    </div>
  </div>
{/if}
