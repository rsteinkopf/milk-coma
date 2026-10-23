<script>
  import "@fontsource/bungee";
  import "@fontsource/outfit/400.css";
  import "@fontsource/outfit/600.css";
  import "@fontsource/outfit/800.css";
  import "../app.css";
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { supabase } from "$lib/supabase.js";
  import {
    syncNow,
    setSyncListener,
    startRealtimeSync,
    stopRealtimeSync,
    startPeriodicSync,
  } from "$lib/sync.js";
  import { refresh } from "$lib/appState.js";
  import { session } from "$lib/stores.js";
  import Icon from "$lib/components/Icon.svelte";

  const tabs = [
    { href: "/", label: "Home", icon: "stats" },
    { href: "/feed", label: "Feed", icon: "drop" },
    { href: "/sleep", label: "Sleep", icon: "moon" },
    { href: "/profile", label: "Profile", icon: "user" },
  ];

  let stopPeriodicSync;

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    session.set(data.session);
    supabase.auth.onAuthStateChange((_event, s) => session.set(s));

    setSyncListener(refresh);
    await refresh();
    syncNow();
    startRealtimeSync(refresh);
    stopPeriodicSync = startPeriodicSync();
  });

  onDestroy(() => {
    stopRealtimeSync();
    stopPeriodicSync?.();
  });
</script>

<div class="backdrop"></div>

<div class="content">
  <slot />
</div>

<nav class="footer-nav">
  {#each tabs as t}
    <a href={t.href} class:active={$page.url.pathname === t.href}>
      <Icon name={t.icon} size={26} />
      <span>{t.label}</span>
    </a>
  {/each}
</nav>
