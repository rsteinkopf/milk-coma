import { writable } from 'svelte/store';

export const session = writable(null);
export const entries = writable([]);
export const activeFeeding = writable(null);
export const activeSleep = writable(null);
export const household = writable(null);
