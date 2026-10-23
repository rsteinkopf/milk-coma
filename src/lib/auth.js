import { supabase } from './supabase.js';

// Supabase Auth is email-based, so a username maps to a placeholder email.
// No mail is ever sent to it (requires "Confirm email" to be OFF in Supabase).
const DOMAIN = 'milkcoma.app';

export const USERNAME_RE = /^[a-z0-9_.-]{3,24}$/;
export const MIN_PASSWORD = 8;

export const normalizeUsername = (u) => u.trim().toLowerCase();
export const usernameToEmail = (u) => `${normalizeUsername(u)}@${DOMAIN}`;
export const emailToUsername = (email) => (email ?? '').split('@')[0];

function friendly(error) {
	const msg = error.message ?? '';
	if (/already registered/i.test(msg)) return 'That username is taken. Try another.';
	if (/invalid login credentials/i.test(msg)) return 'Wrong username or password.';
	if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Wait a minute and try again.';
	if (/network|fetch/i.test(msg)) return 'Could not reach the server. Check your connection.';
	return msg || 'Something went wrong.';
}

export function validateCredentials(username, password) {
	if (!USERNAME_RE.test(normalizeUsername(username))) {
		return 'Username must be 3 to 24 characters: letters, numbers, dot, dash or underscore.';
	}
	if (password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
	return null;
}

export async function createAccount(username, password) {
	const { data, error } = await supabase.auth.signUp({ email: usernameToEmail(username), password });
	if (error) return { error: friendly(error) };
	if (!data.session) {
		return {
			error:
				'Account created, but Supabase is still requiring email confirmation. Turn off "Confirm email" (Authentication > Providers > Email), then sign in.'
		};
	}
	return {};
}

export async function signInWithPassword(username, password) {
	const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
	return error ? { error: friendly(error) } : {};
}

export async function changePassword(newPassword) {
	if (newPassword.length < MIN_PASSWORD) return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
	const { error } = await supabase.auth.updateUser({ password: newPassword });
	return error ? { error: friendly(error) } : {};
}
