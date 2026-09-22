# Market Lens — Project Description

## Overview

**Market Lens** is a lightweight, fast, modern financial markets dashboard.

The goal is to give users a clean overview of financial instruments they choose to follow without the visual complexity of a traditional trading terminal or admin dashboard.

The application should feel elegant, responsive, and immediate.

The first version focuses on:

- market instrument discovery
- personal watchlists
- compact price charts
- relevant market news
- light/dark themes
- SSR-first rendering
- simple email/password accounts

The project is also intended to demonstrate modern React architecture and frontend engineering practices.

## Product goals

Market Lens should be:

- fast
- visually clean
- mobile-friendly
- accessible
- easy to understand
- technically modern without unnecessary framework complexity
- suitable for future expansion

It should not feel like:

- a classic admin dashboard
- a Bloomberg-style professional terminal
- an overly dense trading application

## Pre-login experience

The root URL opens directly into the dashboard.

There is no hero section.

Users can immediately use the application without creating an account.

### Header

The header includes:

- Market Lens logo
- `MarketLens` title
- `Trade Smarter` subtitle
- predictive market search
- light/dark theme switch
- authentication actions where appropriate

### Predictive search

Users can search instruments such as:

- stocks
- indices
- ETFs where supported
- forex
- commodities

Selecting an instrument adds it to the watchlist/dashboard.

## Watchlist

Below the header is a compact **My Watchlist** section.

Each selected instrument appears as a small glass-style tag with:

- drag handle
- trading symbol
- remove action

Examples:

```text
AAPL
NVDA
SPX
GOLD
EUR/USD
```

Users can:

- add
- remove
- drag/reorder

The watchlist order controls chart widget order.

Anonymous watchlist state should persist locally.

## Dashboard charts

The main content area displays one chart widget per watched instrument.

Each widget includes:

- ticker/symbol
- instrument/company name
- current price
- percentage movement
- compact time-range controls
- line/area chart

Chart semantics:

- positive → green
- negative → red

The chart uses a thin line with a subtle fading gradient.

The dashboard does not need:

- y-axis labels
- favorite/star actions
- overflow menus
- dense technical indicators

## Responsive layout

Target behavior:

- mobile → 1 column
- small tablet → 2 columns
- desktop → 3 columns
- wide desktop → 4 columns where appropriate

Use modern CSS Grid/container-query techniques.

## Market news

Below charts is **Market News**.

Where possible, news should relate to currently selected instruments.

News cards should be:

- wider than tall
- compact
- easy to scan
- around two per row on desktop

Each article contains:

- source
- timestamp
- headline
- short summary

The approved design currently does not require:

- bookmark buttons
- keyword/category tags

## Registration and login

Users register with only:

- email
- password

Authentication is provided by Supabase.

## Post-login experience

Authenticated users gain:

- persistent watchlists
- detailed instrument pages

Detailed pages may include:

- larger line chart
- candlestick chart
- volume
- instrument/company information
- additional metrics
- dedicated news

TradingView Lightweight Charts is intended for detailed candlestick/financial charts.

## Future AI functionality

A future extension may add AI-assisted market analysis, such as:

- market summaries
- recent price-action explanation
- relevant news summarization
- technical signal explanation
- instrument comparisons

AI functionality is not required for the initial release.

## Future PWA/offline capability

Market Lens may later become a PWA.

Offline goals:

- application shell remains usable
- previous watchlist remains visible
- last successful market data can be shown
- cached values display their last-updated time

Cached data must never be presented as live.

Potential technologies:

- `vite-plugin-pwa`
- Workbox
- Cache Storage
- IndexedDB

## Design direction

General style:

- modern fintech
- premium but restrained
- spacious
- light glassmorphism
- subtle gradients
- soft shadows
- rounded surfaces
- compact data presentation
- WCAG-conscious contrast

UI stack:

- Tailwind CSS 4
- shadcn/ui
- Lucide

### Light theme

```text
Background          #FAFAFD
Card                #FFFFFF
Primary text        #111827
Secondary text      #374151
Muted text          #6B7280

Primary purple      #6D28D9
Primary hover       #5B21B6
Deep purple         #4C1D95
Soft purple         #EDE9FE
Purple tint         #F5F3FF

Border              #E5E7EB
Purple border       #DDD6FE

Positive            #15803D
Positive surface    #DCFCE7

Negative            #B91C1C
Negative surface    #FEE2E2
```

### Dark theme

