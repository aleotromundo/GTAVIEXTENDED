-- YouToo cloud profile and optional synchronization
-- Run in a new Supabase project before enabling client credentials.
-- This migration assumes Supabase Auth manages auth.users.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  cloud_sync_enabled boolean not null default false,
  local_import_completed_at timestamptz,
  privacy_version text not null default '2026-08-20',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  personalization_enabled boolean not null default true,
  crossfade_seconds numeric(4,1) not null default 3.0 check (crossfade_seconds between 0 and 12),
  player_volume numeric(4,3) not null default 0.85 check (player_volume between 0 and 1),
  theme_preference text not null default 'dark' check (theme_preference in ('dark', 'system')),
  autoplay_enabled boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('mediacms', 'youtube', 'openverse', 'wikimedia', 'archive', 'nasa', 'peertube', 'pexels', 'pixabay')),
  source_key text not null check (char_length(source_key) between 1 and 512),
  media_kind text not null default 'video' check (media_kind in ('video', 'audio', 'playlist', 'channel', 'collection')),
  saved_state text not null default 'favorite' check (saved_state in ('favorite', 'saved', 'history', 'hidden')),
  progress_seconds numeric(12,3) not null default 0 check (progress_seconds >= 0),
  completed boolean not null default false,
  last_played_at timestamptz,
  source_url text,
  -- Metadata from YouTube is deliberately not copied into cloud storage.
  -- Title, artwork and descriptions are refreshed from the official API when shown.
  metadata_cache jsonb not null default '{}'::jsonb,
  metadata_refreshed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source, source_key),
  check (source <> 'youtube' or metadata_cache = '{}'::jsonb)
);

create index if not exists user_library_items_user_updated_idx
  on public.user_library_items (user_id, updated_at desc);
create index if not exists user_library_items_user_state_idx
  on public.user_library_items (user_id, saved_state, updated_at desc);

create table if not exists public.user_queue_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('mediacms', 'youtube', 'openverse', 'wikimedia', 'archive', 'nasa', 'peertube', 'pexels', 'pixabay')),
  source_key text not null check (char_length(source_key) between 1 and 512),
  media_kind text not null default 'audio' check (media_kind in ('video', 'audio', 'playlist')),
  queue_position integer not null check (queue_position >= 0),
  resume_seconds numeric(12,3) not null default 0 check (resume_seconds >= 0),
  added_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, source, source_key),
  unique (user_id, queue_position)
);

create index if not exists user_queue_items_user_position_idx
  on public.user_queue_items (user_id, queue_position);

create table if not exists public.user_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  query text not null check (char_length(btrim(query)) between 1 and 160),
  normalized_query text generated always as (lower(btrim(query))) stored,
  source_scope text not null default 'all' check (source_scope in ('all', 'mediacms', 'youtube', 'openverse', 'free-media')),
  search_count integer not null default 1 check (search_count > 0),
  last_searched_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, normalized_query, source_scope)
);

create index if not exists user_searches_user_recent_idx
  on public.user_searches (user_id, last_searched_at desc);

create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_event_id uuid not null,
  event_type text not null check (event_type in ('open', 'play', 'pause', 'complete', 'skip', 'favorite', 'unfavorite', 'search', 'channel_open', 'playlist_open')),
  source text check (source is null or source in ('mediacms', 'youtube', 'openverse', 'wikimedia', 'archive', 'nasa', 'peertube', 'pexels', 'pixabay')),
  source_key text,
  occurred_at timestamptz not null default timezone('utc', now()),
  progress_seconds numeric(12,3) check (progress_seconds is null or progress_seconds >= 0),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, client_event_id)
);

create index if not exists user_activity_user_time_idx
  on public.user_activity (user_id, occurred_at desc);
create index if not exists user_activity_user_source_idx
  on public.user_activity (user_id, source, occurred_at desc);

create table if not exists public.user_interest_weights (
  user_id uuid not null references public.profiles(id) on delete cascade,
  interest_type text not null check (interest_type in ('artist', 'channel', 'tag', 'query', 'category', 'source')),
  interest_key text not null check (char_length(interest_key) between 1 and 256),
  weight numeric(10,4) not null default 0 check (weight between -10000 and 10000),
  last_signal_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, interest_type, interest_key)
);

