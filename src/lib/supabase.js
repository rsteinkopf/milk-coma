import { createClient } from '@supabase/supabase-js';

// Fill these in from your Supabase project settings (Settings > API).
// For a real build, move these into .env / import.meta.env instead of hardcoding.
const SUPABASE_URL = 'https://nxljgajrkzjkttbrccgv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bGpnYWpya3pqa3R0YnJjY2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDA5MTAsImV4cCI6MjEwNTY3NjkxMH0.sLFUBI0Ciulm0Z9efzZmZ4gj7npHZQDQNoVlPgcPU3U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
	auth: {
		persistSession: true,
		autoRefreshToken: true
	}
});
