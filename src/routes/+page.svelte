<script>
  import { onMount, onDestroy } from "svelte";
  import { entries, activeFeeding, activeSleep, session } from "$lib/stores.js";
  import {
    fmtTime,
    fmtSeconds,
    fmtDuration,
    isToday,
    getLastBreastSide,
    refresh,
  } from "$lib/appState.js";
  import { syncNow } from "$lib/sync.js";
  import Icon from "$lib/components/Icon.svelte";
  import Emblem from "$lib/components/Emblem.svelte";

  $: todaysFeedings = $entries.filter(
    (e) => e.type === "feeding" && e.end_time && isToday(e.start_time),
  );
  $: todaysSleep = $entries.filter(
    (e) => e.type === "sleep" && e.end_time && isToday(e.start_time),
  );

  $: totalSleepMinutesToday = todaysSleep.reduce(
    (sum, e) =>
      sum + Math.round((new Date(e.end_time) - new Date(e.start_time)) / 60000),
    0,
  );

  // Wake window = gap between the end of one sleep and the start of the next.
  // Counts gaps that finished today (including the one after overnight sleep).
  $: wakeGaps = (() => {
    const sleeps = $entries
      .filter((e) => e.type === "sleep")
      .slice()
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
    const gaps = [];
    for (let i = 1; i < sleeps.length; i++) {
      const prev = sleeps[i - 1];
      const next = sleeps[i];
      if (prev.end_time && isToday(next.start_time)) {
        const gap = new Date(next.start_time) - new Date(prev.end_time);
        if (gap > 0) gaps.push(gap);
      }
    }
    return gaps;
  })();
  $: avgWakeMinutes = wakeGaps.length
    ? Math.round(wakeGaps.reduce((a, b) => a + b, 0) / wakeGaps.length / 60000)
    : null;

  $: todaysBreast = todaysFeedings.filter((e) => e.feed_type === "breast");
  $: leftSecondsToday = todaysBreast.reduce(
    (sum, e) => sum + (e.left_seconds || 0),
    0,
  );
  $: rightSecondsToday = todaysBreast.reduce(
    (sum, e) => sum + (e.right_seconds || 0),
    0,
  );

  $: totalBottleOzToday = todaysFeedings
    .filter((e) => e.feed_type === "bottle")
    .reduce((sum, e) => sum + (e.amount_oz || 0), 0);

  function fmtMinutes(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  $: lastFeeding = $entries.find((e) => e.type === "feeding" && e.start_time);
  $: lastSide = getLastBreastSide($entries);
  let refreshing = false;

  async function manualRefresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      // keep the spinner up briefly so the tap clearly registers
      await Promise.all([syncNow(), new Promise((r) => setTimeout(r, 600))]);
    } catch (e) {
      console.error("Refresh failed", e);
      await refresh();
    }
    refreshing = false;
  }

  // ticks so "time since last feed" stays current
  let now = new Date();
  let tick;
  onMount(() => (tick = setInterval(() => (now = new Date()), 30000)));
  onDestroy(() => clearInterval(tick));

  function ago(iso, current) {
    const mins = Math.max(0, Math.floor((current - new Date(iso)) / 60000));
    if (mins < 1) return "just now";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return (h > 0 ? `${h}h ${m}m` : `${m}m`) + " ago";
  }

  $: lastSleep = $entries.find((e) => e.type === "sleep" && e.end_time);

  // Total time of a finished feed: left + right for breast, timer for bottle
  function feedSeconds(e) {
    const timed =
      e.feed_type === "bottle"
        ? e.bottle_elapsed_seconds || 0
        : (e.left_seconds || 0) + (e.right_seconds || 0);
    return (
      timed ||
      Math.round((new Date(e.end_time) - new Date(e.start_time)) / 1000)
    );
  }
</script>

<!--<img class="logo" src="/logo.png" alt="" width="104" height="104" />
<h1>MilkComa</h1>-->

{#if !$session}
  <p class="signin-nudge">
    Not syncing yet — <a href="/profile">sign in</a> to sync across devices.
  </p>
{/if}

<Emblem
  size={210}
  a="var(--magenta)"
  b="var(--cyan)"
  spin={!!($activeFeeding || $activeSleep)}
>
  <span class="emb-num">{todaysFeedings.length}</span><span class="emb-cap"
    >feedings today</span
  >
</Emblem>

<section class="status-cards" style="margin-top: 1.5rem">
  <div class="card">
    <span class="card-label">Feeding</span>
    {#if lastFeeding}
      {#if lastSide}
        <span class="card-sub"
          >last side: <span
            class="card-value"
            style="color: var({lastSide === 'left' ? '--magenta' : '--cyan'})"
          >
            {lastSide === "left" ? "Left" : "Right"}
          </span>
        </span>
      {:else}
        <span class="card-value">&mdash;</span>
        <span class="card-sub">no breastfeed yet</span>
      {/if}
      <span class="card-sub">{ago(lastFeeding.start_time, now)}</span>
      <span class="card-sub">{fmtSeconds(feedSeconds(lastFeeding))} total</span>
    {:else}
      <span class="card-value">None yet</span>
    {/if}
  </div>

  <div class="card">
    <span class="card-label">Sleep</span>
    {#if lastSleep}
      <span class="card-value"
        >{fmtDuration(lastSleep.start_time, lastSleep.end_time)}</span
      >
      <span class="card-sub">awoke at {fmtTime(lastSleep.end_time)}</span>
      <span class="card-sub">started at {fmtTime(lastSleep.start_time)}</span>
    {:else}
      <span class="card-value">None yet</span>
    {/if}
  </div>
</section>

<section class="stats">
  <h2>Today</h2>
  <ul>
    <li>
      <strong style="color: var(--magenta)"
        >{fmtMinutes(Math.round(leftSecondsToday / 60))}</strong
      > left side
    </li>
    <li>
      <strong style="color: var(--cyan)"
        >{fmtMinutes(Math.round(rightSecondsToday / 60))}</strong
      > right side
    </li>
    {#if totalBottleOzToday > 0}
      <li><strong>{totalBottleOzToday} oz</strong> total bottles</li>
    {/if}
    <li><strong>{fmtMinutes(totalSleepMinutesToday)}</strong> total sleep</li>
    <li>
      <strong
        >{avgWakeMinutes === null ? "—" : fmtMinutes(avgWakeMinutes)}</strong
      > avg wake window
    </li>
  </ul>
</section>

<button
  class="secondary refresh"
  class:spinning={refreshing}
  on:click={manualRefresh}
>
  <Icon name="refresh" size={20} />
  <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
</button>
