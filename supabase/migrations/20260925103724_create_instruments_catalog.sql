create extension if not exists pg_trgm with schema extensions;

create table public.instruments (
  id bigint generated always as identity primary key,
  provider text not null default 'alpaca',
  provider_asset_id text not null,
  symbol text not null,
  name text not null,
  asset_class text not null,
  instrument_type text,
  exchange text,
  currency text not null default 'USD',
  is_active boolean not null default true,
  is_tradable boolean not null default false,
  normalized_symbol text generated always as (upper(btrim(symbol))) stored,
  normalized_name text generated always as (lower(btrim(name))) stored,
  synced_at timestamp with time zone not null default now(),

  constraint instruments_provider_not_blank check (btrim(provider) <> ''),
  constraint instruments_provider_is_lowercase check (provider = lower(provider)),
  constraint instruments_provider_asset_id_not_blank check (
    btrim(provider_asset_id) <> ''
  ),
  constraint instruments_symbol_not_blank check (btrim(symbol) <> ''),
  constraint instruments_name_not_blank check (btrim(name) <> ''),
  constraint instruments_asset_class_not_blank check (btrim(asset_class) <> ''),
  constraint instruments_type_not_blank check (
    instrument_type is null or btrim(instrument_type) <> ''
  ),
  constraint instruments_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint instruments_provider_asset_id_unique unique (
    provider,
    provider_asset_id
  ),
  constraint instruments_provider_symbol_unique unique (
    provider,
    normalized_symbol
  )
);

create index instruments_symbol_prefix_idx
  on public.instruments (normalized_symbol text_pattern_ops)
  where is_active and is_tradable;

create index instruments_symbol_trigram_idx
  on public.instruments
  using gin (normalized_symbol extensions.gin_trgm_ops)
  where is_active and is_tradable;

create index instruments_name_trigram_idx
  on public.instruments
  using gin (normalized_name extensions.gin_trgm_ops)
  where is_active and is_tradable;

alter table public.instruments enable row level security;

create policy "Public can read active tradable instruments"
  on public.instruments
  for select
  to anon, authenticated
  using (is_active and is_tradable);

revoke all on table public.instruments from anon, authenticated;
grant select on table public.instruments to anon, authenticated;
grant all on table public.instruments to service_role;

revoke all on sequence public.instruments_id_seq from anon, authenticated;
grant usage, select on sequence public.instruments_id_seq to service_role;

create function public.search_instruments(
  search_query text,
  result_limit integer default 8
)
returns table (
  id bigint,
  provider text,
  provider_asset_id text,
  symbol text,
  name text,
  asset_class text,
  instrument_type text,
  exchange text,
  currency text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with search_input as (
    select
      upper(btrim(coalesce(search_query, ''))) as symbol_query,
      lower(btrim(coalesce(search_query, ''))) as name_query,
      least(greatest(coalesce(result_limit, 8), 1), 20) as limited_result_count
  ),
  ranked_matches as (
    select
      instrument.id,
      instrument.provider,
      instrument.provider_asset_id,
      instrument.symbol,
      instrument.name,
      instrument.asset_class,
      instrument.instrument_type,
      instrument.exchange,
      instrument.currency,
      case
        when instrument.normalized_symbol = input.symbol_query then 0
        when instrument.normalized_symbol like input.symbol_query || '%' then 1
        when instrument.normalized_name like input.name_query || '%' then 2
        else 3
      end as match_group,
      greatest(
        extensions.similarity(instrument.normalized_symbol, input.symbol_query),
        extensions.similarity(instrument.normalized_name, input.name_query)
      ) as match_score
    from public.instruments as instrument
    cross join search_input as input
    where
      length(input.name_query) >= 2
      and instrument.is_active
      and instrument.is_tradable
      and (
        instrument.normalized_symbol like input.symbol_query || '%'
        or instrument.normalized_name like '%' || input.name_query || '%'
        or extensions.similarity(
          instrument.normalized_symbol,
          input.symbol_query
        ) >= 0.3
        or extensions.similarity(
          instrument.normalized_name,
          input.name_query
        ) >= 0.3
      )
  )
  select
    match.id,
    match.provider,
    match.provider_asset_id,
    match.symbol,
    match.name,
    match.asset_class,
    match.instrument_type,
    match.exchange,
    match.currency
  from ranked_matches as match
  order by
    match.match_group,
    match.match_score desc,
    match.symbol
  limit (select input.limited_result_count from search_input as input);
$$;

revoke all on function public.search_instruments(text, integer) from public;
grant execute on function public.search_instruments(text, integer)
  to anon, authenticated, service_role;

comment on table public.instruments is
  'Searchable reference catalog synchronized from market-data providers.';

comment on function public.search_instruments(text, integer) is
  'Returns ranked active instruments for predictive search.';
