-- Run AFTER supabase-schema.sql. Adds shared "households" so two accounts see the same entries.

create table households (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (household_id, user_id),
  unique (user_id) -- one household per account
);

alter table entries add column household_id uuid references households(id);
create index entries_household_id_idx on entries(household_id);

alter table households enable row level security;
alter table household_members enable row level security;

-- security definer avoids recursive RLS lookups
create function is_member(hid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from household_members where household_id = hid and user_id = auth.uid());
$$;

create policy "Members view household" on households for select using (is_member(id));
create policy "Members view members" on household_members for select using (is_member(household_id));

-- entries: owner OR household member can read/write (partner edits keep the original user_id)
drop policy "Users can view their own entries" on entries;
drop policy "Users can insert their own entries" on entries;
drop policy "Users can update their own entries" on entries;

create policy "Owner or household can view" on entries for select
  using (user_id = auth.uid() or (household_id is not null and is_member(household_id)));
create policy "Owner or household can insert" on entries for insert
  with check (user_id = auth.uid() or (household_id is not null and is_member(household_id)));
create policy "Owner or household can update" on entries for update
  using (user_id = auth.uid() or (household_id is not null and is_member(household_id)));

create function create_household() returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'You are already in a household';
  end if;
  insert into households default values returning id into hid;
  insert into household_members (household_id, user_id) values (hid, auth.uid());
  update entries set household_id = hid where user_id = auth.uid() and household_id is null;
  return hid;
end $$;

create function join_household(code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select id into hid from households where invite_code = lower(trim(code));
  if hid is null then raise exception 'Invalid invite code'; end if;
  if exists (select 1 from household_members where user_id = auth.uid() and household_id <> hid) then
    raise exception 'You are already in a different household';
  end if;
  insert into household_members (household_id, user_id) values (hid, auth.uid()) on conflict do nothing;
  update entries set household_id = hid where user_id = auth.uid() and household_id is null;
  return hid;
end $$;
