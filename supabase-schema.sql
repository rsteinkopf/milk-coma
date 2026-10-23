-- Run this in the Supabase SQL editor for your project.

create table entries (
  id uuid primary key,
  user_id uuid references auth.users(id) not null,
  type text not null check (type in ('feeding', 'sleep')),
  feed_type text check (feed_type in ('breast', 'bottle')), -- only set when type = 'feeding'
  start_time timestamptz not null,
  end_time timestamptz,
  left_seconds int,          -- breast feeds only: accumulated seconds on left side
  right_seconds int,         -- breast feeds only: accumulated seconds on right side
  active_side text check (active_side in ('left', 'right')), -- breast feeds only: currently running side, null when stopped
  side_started_at timestamptz, -- breast feeds only: when the current active side began
  last_side text check (last_side in ('left', 'right')), -- breast feeds only: most recent side used
  amount_oz numeric,         -- bottle feeds only: fluid ounces consumed
  bottle_elapsed_seconds int,   -- bottle feeds only: accumulated active timer seconds
  bottle_running_since timestamptz, -- bottle feeds only: when the current running segment began, null while paused
  notes text default '',
  deleted boolean default false,
  updated_at timestamptz not null default now()
);

create index entries_user_id_idx on entries(user_id);
create index entries_updated_at_idx on entries(updated_at);

alter table entries enable row level security;

-- Each user can only see and modify their own entries.
create policy "Users can view their own entries"
  on entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own entries"
  on entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own entries"
  on entries for update
  using (auth.uid() = user_id);

-- Enable realtime for live sync across devices.
alter publication supabase_realtime add table entries;
