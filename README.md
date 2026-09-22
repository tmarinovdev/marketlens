# Market Lens

**Market Lens** is a lightweight, SSR-first financial markets dashboard built with modern React.

It provides a clean way to search and monitor stocks, indices, commodities, and other supported financial instruments without the density of a traditional trading terminal.

The project focuses on:

- fast rendering
- compact financial visualizations
- accessible light/dark themes
- clean state ownership
- scalable React architecture
- production-oriented testing and code quality

## Project status

Market Lens is in active development.

The initial implementation focuses on:

- SSR-first dashboard rendering
- predictive instrument search
- anonymous watchlists
- drag-and-drop ordering
- compact market charts
- market news
- light/dark themes
- email/password authentication
- persistent authenticated watchlists

Future phases may add:

- detailed candlestick charts
- additional market metrics
- PWA/offline support
- AI-assisted market analysis

## Experience

### Pre-login

Users can immediately:

- search instruments
- add instruments to a watchlist
- remove instruments
- reorder watchlist items
- view compact line charts
- read related market news
- switch between light and dark mode

No account is required for the core dashboard.

### Post-login

Users can register with email/password.

Authenticated functionality includes or may include:

- persistent watchlists
- detailed instrument pages
- larger line charts
- candlestick charts
- additional market data
- dedicated instrument news

## Tech stack

### Core

- Node.js
- TypeScript 7
- React 19.3
- Vite

### Rendering

- custom React SSR
- client hydration
- Vite → Vercel SSR integration

The project intentionally avoids a full React meta-framework for v1.

### Routing

- TanStack Router

### Server state

- TanStack Query

Used for:

- instrument search
- quotes
- historical data
- market news
- SSR prefetching
- caching
- remote mutations

### Client state

- Zustand

Used for:

- anonymous watchlist
- local ordering
- UI preferences
- temporary dashboard state

### UI

- Tailwind CSS 4
- shadcn/ui
- Lucide
- dnd-kit

### Charts

Dashboard:

- shadcn Charts
- Recharts

Detailed instrument views:

- TradingView Lightweight Charts

### Auth and database

- Supabase Auth
- Supabase Postgres

### Validation

- Zod

### Code quality

- ESLint
- Prettier

### Testing

- Vitest
- React Testing Library
- Playwright

### Future PWA

- vite-plugin-pwa
- Workbox
- Cache Storage / IndexedDB

### Hosting

- GitHub
- Vercel

## Architecture

```text
Browser request
      ↓
Vercel SSR runtime
      ↓
TanStack Router
      ↓
TanStack Query prefetch
      ↓
Market API / Supabase
      ↓
React SSR
      ↓
HTML response
      ↓
Browser hydration
      ↓
Interactive React application
```

State ownership:

```text
TanStack Query
  → remote/server state

Zustand
  → local/client state

Supabase
  → persistent authenticated state

Service Worker / IndexedDB
  → future offline state
```

## Market-data architecture

Private financial API credentials must stay server-side.

Preferred flow:

```text
Browser
   ↓
Market Lens server/API layer
   ↓
External financial data provider
```

Provider responses should be normalized into internal application models and validated with Zod.

## Design

Market Lens uses a light theme by default with a matching dark theme.

Visual direction:

- modern fintech
- lightweight
- responsive
- compact
- glassmorphism
- subtle gradients
- restrained shadows
- purple brand accents
- WCAG-conscious contrast

### Light palette

```text
Background          #FAFAFD
Card                #FFFFFF
Primary text        #111827

Primary purple      #6D28D9
Purple hover        #5B21B6
Soft purple         #EDE9FE

Positive            #15803D
Negative            #B91C1C
```

### Dark palette

```text
Background          #070E1D
Card                #0D1630
Primary text        #F8FAFC

Primary purple      #8B5CF6
Purple hover        #A78BFA

Positive            #4ADE80
Negative            #F87171
```

## Dashboard layout

```text
Header
  ├─ Brand
  ├─ Predictive search
  └─ Theme/auth controls

My Watchlist
  └─ draggable ticker chips

Instrument grid
  └─ responsive compact charts

Market News
  └─ watchlist-related news

Footer
```

Target chart layout:

- 1 column on narrow screens
- 2 columns on tablets/smaller widths
- 3 columns on desktop
- 4 columns on wide screens where appropriate

## Project structure

