import { get } from 'svelte/store';
import { addEntry, updateEntry, softDeleteEntry, getAllEntries } from './db.js';
import { syncNow } from './sync.js';
import { entries, activeFeeding, activeSleep } from './stores.js';

export async function refresh() {
	const all = await getAllEntries();
	entries.set(all);
	activeFeeding.set(all.find((e) => e.type === 'feeding' && !e.end_time) ?? null);
	activeSleep.set(all.find((e) => e.type === 'sleep' && !e.end_time) ?? null);
}

export async function startBreastFeeding(side) {
	const now = new Date().toISOString();
	await addEntry({
		type: 'feeding',
		feed_type: 'breast',
		start_time: now,
		end_time: null,
		left_seconds: 0,
		right_seconds: 0,
		active_side: side,
		side_started_at: now,
		last_side: side,
		notes: ''
	});
	await refresh();
	syncNow();
}

export async function switchBreastSide() {
	const active = get(activeFeeding);
	if (!active || active.feed_type !== 'breast') return;
	const now = new Date().toISOString();
	const elapsedSec = Math.round((new Date(now) - new Date(active.side_started_at)) / 1000);
	const key = active.active_side === 'left' ? 'left_seconds' : 'right_seconds';
	const newSide = active.active_side === 'left' ? 'right' : 'left';
	await updateEntry(active.id, {
		[key]: (active[key] || 0) + elapsedSec,
		active_side: newSide,
		side_started_at: now,
		last_side: newSide
	});
	await refresh();
	syncNow();
}

export async function pauseBreastFeeding() {
	const active = get(activeFeeding);
	if (!active || active.feed_type !== 'breast' || !active.active_side) return;
	const now = new Date().toISOString();
	const elapsedSec = Math.round((new Date(now) - new Date(active.side_started_at)) / 1000);
	const key = active.active_side === 'left' ? 'left_seconds' : 'right_seconds';
	await updateEntry(active.id, {
		[key]: (active[key] || 0) + elapsedSec,
		active_side: null,
		side_started_at: null
	});
	await refresh();
	syncNow();
}

export async function resumeBreastFeeding(side) {
	const active = get(activeFeeding);
	if (!active || active.feed_type !== 'breast' || active.active_side) return;
	const now = new Date().toISOString();
	await updateEntry(active.id, {
		active_side: side,
		side_started_at: now,
		last_side: side
	});
	await refresh();
	syncNow();
}

export async function stopBreastFeeding() {
	const active = get(activeFeeding);
	if (!active || active.feed_type !== 'breast') return;
	const now = new Date().toISOString();
	if (active.active_side) {
		const elapsedSec = Math.round((new Date(now) - new Date(active.side_started_at)) / 1000);
		const key = active.active_side === 'left' ? 'left_seconds' : 'right_seconds';
		await updateEntry(active.id, {
			[key]: (active[key] || 0) + elapsedSec,
			active_side: null,
			side_started_at: null,
			end_time: now
		});
	} else {
		// already paused — nothing running to fold in
		await updateEntry(active.id, { end_time: now });
	}
	await refresh();
	syncNow();
}

export async function startBottleFeeding() {
	const now = new Date().toISOString();
	await addEntry({
		type: 'feeding',
		feed_type: 'bottle',
		start_time: now,
		end_time: null,
		amount_oz: null,
		bottle_elapsed_seconds: 0,
		bottle_running_since: now,
		notes: ''
	});
	await refresh();
	syncNow();
}

export async function pauseBottleFeeding() {
	const active = get(activeFeeding);
	if (!active || active.feed_type !== 'bottle' || !active.bottle_running_since) return;
	const now = new Date().toISOString();
	const elapsedSec = Math.round((new Date(now) - new Date(active.bottle_running_since)) / 1000);
	await updateEntry(active.id, {
		bottle_elapsed_seconds: (active.bottle_elapsed_seconds || 0) + elapsedSec,
		bottle_running_since: null
	});
	await refresh();
	syncNow();
}

