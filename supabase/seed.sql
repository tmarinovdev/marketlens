insert into public.instruments (
  provider_asset_id,
  symbol,
  name,
  asset_class,
  instrument_type,
  exchange,
  is_active,
  is_tradable
)
values
  ('seed-aapl', 'AAPL', 'Apple Inc.', 'us_equity', 'stock', 'NASDAQ', true, true),
  ('seed-nvda', 'NVDA', 'NVIDIA Corporation', 'us_equity', 'stock', 'NASDAQ', true, true),
  ('seed-spy', 'SPY', 'SPDR S&P 500 ETF Trust', 'us_equity', 'etf', 'ARCA', true, true),
  ('seed-qqq', 'QQQ', 'Invesco QQQ Trust', 'us_equity', 'etf', 'NASDAQ', true, true),
  ('seed-gld', 'GLD', 'SPDR Gold Shares', 'us_equity', 'etf', 'ARCA', true, true)
on conflict (provider, provider_asset_id) do update
set
  symbol = excluded.symbol,
  name = excluded.name,
  asset_class = excluded.asset_class,
  instrument_type = excluded.instrument_type,
  exchange = excluded.exchange,
  is_active = excluded.is_active,
  is_tradable = excluded.is_tradable,
  synced_at = now();