```text
src/
├── app/
│   ├── App.tsx
│   ├── providers.tsx
│   └── router.tsx
│
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── instrument/
│       └── $symbol.tsx
│
├── features/
│   ├── instruments/
│   ├── watchlist/
│   ├── charts/
│   ├── news/
│   └── auth/
│
├── components/
│   ├── ui/
│   └── layout/
│
├── lib/
│   ├── query-client.ts
│   ├── supabase.ts
│   └── env.ts
│
├── styles/
│   ├── globals.css
│   └── theme.css
│
├── entry-client.tsx
└── entry-server.tsx

server/
├── render.ts
└── market-provider/
    ├── client.ts
    └── normalize.ts

e2e/
```

## Development

Exact scaffold commands will be added once the initial project setup is committed.

Expected workflow:

```bash
npm install
npm run dev
```

Expected scripts:

```bash
npm run dev
npm run build
npm run typecheck

npm run lint
npm run lint:fix

npm run format
npm run format:check

npm run test
npm run test:run
npm run test:coverage

npm run test:e2e

npm run check
```

## Environment variables

Final names depend on the selected market-data provider.

Typical categories:

```text
Supabase public URL
Supabase browser-safe anon key

Market-data provider secret API key
Server-only configuration
```

Private provider credentials must never be exposed to browser bundles.

A `.env.example` should be added once the environment contract is finalized.

## Testing strategy

### Vitest

Used for:

- utilities
- formatters
- normalization
- stores
- data adapters
- query logic
- component behavior

### React Testing Library

Used for user-facing component and integration tests.

### Playwright

Used for browser flows such as:

- dashboard loading
- instrument search
- add/remove watchlist
- drag-and-drop ordering
- local persistence
- light/dark switching
- registration/login/logout
- protected pages

## Deployment

```text
Local development
      ↓
GitHub branch / pull request
      ↓
Vercel Preview
      ↓
review/testing
      ↓
merge to main
      ↓
Vercel Production
```

## PWA roadmap

A later phase may add offline support.

Goals:

- cache the application shell
- retain the watchlist
- show the last successful market values
- clearly indicate stale/offline data

Cached financial values must always display freshness information.

## AI roadmap

A possible future extension is AI-assisted market analysis.

Potential capabilities:

- news summarization
- market-context summaries
- price-action explanations
- technical-analysis assistance
- instrument comparisons

This is not required for the initial release.

## Documentation

Repository documentation is split intentionally:

- `README.md` — public repository overview
- `description.md` — product scope and behavior
- `AGENTS.md` — implementation guidance for Codex/coding agents

## License

License to be decided.

---

## Market data — v1

Market Lens v1 focuses on US stocks and ETFs using **Alpaca** as the initial market-data provider.

The dashboard uses:

- IEX-backed current US equity/ETF data
- batched REST snapshot polling
- approximately 30-second refreshes while appropriate
- Alpaca historical bars
- Alpaca market news
- a locally synchronized instrument catalog

The browser does not communicate directly with Alpaca using private credentials.

```text
Browser
   ↓
Market Lens server/API layer
   ↓
MarketProvider abstraction
   ↓
Alpaca
```

Selected indices and commodities may initially be represented by ETF proxies:

```text
S&P 500       → SPY
Nasdaq-100    → QQQ
Dow Jones     → DIA
Russell 2000  → IWM
Gold          → GLD
Silver        → SLV
Oil           → USO
```

The UI must clearly identify these as ETF proxies rather than the underlying index or commodity.

### Predictive-search catalog

Instrument reference data is periodically synchronized into Supabase:

```text
Alpaca assets/reference data
        ↓
periodic sync
        ↓
Supabase instruments catalog
        ↓
predictive search
```

Live prices and historical time series are not permanently duplicated into Supabase for v1.

The application uses an internal `MarketProvider` abstraction so another provider can be added later without coupling React components to Alpaca.

---

## Environment variables and secret management

Real credentials are **never committed to Git**.

### Server-only secrets

Examples:

```text
ALPACA_API_KEY
ALPACA_API_SECRET
SUPABASE_SERVICE_ROLE_KEY
```

### Browser-safe public configuration

Only intentionally public values may use `VITE_`, for example:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

### GitHub

GitHub stores only source code and `.env.example`.

### Vercel

Configure environment variables under:

```text
Project → Settings → Environment Variables
```

Use separate scopes for:

- Development
- Preview
- Production

A typical setup is:

```text
Development → development credentials
Preview     → non-production/test credentials
Production  → production-approved credentials
```

Changing a Vercel environment variable requires a new deployment for the change to take effect.

---

## Market-data licensing note

This project uses market data under a free developer API license intended for non-commercial, hobby, educational, and training use. It is not a commercial project and is intended to remain within the provider's open/free usage terms.