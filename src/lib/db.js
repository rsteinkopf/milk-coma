import { openDB } from 'idb';

const DB_NAME = 'baby-tracker';
const DB_VERSION = 1;

// Each record has:
//   id: uuid (client-generated, so it's stable across offline/online)
//   type: 'feeding' | 'sleep'
//   start_time, end_time: ISO strings (end_time null while in progress)
//   notes: string
//   synced: 0 | 1  -- whether it's been pushed to Supabase
//   deleted: 0 | 1  -- soft delete, so deletions can sync too
//   updated_at: ISO string -- used for conflict resolution (last-write-wins)

export async function getDB() {
	return openDB(DB_NAME, DB_VERSION, {
		upgrade(db) {
			const store = db.createObjectStore('entries', { keyPath: 'id' });
			store.createIndex('by_type', 'type');
			store.createIndex('by_synced', 'synced');
			store.createIndex('by_updated', 'updated_at');
		}
	});
}

export async function addEntry(entry) {
	const db = await getDB();
	const record = {
		id: crypto.randomUUID(),
		synced: 0,
		deleted: 0,
		updated_at: new Date().toISOString(),
		...entry
	};
	await db.put('entries', record);
	return record;
}

export async function updateEntry(id, changes) {
	const db = await getDB();
	const existing = await db.get('entries', id);
	if (!existing) return null;
	const updated = {
		...existing,
		...changes,
		synced: 0, // any local edit marks it dirty again
		updated_at: new Date().toISOString()
	};
	await db.put('entries', updated);
	return updated;
}

export async function softDeleteEntry(id) {
	return updateEntry(id, { deleted: 1 });
}

export async function getAllEntries() {
	const db = await getDB();
	const all = await db.getAll('entries');
	return all.filter((e) => !e.deleted).sort((a, b) => b.start_time.localeCompare(a.start_time));
}

export async function getUnsyncedEntries() {
	const db = await getDB();
	return db.getAllFromIndex('entries', 'by_synced', 0);
}

export async function markSynced(id, remoteUpdatedAt) {
	const db = await getDB();
	const existing = await db.get('entries', id);
	if (!existing) return;
	await db.put('entries', { ...existing, synced: 1, updated_at: remoteUpdatedAt ?? existing.updated_at });
}

// Used when pulling remote rows down — insert or overwrite local copy.
export async function upsertFromRemote(remoteRow) {
	const db = await getDB();
	const local = await db.get('entries', remoteRow.id);
	// Last-write-wins: only overwrite if remote is newer than what we have.
	if (!local || new Date(remoteRow.updated_at) > new Date(local.updated_at)) {
		await db.put('entries', { ...remoteRow, synced: 1 });
	}
}
