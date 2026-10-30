<!--
  One screen answers "what shall I do now": the session that picks for you,
  and the families to go at by hand when you want to hammer one thing.
-->
<script lang="ts">
  import { honmoon, setSetting, queueSave } from '../../store/honmoon.svelte';
  import { todayKey } from '../../util/text';
  import { toggledIn } from '../../util/list';
  import { micUsable } from '../../audio/mic';
  import { bassHere } from '../../music/bass';
  import { allCards } from '../../learn/session';
  import { famMastery, streakDays, totals } from '../../learn/progress';
  import {
    appDrills,
    appGroups,
    famDrills,
    famHidden,
    famNoBass,
    groupOff,
    sessionGroups,
  } from '../../drills/registry.svelte';
  import { IC } from '../../notation/icons';
  import { startSession } from '../../drills/runtime.svelte';
  import { go } from '../../nav.svelte';
  import Stat from '../Stat.svelte';
  import BassRow from '../BassRow.svelte';

  /** A rough guess at how long one card takes, for the "about N minutes" line. */
  const SECONDS_PER_CARD = 8;
  const SLENS = [
    { n: 15, label: 'Short' },
    { n: 30, label: 'Standard' },
    { n: 50, label: 'Long' },
  ];
  const overall = $derived(totals());
  const today = $derived(honmoon.daily[todayKey()] || { n: 0, c: 0 });
  const sessionLength = $derived(honmoon.settings.slen || 30);
  const poolSize = $derived(allCards().length);
  const needsBass = $derived(appDrills().some((def) => def.bass));
  const groups = sessionGroups();
  const hasScales = appGroups().some((group) => group.k === 'scale');

  function toggleGroup(group: string) {
    const off = toggledIn(honmoon.settings.off || [], group);
    if (off.length >= appGroups().length) {
      return; // never switch everything off
    }
    honmoon.settings.off = off;
    queueSave();
  }
  const plural = (count: number, word: string) => count + ' ' + word + (count === 1 ? '' : 's');
  function open(group: string) {
    if (group === 'scale') {
      go('scales');
    } else {
      go('fam', { fam: group });
    }
  }
</script>

<div class="sec">
  <Stat
    items={[
      { v: today.n, k: 'Today' },
      { v: overall.n, k: 'All time' },
      { v: overall.n ? overall.acc + '%' : '—', k: 'Accuracy' },
      { v: streakDays(), k: 'Day streak' },
    ]}
  />
</div>

<div class="sec">
  <div class="card sesscard stack">
    <div>
      <div class="nm" style="font-family:var(--f-disp);font-size:22px;letter-spacing:.02em">
        Daily session
      </div>
      <p class="note" style="margin:4px 0 0">
        Your weakest cards from every family you leave switched on, mixed together. Miss one and it
        comes back later in the same session.
      </p>
    </div>
    <div class="levels">
      {#each SLENS as length (length.n)}
        <button
          class="chip sm"
          data-set="slen"
          data-val={length.n}
          aria-pressed={+sessionLength === length.n}
          onclick={() => setSetting('slen', length.n)}>{length.label} · {length.n}</button
        >
      {/each}
    </div>
    {#if groups.length > 1}
      <div>
        <div class="hint" style="margin-bottom:6px">Include</div>
        <div class="levels">
          {#each groups as group (group.k)}
            <button
              class="chip sm tog"
              data-grp={group.k}
              aria-pressed={!groupOff(group.k)}
              onclick={() => toggleGroup(group.k)}>{group.n}</button
            >
          {/each}
        </div>
      </div>
    {/if}
    {#if needsBass}<BassRow />{/if}
    {#if needsBass && bassHere() && !micUsable()}<p class="note" style="margin:0">
        With no microphone here, the three play-along drills ask you to mark yourself. They still
        count.
      </p>{/if}
    <button class="start" id="startsess" onclick={() => startSession('theory')}
      >Start session</button
    >
    <p class="note" style="text-align:center;margin:0">
      {sessionLength} cards · about {Math.max(
        1,
        Math.round((sessionLength * SECONDS_PER_CARD) / 60),
      )} minutes{poolSize && poolSize < sessionLength
        ? ' · only ' + poolSize + ' cards switched on, so some come round twice'
        : ''}
    </p>
  </div>
</div>

<div class="sec">
  <h2>Families</h2>
  <div class="fams">
    {#each appGroups() as group (group.k)}
      {@const drills = famDrills(group.k)}
      {@const progress = famMastery(group.k)}
      {@const gated = famHidden(group.k)}
      {@const noBass = famNoBass(group.k)}
      <button class="fam" data-open={group.k} onclick={() => open(group.k)}>
        <span class="ic">{@html IC[group.ic]}</span>
        <span class="txt"
          ><span class="nm">{group.n}</span>
          <span class="sb">{group.sb}</span>
          <span class="meta"
            >{plural(drills.length, 'drill')}{gated
              ? ' · ' + gated + ' more waiting in Setup'
              : ''}{noBass ? ' · ' + noBass + ' waiting for the bass' : ''}{progress.pct
              ? ' · ' + progress.pct + '% solid'
              : ''}</span
          ></span
        >
        <span class="mast">→</span></button
      >
    {/each}
  </div>
  <p class="note">
    Switching a family off here takes it out of the daily session; it stays open to practise by
    hand.{hasScales
      ? ' Scales also have a session of their own, on their page, which ignores this row.'
      : ''}
  </p>
</div>