create index if not exists user_interest_weights_rank_idx
  on public.user_interest_weights (user_id, weight desc, last_signal_at desc);

create table if not exists public.sync_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_key uuid not null,
  display_name text check (char_length(display_name) <= 80),
  app_version text check (char_length(app_version) <= 40),
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, device_key)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create trigger user_library_items_set_updated_at
before update on public.user_library_items
for each row execute function public.set_updated_at();

create trigger user_queue_items_set_updated_at
before update on public.user_queue_items
for each row execute function public.set_updated_at();

create trigger user_interest_weights_set_updated_at
before update on public.user_interest_weights
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'), 80), ''))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger create_profile_after_auth_signup
after insert on auth.users
for each row execute procedure public.create_profile_for_auth_user();

-- Explicit import used only after the person signs in and chooses to transfer local data.
-- It intentionally stores YouTube resource identifiers and user state, not a cloud copy of YouTube metadata.
create or replace function public.import_local_profile(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_replace_queue boolean := coalesce((p_payload ->> 'replace_queue')::boolean, false);
begin
  if v_user_id is null then
    raise exception 'authentication_required';
  end if;

  insert into public.profiles (id, cloud_sync_enabled, local_import_completed_at)
  values (v_user_id, true, timezone('utc', now()))
  on conflict (id) do update
  set cloud_sync_enabled = true,
      local_import_completed_at = coalesce(public.profiles.local_import_completed_at, excluded.local_import_completed_at);

  insert into public.user_preferences (
    user_id, personalization_enabled, crossfade_seconds, player_volume, theme_preference, autoplay_enabled, data
  )
  select
    v_user_id,
    coalesce((p_payload #>> '{preferences,personalization_enabled}')::boolean, true),
    least(greatest(coalesce((p_payload #>> '{preferences,crossfade_seconds}')::numeric, 3), 0), 12),
    least(greatest(coalesce((p_payload #>> '{preferences,player_volume}')::numeric, 0.85), 0), 1),
    case when p_payload #>> '{preferences,theme_preference}' in ('dark', 'system') then p_payload #>> '{preferences,theme_preference}' else 'dark' end,
    coalesce((p_payload #>> '{preferences,autoplay_enabled}')::boolean, false),
    coalesce(p_payload #> '{preferences,data}', '{}'::jsonb)
  on conflict (user_id) do update
  set personalization_enabled = excluded.personalization_enabled,
      crossfade_seconds = excluded.crossfade_seconds,
      player_volume = excluded.player_volume,
      theme_preference = excluded.theme_preference,
      autoplay_enabled = excluded.autoplay_enabled,
      data = excluded.data;

  insert into public.user_library_items (
    user_id, source, source_key, media_kind, saved_state, progress_seconds, completed, last_played_at, source_url, metadata_cache, metadata_refreshed_at
  )
  select
    v_user_id,
    item.source,
    item.source_key,
    case when item.media_kind in ('video', 'audio', 'playlist', 'channel', 'collection') then item.media_kind else 'video' end,
    case when item.saved_state in ('favorite', 'saved', 'history', 'hidden') then item.saved_state else 'saved' end,
    greatest(coalesce(item.progress_seconds, 0), 0),
    coalesce(item.completed, false),
    item.last_played_at,
    nullif(item.source_url, ''),
    case when item.source = 'youtube' then '{}'::jsonb else coalesce(item.metadata_cache, '{}'::jsonb) end,
    case when item.source = 'youtube' then null else item.metadata_refreshed_at end
  from jsonb_to_recordset(coalesce(p_payload -> 'library_items', '[]'::jsonb)) as item(
    source text, source_key text, media_kind text, saved_state text, progress_seconds numeric,
    completed boolean, last_played_at timestamptz, source_url text, metadata_cache jsonb, metadata_refreshed_at timestamptz
  )
  where item.source in ('mediacms', 'youtube', 'openverse', 'wikimedia', 'archive', 'nasa', 'peertube', 'pexels', 'pixabay')
    and nullif(btrim(item.source_key), '') is not null
  on conflict (user_id, source, source_key) do update
  set media_kind = excluded.media_kind,
      saved_state = excluded.saved_state,
      progress_seconds = greatest(public.user_library_items.progress_seconds, excluded.progress_seconds),
      completed = public.user_library_items.completed or excluded.completed,
      last_played_at = greatest(public.user_library_items.last_played_at, excluded.last_played_at),
      source_url = coalesce(excluded.source_url, public.user_library_items.source_url),
      metadata_cache = excluded.metadata_cache,
      metadata_refreshed_at = excluded.metadata_refreshed_at;

  if v_replace_queue then
    delete from public.user_queue_items where user_id = v_user_id;
  end if;

  insert into public.user_queue_items (user_id, source, source_key, media_kind, queue_position, resume_seconds)
  select
    v_user_id,
    item.source,
    item.source_key,
    case when item.media_kind in ('video', 'audio', 'playlist') then item.media_kind else 'audio' end,
    item.queue_position,
    greatest(coalesce(item.resume_seconds, 0), 0)
  from jsonb_to_recordset(coalesce(p_payload -> 'queue_items', '[]'::jsonb)) as item(
    source text, source_key text, media_kind text, queue_position integer, resume_seconds numeric
  )
  where v_replace_queue
    and item.source in ('mediacms', 'youtube', 'openverse', 'wikimedia', 'archive', 'nasa', 'peertube', 'pexels', 'pixabay')
    and nullif(btrim(item.source_key), '') is not null
    and item.queue_position >= 0
  on conflict (user_id, source, source_key) do update
  set media_kind = excluded.media_kind,
      queue_position = excluded.queue_position,
      resume_seconds = excluded.resume_seconds;

  insert into public.user_searches (user_id, query, source_scope, search_count, last_searched_at)
  select
    v_user_id,
    item.query,
    case when item.source_scope in ('all', 'mediacms', 'youtube', 'openverse', 'free-media') then item.source_scope else 'all' end,
    greatest(coalesce(item.search_count, 1), 1),
    coalesce(item.last_searched_at, timezone('utc', now()))
  from jsonb_to_recordset(coalesce(p_payload -> 'searches', '[]'::jsonb)) as item(
    query text, source_scope text, search_count integer, last_searched_at timestamptz
  )
  where char_length(btrim(coalesce(item.query, ''))) between 1 and 160
  on conflict (user_id, normalized_query, source_scope) do update
  set search_count = public.user_searches.search_count + excluded.search_count,
      last_searched_at = greatest(public.user_searches.last_searched_at, excluded.last_searched_at);

  insert into public.user_activity (user_id, client_event_id, event_type, source, source_key, occurred_at, progress_seconds, context)
  select
    v_user_id,
    item.client_event_id,
    item.event_type,
    item.source,
    nullif(item.source_key, ''),
    coalesce(item.occurred_at, timezone('utc', now())),
    case when item.progress_seconds >= 0 then item.progress_seconds else null end,
    coalesce(item.context, '{}'::jsonb)
  from jsonb_to_recordset(coalesce(p_payload -> 'activity', '[]'::jsonb)) as item(
    client_event_id uuid, event_type text, source text, source_key text, occurred_at timestamptz, progress_seconds numeric, context jsonb
  )
  where item.client_event_id is not null
    and item.event_type in ('open', 'play', 'pause', 'complete', 'skip', 'favorite', 'unfavorite', 'search', 'channel_open', 'playlist_open')
    and (item.source is null or item.source in ('mediacms', 'youtube', 'openverse', 'wikimedia', 'archive', 'nasa', 'peertube', 'pexels', 'pixabay'))
  on conflict (user_id, client_event_id) do nothing;

  insert into public.user_interest_weights (user_id, interest_type, interest_key, weight, last_signal_at)
  select
    v_user_id,
    item.interest_type,
    item.interest_key,
    least(greatest(coalesce(item.weight, 0), -10000), 10000),
    coalesce(item.last_signal_at, timezone('utc', now()))
  from jsonb_to_recordset(coalesce(p_payload -> 'interests', '[]'::jsonb)) as item(
    interest_type text, interest_key text, weight numeric, last_signal_at timestamptz
  )
  where item.interest_type in ('artist', 'channel', 'tag', 'query', 'category', 'source')
    and char_length(btrim(coalesce(item.interest_key, ''))) between 1 and 256
  on conflict (user_id, interest_type, interest_key) do update
  set weight = excluded.weight,
      last_signal_at = greatest(public.user_interest_weights.last_signal_at, excluded.last_signal_at);

  insert into public.sync_devices (user_id, device_key, display_name, app_version, last_seen_at)
  select
    v_user_id,
    item.device_key,
    nullif(left(item.display_name, 80), ''),
    nullif(left(item.app_version, 40), ''),
    coalesce(item.last_seen_at, timezone('utc', now()))
  from jsonb_to_recordset(coalesce(p_payload -> 'devices', '[]'::jsonb)) as item(
    device_key uuid, display_name text, app_version text, last_seen_at timestamptz
  )
  where item.device_key is not null
  on conflict (user_id, device_key) do update
  set display_name = excluded.display_name,
      app_version = excluded.app_version,
      last_seen_at = greatest(public.sync_devices.last_seen_at, excluded.last_seen_at);

  return jsonb_build_object('user_id', v_user_id, 'imported_at', timezone('utc', now()));
end;
$$;

-- Server-only retention helper. Call from a trusted scheduled job after deployment.
create or replace function public.purge_expired_user_activity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_activity
  where occurred_at < timezone('utc', now()) - interval '90 days';
end;
$$;

-- Every exposed table is private by default. The authenticated user can only act on rows with their own user_id.
revoke all on table public.profiles, public.user_preferences, public.user_library_items,
  public.user_queue_items, public.user_searches, public.user_activity,
  public.user_interest_weights, public.sync_devices from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.profiles, public.user_preferences,
  public.user_library_items, public.user_queue_items, public.user_searches,
  public.user_activity, public.user_interest_weights, public.sync_devices to authenticated;

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_library_items enable row level security;
alter table public.user_queue_items enable row level security;
alter table public.user_searches enable row level security;
alter table public.user_activity enable row level security;
alter table public.user_interest_weights enable row level security;
alter table public.sync_devices enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "preferences_select_own" on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "preferences_insert_own" on public.user_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "preferences_update_own" on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "preferences_delete_own" on public.user_preferences for delete to authenticated using ((select auth.uid()) = user_id);

create policy "library_select_own" on public.user_library_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "library_insert_own" on public.user_library_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "library_update_own" on public.user_library_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "library_delete_own" on public.user_library_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy "queue_select_own" on public.user_queue_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "queue_insert_own" on public.user_queue_items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "queue_update_own" on public.user_queue_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "queue_delete_own" on public.user_queue_items for delete to authenticated using ((select auth.uid()) = user_id);

create policy "searches_select_own" on public.user_searches for select to authenticated using ((select auth.uid()) = user_id);
create policy "searches_insert_own" on public.user_searches for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "searches_update_own" on public.user_searches for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "searches_delete_own" on public.user_searches for delete to authenticated using ((select auth.uid()) = user_id);

create policy "activity_select_own" on public.user_activity for select to authenticated using ((select auth.uid()) = user_id);
create policy "activity_insert_own" on public.user_activity for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activity_delete_own" on public.user_activity for delete to authenticated using ((select auth.uid()) = user_id);

create policy "interests_select_own" on public.user_interest_weights for select to authenticated using ((select auth.uid()) = user_id);
create policy "interests_insert_own" on public.user_interest_weights for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "interests_update_own" on public.user_interest_weights for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "interests_delete_own" on public.user_interest_weights for delete to authenticated using ((select auth.uid()) = user_id);

create policy "devices_select_own" on public.sync_devices for select to authenticated using ((select auth.uid()) = user_id);
create policy "devices_insert_own" on public.sync_devices for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "devices_update_own" on public.sync_devices for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "devices_delete_own" on public.sync_devices for delete to authenticated using ((select auth.uid()) = user_id);

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke execute on function public.import_local_profile(jsonb) from public, anon;
grant execute on function public.import_local_profile(jsonb) to authenticated;
revoke execute on function public.purge_expired_user_activity() from public, anon, authenticated;
