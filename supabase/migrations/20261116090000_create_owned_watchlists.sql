create table public.watchlists (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 0 check (revision >= 0)
);

create table public.watchlist_items (
  user_id uuid not null references public.watchlists(user_id) on delete cascade,
  instrument_id bigint not null references public.instruments(id) on delete cascade,
  position integer not null check (position between 0 and 19),
  primary key (user_id, instrument_id),
  unique (user_id, position)
);

alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
create policy "Read own watchlist" on public.watchlists for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Read own watchlist items" on public.watchlist_items for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.watchlists, public.watchlist_items from anon, authenticated;
grant select on public.watchlists, public.watchlist_items to authenticated;

create function public.read_my_watchlist()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'revision', coalesce((select revision from public.watchlists where user_id = auth.uid()), 0),
    'instruments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'provider', i.provider, 'providerAssetId', i.provider_asset_id,
        'symbol', i.symbol, 'name', i.name, 'assetClass', i.asset_class,
        'instrumentType', i.instrument_type, 'exchange', i.exchange, 'currency', i.currency
      ) order by w.position)
      from public.watchlist_items w join public.instruments i on i.id = w.instrument_id
      where w.user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

-- Every edit replaces at most 20 rows in one transaction. The user ID argument
-- is an assertion against session changes, never authorization supplied by a client.
create function public.save_my_watchlist(
  expected_user_id uuid, expected_revision integer, instrument_ids bigint[]
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_revision integer;
begin
  if owner_id is null or owner_id <> expected_user_id or expected_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if instrument_ids is null or cardinality(instrument_ids) > 20
    or cardinality(instrument_ids) <> (select count(distinct value) from unnest(instrument_ids) value)
    or exists (select 1 from unnest(instrument_ids) value where not exists (
      select 1 from public.instruments i where i.id = value
    )) then
    raise exception 'Invalid watchlist' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));
  insert into public.watchlists(user_id) values (owner_id) on conflict do nothing;
  select revision into current_revision from public.watchlists where user_id = owner_id for update;
  if expected_revision is null or current_revision <> expected_revision then
    raise exception 'Watchlist changed elsewhere' using errcode = '40001';
  end if;
  delete from public.watchlist_items where user_id = owner_id;
  insert into public.watchlist_items(user_id, instrument_id, position)
    select owner_id, value, ordinal - 1 from unnest(instrument_ids) with ordinality as x(value, ordinal);
  update public.watchlists set revision = current_revision + 1 where user_id = owner_id;
  return public.read_my_watchlist();
end;
$$;

revoke all on function public.read_my_watchlist() from public, anon;
revoke all on function public.save_my_watchlist(uuid, integer, bigint[]) from public, anon;
grant execute on function public.read_my_watchlist() to authenticated;
grant execute on function public.save_my_watchlist(uuid, integer, bigint[]) to authenticated;
