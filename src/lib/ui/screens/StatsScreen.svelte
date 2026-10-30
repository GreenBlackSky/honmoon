<!-- Stats: every section the original had, and each app picks the ones that mean something for it. -->
<script lang="ts">
  import { honmoon, mastery, resetProgress, syncLabel } from '../../store/honmoon.svelte';
  import { STRINGS } from '../../music/bass';
  import { clefDef, enabledClefs, parseST, staffNotes } from '../../music/clefs';
  import { mdoOn, noteName, pcOf } from '../../music/notes';
  import { SCALES, enabledScales, rootName, rootPool, scaleOn } from '../../music/scales';
  import { dayKey } from '../../util/text';
  import { heatFretboard } from '../../notation/fretboard';
  import { heatStaffSVG } from '../../notation/staff';
  import { describeCard } from '../../learn/describe';
  import { parseMD } from '../../learn/pools';
  import { streakDays, totals } from '../../learn/progress';
  import { scaleMatrix, scaleStats } from '../scaleboard';
  import Stat from '../Stat.svelte';
  import DataCard from '../DataCard.svelte';
  import type { StatsSection } from '../types';

  interface Props {
    sections: StatsSection[];
    /** tempo histories to chart: warm-up families, rhythm levels */
    tempoRows?: { k: string; n: string }[];
    /** what to say when there is no tempo history yet */
    tempoEmpty?: string;
    tempoNote?: string;
  }
  const {
    sections,
    tempoRows = [],
    tempoEmpty = 'Nothing logged yet.',
    tempoNote = '',
  }: Props = $props();
  const has = (section: StatsSection) => sections.includes(section);

  const DAYS_SHOWN = 14;
  const MS_PER_MINUTE = 60000;
  /** A card at this mastery counts as solid. */
  const SOLID = 5;
  /** The weakest-spots list wants at least this many tries and this error rate. */
  const ROUGH_MIN_TRIES = 2;
  const ROUGH_MIN_ERROR_RATE = 0.25;
  const TEMPO_HISTORY_SHOWN = 24;

  type Tally = { s: number; c: number; n: number };
  type Area = 'theory' | 'scales' | 'ear' | 'rhythm' | 'key';
  const emptyTally = (): Tally => ({ s: 0, c: 0, n: 0 });
  /** Which Stats area a card counts towards, by its id prefix. */
  function areaOf(id: string): Area {
    const prefix = id.slice(0, 3);
    if (prefix === 'sc:') {
      return 'scales';
    }
    if (prefix === 'iv:' || prefix === 'ch:' || prefix === 'se:') {
      return 'ear';
    }
    if (prefix === 'rh:') {
      return 'rhythm';
    }
    return prefix === 'md:' ? 'key' : 'theory';
  }
  /** The pitch class a note card asks about, or -1 for cards that are not about one note. */
  function pitchClassOf(id: string): number {
    const prefix = id.slice(0, 3);
    if (prefix === 'fb:') {
      const [, string, fret] = id.split(':').map(Number);
      return pcOf(STRINGS[string].open + fret);
    }
    if (prefix === 'st:') {
      return pcOf(parseST(id).m);
    }
    if (prefix === 'md:') {
      return parseMD(id).pc;
    }
    if (prefix === 'tr:' || prefix === 'pl:') {
      return +id.slice(3);
    }
    return -1;
  }

  const overall = $derived(totals());
  const days = $derived.by(() => {
    const out: { k: string; n: number }[] = [];
    const now = new Date();
    for (let back = DAYS_SHOWN - 1; back >= 0; back--) {
      const key = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back));
      out.push({ k: key, n: (honmoon.daily[key] || { n: 0 }).n });
    }
    return out;
  });
  const busiestCount = $derived(Math.max(1, ...days.map((day) => day.n)));
  const busiest = $derived(days.reduce((best, day) => (day.n > best.n ? day : best), days[0]));
  const minutes = $derived.by(() => {
    let ms = 0;
    for (const key in honmoon.daily) {
      ms += honmoon.daily[key].ms;
    }
    return Math.round(ms / MS_PER_MINUTE);
  });
  const area = $derived.by(() => {
    const tallies: Record<Area, Tally> = {
      theory: emptyTally(),
      scales: emptyTally(),
      ear: emptyTally(),
      rhythm: emptyTally(),
      key: emptyTally(),
    };
    for (const id in honmoon.cards) {
      const stats = honmoon.cards[id];
      if (!stats || !stats.s) {
        continue;
      }
      const tally = tallies[areaOf(id)];
      tally.s += stats.s;
      tally.c += stats.c;
      tally.n++;
    }
    return tallies;
  });
  const grand = $derived(area.theory.s + area.scales.s + area.ear.s + area.rhythm.s + area.key.s);
  const byPitchClass = $derived.by(() => {
    const out = Array.from({ length: 12 }, () => ({ s: 0, c: 0 }));
    for (const id in honmoon.cards) {
      const pc = pitchClassOf(id);
      if (pc < 0) {
        continue;
      }
      out[pc].s += honmoon.cards[id].s;
      out[pc].c += honmoon.cards[id].c;
    }
    return out;
  });
  /** Bar colour for a note's hit rate. */
  function accuracyColour(tries: number, accuracy: number): string {
    if (!tries) {
      return 'var(--line-2)';
    }
    if (accuracy >= 0.9) {
      return 'var(--good)';
    }
    return accuracy >= 0.7 ? 'var(--mid)' : 'var(--bad)';
  }
  const staffSummary = $derived.by(() => {
    let met = 0;
    let total = 0;
    let solid = 0;
    for (const note of staffNotes()) {
      total++;
      const stats = honmoon.cards[note.id];
      if (stats && stats.s) {
        met++;
        if (mastery(note.id) >= SOLID) {
          solid++;
        }
      }
    }
    return { met, total, solid };
  });
  const scaleSummary = $derived(scaleStats());
  type Weakest = { r: number; m: number };
  const scaleRows = $derived(
    SCALES.filter(
      (scale) =>
        scaleOn(scale.id) &&
        rootPool().some((root) => honmoon.cards['sc:' + scale.id + ':' + root]),
    )
      .map((scale) => {
        let masterySum = 0;
        let keys = 0;
        let worst: Weakest | null = null;
        for (const root of rootPool()) {
          const id = 'sc:' + scale.id + ':' + root;
          const stats = honmoon.cards[id];
          if (!stats || !stats.s) {
            continue;
          }
          const level = mastery(id);
          masterySum += level;
          keys++;
          if (worst === null || level < worst.m) {
            worst = { r: root, m: level };
          }
        }
        return { scale, masterySum, keys, worst: worst as Weakest | null };
      })
      .filter((row) => row.keys),
  );
  const rough = $derived.by(() => {
    const out: { k: string; wr: number; s: number }[] = [];
    for (const id in honmoon.cards) {
      const stats = honmoon.cards[id];
      if (!stats || stats.s < ROUGH_MIN_TRIES) {
        continue;
      }
      const errorRate = (stats.s - stats.c) / stats.s;
      if (errorRate < ROUGH_MIN_ERROR_RATE) {
        continue;
      }
      out.push({ k: id, wr: errorRate, s: stats.s });
    }
    return out.sort((a, b) => b.wr - a.wr || b.s - a.s);
  });
  const tempoShown = $derived(
    tempoRows.filter((row) => {
      const tempo = honmoon.tempo[row.k];
      return tempo && (tempo.hist || []).length;
    }),
  );
  const TEMPO_COLOURS: Record<string, string> = { clean: 'var(--good)', fast: 'var(--bad)' };
  const tempoColour = (verdict: string) => TEMPO_COLOURS[verdict] || 'var(--mid)';
  const pctOf = (got: number, total: number) => (total ? Math.round((100 * got) / total) : 0);
  const accOf = (tally: { s: number; c: number }) =>
    tally.s ? Math.round((100 * tally.c) / tally.s) : null;
  const plural = (count: number, word: string) => count + ' ' + word + (count === 1 ? '' : 's');

  function reset() {
    if (confirm('Erase every answer and start from zero?')) {
      resetProgress();
    }
  }
