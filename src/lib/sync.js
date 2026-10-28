import { get } from 'svelte/store';
import { supabase } from './supabase.js';
import { getUnsyncedEntries, markSynced, upsertFromRemote } from './db.js';
import { household } from './stores.js';

let realtimeChannel = null;

export async function loadHousehold() {
	const { data: u } = await supabase.auth.getUser();
	if (!u?.user) {
		household.set(null);
		return null;
	}
	const { data } = await supabase
		.from('household_members')
		.select('household_id, households(invite_code)')
		.eq('user_id', u.user.id)
		.maybeSingle();
	const h = data ? { id: data.household_id, invite_code: data.households?.invite_code } : null;
	household.set(h);
	return h;
}

export async function pushLocalChanges() {
	const unsynced = await getUnsyncedEntries();
	if (!unsynced.length) return;
	const { data: userData } = await supabase.auth.getUser();
	if (!userData?.user) return; // not signed in yet — retry later
	if (!get(household)) await loadHousehold();

	for (const entry of unsynced) {
		const { error } = await supabase.from('entries').upsert({
			id: entry.id,
			// keep the original owner when a partner edits their entry
			user_id: entry.user_id ?? userData.user.id,
			household_id: get(household)?.id ?? entry.household_id ?? null,
			type: entry.type,
			feed_type: entry.feed_type ?? null,
			sleep_type: entry.sleep_type ?? null,
			start_time: entry.start_time,
			end_time: entry.end_time,
			left_seconds: entry.left_seconds ?? null,
			right_seconds: entry.right_seconds ?? null,
			active_side: entry.active_side ?? null,
			side_started_at: entry.side_started_at ?? null,
			last_side: entry.last_side ?? null,
			amount_oz: entry.amount_oz ?? null,
			bottle_content: entry.bottle_content ?? null,
			breast_milk_oz: entry.breast_milk_oz ?? null,
			formula_oz: entry.formula_oz ?? null,
			bottle_elapsed_seconds: entry.bottle_elapsed_seconds ?? null,
			bottle_running_since: entry.bottle_running_since ?? null,
			notes: entry.notes ?? '',
			deleted: entry.deleted,
			updated_at: entry.updated_at
		});

		if (!error) {
			await markSynced(entry.id);
		} else {
			console.error('Sync push failed for', entry.id, error);
		}
	}
}

export async function pullRemoteChanges() {
	const { data: userData } = await supabase.auth.getUser();
	if (!userData?.user) return;

	// RLS returns the user's own entries plus their household's
	const { data, error } = await supabase.from('entries').select('*');
	if (error) {
		console.error('Sync pull failed', error);
		return;
	}
	for (const row of data) {
		await upsertFromRemote(row);
	}
}

// Lets the app re-read local data into the UI after every sync
let onSynced = null;
export function setSyncListener(fn) {
	onSynced = fn;
}

export async function syncNow() {
	try {
		await pushLocalChanges();
		await pullRemoteChanges();
	} finally {
		onSynced?.();
	}
}

// Subscribe to changes made by other devices/accounts so the UI updates live.
export function startRealtimeSync(onChange) {
	stopRealtimeSync();
	realtimeChannel = supabase
		.channel('entries-changes')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, async (payload) => {
			if (payload.new) {
				await upsertFromRemote(payload.new);
			}
			onChange?.();
		})
		.subscribe();
	return realtimeChannel;
}

export function stopRealtimeSync() {
	if (realtimeChannel) {
		supabase.removeChannel(realtimeChannel);
		realtimeChannel = null;
	}
}

// Call periodically (e.g. every 30s) and whenever the app comes back online.
export function startPeriodicSync(intervalMs = 30000) {
	const id = setInterval(syncNow, intervalMs);
	const onVisible = () => {
		if (!document.hidden) syncNow();
	};
	window.addEventListener('online', syncNow);
	document.addEventListener('visibilitychange', onVisible);
	return () => {
		clearInterval(id);
		window.removeEventListener('online', syncNow);
		document.removeEventListener('visibilitychange', onVisible);
	};
}