export async function resumeBottleFeeding() {
	const active = get(activeFeeding);
	if (!active || active.feed_type !== 'bottle' || active.bottle_running_since) return;
	await updateEntry(active.id, { bottle_running_since: new Date().toISOString() });
	await refresh();
	syncNow();
}

export async function stopBottleFeeding({ content, breastMilkOz = 0, formulaOz = 0 }) {
	const active = get(activeFeeding);
	if (!active || active.feed_type !== 'bottle') return;
	const total = Math.round((breastMilkOz + formulaOz) * 100) / 100;
	if (!content || total <= 0) return; // an amount is required before a bottle feed can be marked done
	const now = new Date().toISOString();
	const fields = {
		bottle_content: content,
		breast_milk_oz: breastMilkOz,
		formula_oz: formulaOz,
		amount_oz: total,
		end_time: now
	};
	if (active.bottle_running_since) {
		const elapsedSec = Math.round((new Date(now) - new Date(active.bottle_running_since)) / 1000);
		fields.bottle_elapsed_seconds = (active.bottle_elapsed_seconds || 0) + elapsedSec;
		fields.bottle_running_since = null;
	}
	await updateEntry(active.id, fields);
	await refresh();
	syncNow();
}

// Ounces of each milk type for the chosen bottle contents (inputs are strings)
export function bottleAmounts(content, breastMilkStr, formulaStr) {
	return {
		breastMilkOz: content === 'formula' ? 0 : parseFloat(breastMilkStr) || 0,
		formulaOz: content === 'breast_milk' ? 0 : parseFloat(formulaStr) || 0
	};
}

export function bottleInputsValid(content, breastMilkStr, formulaStr) {
	const { breastMilkOz, formulaOz } = bottleAmounts(content, breastMilkStr, formulaStr);
	if (content === 'breast_milk') return breastMilkOz > 0;
	if (content === 'formula') return formulaOz > 0;
	return breastMilkOz > 0 && formulaOz > 0; // combo needs both
}

// Most recent side used across all breast-feeding entries (including the
// active one, since last_side updates live as sides are switched).
export function getLastBreastSide(entriesList) {
	const breastEntries = entriesList
		.filter((e) => e.type === 'feeding' && e.feed_type === 'breast' && e.last_side)
		.sort((a, b) => b.start_time.localeCompare(a.start_time));
	return breastEntries[0]?.last_side ?? null;
}

export function fmtSeconds(totalSeconds) {
	const s = Math.round(totalSeconds);
	const mins = Math.floor(s / 60);
	const secs = s % 60;
	return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export async function startSleep(sleepType = 'night') {
	await addEntry({
		type: 'sleep',
		sleep_type: sleepType,
		start_time: new Date().toISOString(),
		end_time: null,
		notes: ''
	});
	await refresh();
	syncNow();
}

export async function stopSleep() {
	const active = get(activeSleep);
	if (!active) return;
	await updateEntry(active.id, { end_time: new Date().toISOString() });
	await refresh();
	syncNow();
}

export function fmtTime(iso) {
	return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(iso) {
	const d = new Date(iso);
	const pad = (n) => String(n).padStart(2, '0');
	return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${pad(d.getFullYear() % 100)}`;
}

export function fmtDuration(start, end) {
	const ms = new Date(end ?? Date.now()) - new Date(start);
	const mins = Math.round(ms / 60000);
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Generic edit/delete for completed history entries (feeding or sleep).
export async function deleteEntry(id) {
	await softDeleteEntry(id);
	await refresh();
	syncNow();
}

export async function editEntry(id, changes) {
	await updateEntry(id, changes);
	await refresh();
	syncNow();
}

// Converts an ISO string to the value format <input type="datetime-local"> expects,
// and back. Both operate in the browser's local timezone.
export function toDatetimeLocal(iso) {
	const d = new Date(iso);
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(value) {
	return new Date(value).toISOString();
}

export function isToday(iso) {
	const d = new Date(iso);
	const now = new Date();
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	);
}