</script>

{#snippet split(label: string, tally: { s: number; c: number })}
  {@const acc = accOf(tally)}
  <div class="splitrow">
    <span class="lbl">{label}</span>
    <div class="sbar"><i style="width:{pctOf(tally.s, grand)}%"></i></div>
    <span class="tick">{tally.s}{acc != null ? ' · ' + acc + '%' : ''}</span>
  </div>
{/snippet}

{#if has('overall')}
  <div class="sec">
    <h2>Overall</h2>
    <Stat
      items={[
        { v: overall.n, k: 'Answers' },
        { v: overall.n ? overall.acc + '%' : '—', k: 'Accuracy' },
        { v: minutes, k: 'Minutes' },
        { v: streakDays(), k: 'Day streak' },
      ]}
    />
  </div>
{/if}

{#if has('twoweeks')}
  <div class="sec">
    <h2>Last two weeks</h2>
    <div class="card">
      <div class="spark">
        {#each days as day (day.k)}<i
            class:z={!day.n}
            style="height:{Math.max(3, Math.round((100 * day.n) / busiestCount))}%"
            title="{day.k}: {day.n}"
          ></i>{/each}
      </div>
      <div class="axis">
        <span>{days[0].k.slice(5)}</span><span>{days[DAYS_SHOWN - 1].k.slice(5)}</span>
      </div>
      <p class="note">
        {busiest.n
          ? 'Busiest day was ' + busiest.k.slice(5) + ' with ' + busiest.n + ' answers.'
          : 'Nothing logged in the last fortnight. Ten minutes most days beats an hour on Sunday.'}
      </p>
    </div>
  </div>
{/if}

{#if has('areas')}
  <div class="sec">
    <h2>Where the time goes</h2>
    <div class="card stack">
      {#if grand}
        {@render split('Drills', area.theory)}
        {@render split('Scales', area.scales)}
        {@render split('Ear', area.ear)}
        {@render split('Rhythm', area.rhythm)}
        {#if area.key.s || mdoOn()}{@render split('Key & degrees', area.key)}{/if}
        <p class="note">
          Answers in each area, and how often you were right. {area.theory.n} notes, {area.scales.n} scale-and-key
          pairs, {area.ear.n} intervals or chords{area.rhythm.n
            ? ', ' + plural(area.rhythm.n, 'rhythm card')
            : ''}{area.key.n ? ' and ' + plural(area.key.n, 'note-in-a-key pair') : ''} met so far.
        </p>
      {:else}<p class="note">
          Nothing answered yet. Start a session on the Practice tab and this fills in.
        </p>{/if}
    </div>
  </div>
{/if}

{#if has('bynote')}
  <div class="sec">
    <h2>Accuracy by note</h2>
    <div class="card">
      <div class="pcbars">
        {#each byPitchClass as tally, pc (pc)}
          {@const acc = tally.s ? tally.c / tally.s : 0}
          <div class="b">
            <i
              style="height:{!tally.s
                ? 6
                : Math.max(8, Math.round(acc * 100))}%;background:{accuracyColour(tally.s, acc)}"
            ></i>
          </div>
        {/each}
      </div>
      <div class="pclabels">
        {#each byPitchClass as _, p (p)}<span>{noteName(p, 'en', honmoon.settings.pref)}</span
          >{/each}
      </div>
      <p class="note">
        {area.theory.s
          ? 'Your hit rate for each note wherever it turns up — on the neck, on the staff, or in translation. Grey means not met yet.'
          : 'Grey all the way across: no note drills answered yet.'}
      </p>
    </div>
  </div>
{/if}

{#if has('neck')}
  <div class="sec">
    <h2>The neck</h2>
    <div class="card">
      <div class="fbwrap fit">{@html heatFretboard()}</div>
      <div class="legend" style="margin-top:10px">
        <span><b style="border:1.6px solid var(--ink-3);border-radius:50%"></b>not tried</span>
        <span><b style="background:var(--bad);border-radius:50%"></b>shaky</span>
        <span><b style="background:var(--mid);border-radius:50%"></b>getting there</span>
        <span><b style="background:var(--good);border-radius:50%"></b>solid</span>
      </div>
      <p class="note">
        Each dot is one position on the neck. It fills in as you answer it correctly; a wrong answer
        knocks it back two steps.
      </p>
    </div>
  </div>
{/if}

{#if has('staff')}
  {@const clefs = enabledClefs()}
  <div class="sec">
    <h2>The staff</h2>
    <div class="card">
      {#each clefs as clef (clef)}
        {@const svg = heatStaffSVG(clef)}
        {#if svg}
          {#if clefs.length > 1}<div class="tick" style="margin:6px 0 2px">
              {clefDef(clef).n}
            </div>{/if}
          <div class="hswrap">{@html svg}</div>
        {/if}
      {/each}
      <div class="legend" style="margin-top:10px">
        <span><b style="background:var(--line-2);border-radius:50%"></b>not tried</span>
        <span><b style="background:var(--bad);border-radius:50%"></b>shaky</span>
        <span><b style="background:var(--mid);border-radius:50%"></b>getting there</span>
        <span><b style="background:var(--good);border-radius:50%"></b>solid</span>
      </div>
      <p class="note">
        {staffSummary.met
          ? staffSummary.met +
            ' of ' +
            staffSummary.total +
            ' notes met, ' +
            staffSummary.solid +
            ' solid. The same note read on two clefs is two separate cards — knowing where D sits in bass does not tell you where it sits in tenor.'
          : 'One notehead per note the reading drills can ask you for, in pitch order. None met yet — a reading drill fills these in.'}
      </p>
    </div>
  </div>
{/if}

{#if has('scales')}
  <div class="sec">
    <h2>Scales</h2>
    <div class="card">
      {#if enabledScales().length}
        {@html scaleMatrix()}
        <div class="legend" style="margin-top:10px">
          <span><b class="m0"></b>not met</span><span><b class="m1"></b>shaky</span>
          <span><b class="m3"></b>getting there</span><span><b class="m5"></b>solid</span>
        </div>
        <p class="note">
          {scaleSummary.seen
            ? scaleSummary.seen +
              ' of ' +
              scaleSummary.total +
              ' pairs met, ' +
              scaleSummary.solid +
              ' solid.'
            : 'One square per scale in one key. None met yet — a scale session fills these in.'}
        </p>
      {:else}<p class="note">No scales switched on. Turn some on from the Scales page.</p>{/if}
    </div>
  </div>
{/if}

{#if has('byscale') && scaleRows.length}
  <div class="sec">
    <h2>By scale</h2>
    <div class="card stack">
      {#each scaleRows as row (row.scale.id)}
        <div class="setrow">
          <span class="lbl">{row.scale.n}</span><span class="tick"
            >{Math.round((100 * row.masterySum) / (row.keys * SOLID))}% over {plural(
              row.keys,
              'key',
            )}{row.worst && row.worst.m < 3 ? ' · weakest ' + rootName(row.worst.r) : ''}</span
          >
        </div>
      {/each}
    </div>
  </div>
{/if}

{#if has('weakest')}
  <div class="sec">
    <h2>Weakest spots</h2>
    <div class="card stack">
      {#if rough.length}
        {#each rough.slice(0, 10) as spot (spot.k)}<div class="setrow">
            <span class="lbl">{describeCard(spot.k)}</span><span class="tick"
              >{Math.round((1 - spot.wr) * 100)}% of {spot.s}</span
            >
          </div>{/each}
        <p class="note">
          These come round sooner and more often than everything else until they stick.
        </p>
      {:else}<p class="note">
          {overall.n
            ? 'Nothing below 75% yet with enough attempts to judge.'
            : 'Answer a few sessions and the things you keep missing will be listed here.'}
        </p>{/if}
    </div>
  </div>
{/if}

{#if has('tempo')}
  <div class="sec">
    <h2>Tempo</h2>
    <div class="card stack">
      {#each tempoShown as row (row.k)}
        {@const tempo = honmoon.tempo[row.k]}
        {@const history = tempo.hist.slice(-TEMPO_HISTORY_SHOWN)}
        {@const lo = Math.min(...history.map((entry) => entry.bpm))}
        {@const hi = Math.max(...history.map((entry) => entry.bpm))}
        {@const span = Math.max(6, hi - lo)}
        <div>
          <div class="setrow" style="border:none;padding-bottom:4px">
            <span class="lbl">{row.n}</span>
            <span class="tick">{tempo.bpm} bpm{tempo.best ? ' · best ' + tempo.best : ''}</span>
          </div>
          <div class="tline">
            {#each history as entry, i (i)}
              <i
                style="height:{Math.max(
                  6,
                  Math.round((100 * (entry.bpm - lo + 2)) / (span + 4)),
                )}%;background:{tempoColour(entry.v)}"
                title="{entry.d} {entry.bpm} bpm"
              ></i>
            {/each}
          </div>
        </div>
      {/each}
      <p class="note">{tempoShown.length ? tempoNote : tempoEmpty}</p>
    </div>
  </div>
{/if}

{#if has('data')}<DataCard />{/if}

<div class="sec">
  <div class="bar">
    <button class="ghost" id="reset" onclick={reset}>Reset all progress</button>
    <span class="tick">{syncLabel()}</span>
  </div>
</div>
