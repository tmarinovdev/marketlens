begin;

-- Isolated fixtures are always rolled back. No real account data is read.
create temp table watchlist_test_ids(a uuid, b uuid, first_id bigint, second_id bigint);
insert into watchlist_test_ids(a, b) values (gen_random_uuid(), gen_random_uuid());
insert into auth.users(id) select a from watchlist_test_ids union all select b from watchlist_test_ids;
with inserted as (
  insert into public.instruments(provider, provider_asset_id, symbol, name, asset_class, is_tradable)
  values ('watchlist_test', gen_random_uuid()::text, 'MLTESTA', 'Watchlist fixture A', 'us_equity', true)
  returning id
) update watchlist_test_ids set first_id = (select id from inserted);
with inserted as (
  insert into public.instruments(provider, provider_asset_id, symbol, name, asset_class, is_tradable)
  values ('watchlist_test', gen_random_uuid()::text, 'MLTESTB', 'Watchlist fixture B', 'us_equity', true)
  returning id
) update watchlist_test_ids set second_id = (select id from inserted);
grant select on watchlist_test_ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', (select a::text from watchlist_test_ids), true);
do $$
declare
  fixture record;
  result jsonb;
begin
  select * into fixture from watchlist_test_ids;
  result := public.save_my_watchlist(fixture.a, 0, array[fixture.second_id, fixture.first_id]);
  assert (result->>'revision')::int = 1, 'Revision must increment';
  assert (result->'instruments'->0->>'id')::bigint = fixture.second_id, 'Order must be retained';
  begin
    perform public.save_my_watchlist(fixture.b, 0, array[fixture.first_id]);
    raise exception 'Must not save as another user';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_my_watchlist(fixture.a, 0, array[fixture.first_id]);
    raise exception 'Stale writes must fail';
  exception when serialization_failure then null;
  end;
  begin
    perform public.save_my_watchlist(fixture.a, 1, array[fixture.first_id, fixture.first_id]);
    raise exception 'Duplicates must fail';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.save_my_watchlist(fixture.a, 1, array_fill(fixture.first_id, array[21]));
    raise exception 'Oversized watchlist must fail';
  exception when invalid_parameter_value then null;
  end;
  begin
    delete from public.watchlist_items;
    raise exception 'Direct writes must fail';
  exception when insufficient_privilege then null;
  end;
  assert jsonb_array_length(public.read_my_watchlist()->'instruments') = 2, 'Failed writes must not change data';
end;
$$;

select set_config('request.jwt.claim.sub', (select b::text from watchlist_test_ids), true);
do $$
declare fixture record;
begin
  select * into fixture from watchlist_test_ids;
  assert (select count(*) from public.watchlists) = 0, 'RLS must hide other users';
  assert (select count(*) from public.watchlist_items) = 0, 'RLS must hide other user items';
  assert jsonb_array_length(public.read_my_watchlist()->'instruments') = 0, 'RPC must hide other users';
  perform public.save_my_watchlist(fixture.b, 0, array[fixture.first_id]);
  assert jsonb_array_length(public.read_my_watchlist()->'instruments') = 1, 'Second user must have an independent list';
end;
$$;

set local role anon;
do $$
begin
  begin
    perform public.read_my_watchlist();
    raise exception 'Anonymous reads must fail';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_my_watchlist(null, 0, '{}'::bigint[]);
    raise exception 'Anonymous saves must fail';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
rollback;