```text
Background          #070E1D
Background alt      #0A1330
Card                #0D1630
Elevated surface    #111C3A

Primary text        #F8FAFC
Secondary text      #CBD5E1
Muted text          #94A3B8
Disabled text       #64748B

Primary purple      #8B5CF6
Purple hover        #A78BFA
Purple strong       #7C3AED
Purple surface      #2A1F4D

Border              #24304F
Accent border       #4C367A

Positive            #4ADE80
Positive chart      #22C55E
Positive surface    #0F2E1D

Negative            #F87171
Negative chart      #EF4444
Negative surface    #3A161B
```

## Logo

The custom logo mark contains:

- four vertical bars
- compact upward trend line
- small arrow head

The words `MarketLens` and `Trade Smarter` remain HTML text and are not part of the SVG.

The SVG uses `currentColor`.

Approved colors:

```css
:root {
  --logo-color: #6d28d9;
}

.dark {
  --logo-color: #a78bfa;
}
```

## Technical direction

Target architecture:

- React 19.3
- TypeScript 7
- Vite
- custom React SSR
- TanStack Router
- TanStack Query
- Zustand
- Supabase
- Vercel

Initial HTML is rendered on the server and hydrated in the browser.

React Server Components are not required for v1.

State ownership:

```text
TanStack Query
→ remote/server state

Zustand
→ local application state

Supabase
→ persistent authenticated state

Service Worker / IndexedDB
→ future offline state
```

## Hosting workflow

```text
local development
    ↓
GitHub
    ↓
Vercel Preview
    ↓
review/test
    ↓
main
    ↓
Vercel Production
```

## Initial success criteria

The first useful version should allow a user to:

1. open a server-rendered dashboard
2. search market instruments
3. add them to a watchlist
4. reorder them
5. remove them
6. see responsive compact charts
7. view relevant market news
8. switch light/dark theme
9. refresh without losing anonymous watchlist
10. register and log in
11. persist an authenticated watchlist
12. open a detailed instrument page

---

## Market data — v1 decision

The first version of Market Lens focuses on the **US market**.

The initial market-data provider is **Alpaca**.

Alpaca is used for:

- current US stock/ETF snapshots
- historical bars
- market news
- asset/reference data

Current dashboard values use Alpaca's free IEX-backed feed.

The first implementation uses **REST polling rather than WebSocket streaming**.

During an open US trading session, watchlist values should refresh approximately every 30 seconds while the application is actively being viewed.

Polling should pause or reduce when:

- the browser tab is hidden
- the market is closed
- current data is not required

The interface should show data freshness/last-updated information where useful.

### Historical charts

Use Alpaca historical bars for v1.

Suggested compact dashboard ranges:

```text
1D → ~10-minute bars
1W → ~1-hour bars
1M → daily bars
3M → daily bars
1Y → daily bars
```

### Index and commodity proxies

Until direct licensed index/commodity feeds are introduced, selected exposures may use ETF proxies:

```text
S&P 500       → SPY
Nasdaq-100    → QQQ
Dow Jones     → DIA
Russell 2000  → IWM

Gold          → GLD
Silver        → SLV
Oil           → USO
```

The interface must clearly distinguish the ETF from the underlying index or commodity.

### Predictive-search catalog

Predictive search should use a locally synchronized reference catalog rather than querying Alpaca on every keyboard input.

```text
Alpaca asset/reference data
        ↓
periodic synchronization
        ↓
Supabase instruments catalog
        ↓
Market Lens predictive search
```

Supabase stores reference metadata only. Live quotes and historical time-series data are not permanently stored in Supabase for v1.

### Provider independence

Although Alpaca is the v1 provider, React features should depend on normalized Market Lens domain types rather than Alpaca response types.

This preserves the ability to add later support for:

- UK equities
- EU equities
- direct indices
- direct commodities
- forex
- WebSocket streaming
- another licensed provider

### Public display/licensing

Before live market data is enabled on a public production portfolio URL, the relevant provider/data entitlement must permit the intended public non-commercial display.

If it does not, the public deployment should use permitted delayed/demo/sample data while retaining the same provider architecture.

---

## Credentials and environment strategy

Private market-provider credentials must never be exposed to browser code or committed to Git.

Local credentials live only in ignored local environment files such as:

```text
.env.local
```

The repository contains only:

```text
.env.example
```

with empty/example values.

Vercel stores deployment values separately for:

- Development
- Preview
- Production

GitHub does not need deployment credentials simply because Vercel deploys from the repository.

GitHub Actions Secrets are only needed when a GitHub Actions workflow itself requires credentials.
