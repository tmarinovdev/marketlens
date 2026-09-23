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

The core package setup uses Node.js 24.x and npm. React, Vite, TypeScript,
and their supporting type packages are installed locally in the project.

Install the locked dependencies after cloning:

```bash
npm ci
```

Commit both `package.json` and `package-lock.json`; `node_modules/` remains
ignored. Direct dependency versions are pinned so upgrades are deliberate.

Run the SSR development server at `http://127.0.0.1:5173`:

```bash
npm run dev
```

The server uses Node's built-in HTTP module and Vite middleware. Node 24 runs
`server/dev.ts` directly using native type stripping; TypeScript checking is
a separate step. Vite transforms the React TSX files and provides Fast Refresh.
Restart `npm run dev` after editing `server/dev.ts`. React component edits
are handled by Vite without restarting the Node server.

React Compiler is enabled through `reactCompilerPreset()` and
`@rolldown/plugin-babel` in `vite.config.ts`. It automatically memoizes eligible
React components and hooks during development and production builds. The
Babel compiler runs as development tooling; Babel is not shipped to browsers.
React 19 supplies the compiler runtime. ESLint's recommended React Hooks rules
include compiler diagnostics and check that components follow the Rules of React.

Available validation commands:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run check
npm run build
```

`build` checks types, then creates browser assets in `dist/client/` and the
server renderer in `dist/server/`. For a deployable Vercel artifact, use
`npm run build:vercel`, followed by `npm run verify:vercel` to smoke-test it.
Serving `dist/client/` as a static site alone does not provide SSR.

The initial page is a minimal, unstyled placeholder. For `/`, the development
server renders `src/app/App.tsx` into the HTML template through
`src/entry-server.tsx`. The browser then hydrates that same component tree
through `src/entry-client.tsx`. Unknown application paths return 404 until
routing is added. Rendering is synchronous for now; no data fetching or
streaming is configured.

TypeScript configuration is split by runtime:

- `tsconfig.base.json`: shared strict checks and the `@/` source alias.
- `tsconfig.json`: browser code, with DOM types.
- `tsconfig.server.json`: SSR and development server code, with Node types.
- `tsconfig.node.json`: Vite configuration and build scripts, with Node types.

Shared components imported by the SSR entry are also checked with the server
settings. Vite resolves `@/` at runtime; the Node development server uses
native Node imports instead of TypeScript aliases.

ESLint uses a flat configuration in `eslint.config.js`, with recommended
JavaScript, TypeScript, React Hooks, and React Compiler checks. Lint warnings
fail the command so they are not silently accumulated. Type-aware ESLint rules
are not enabled; the separate TypeScript command checks types.

The current TypeScript ESLint parser requires the TypeScript 6 API. Following
Microsoft's compatibility setup, npm aliases install TypeScript 7.0.2 as
`@typescript/native` (providing `tsc`) and `@typescript/typescript6` as
`typescript` (providing the API ESLint needs and the separate `tsc6` command).
`npm run typecheck` and `npm run build` still use TypeScript 7.

Prettier owns formatting, using its defaults with LF line endings.
`eslint-config-prettier` disables conflicting formatting rules in ESLint;
Prettier runs independently. Build output and local reference files are ignored,
and npm's generated lockfile is excluded from formatting. `vercel.json` is also
excluded because Vercel loads it as platform configuration before invoking the
project's build command; Vercel validates that JSON separately.

Apply automatic fixes or formatting:

```bash
npm run lint:fix
npm run format
```

`npm run check` runs type checking, linting, and formatting verification without
editing files. Tests will be added to this command when Vitest is configured.

Additional planned scripts (to be added alongside their configuration):

```bash
npm run test
npm run test:run
npm run test:coverage
npm run test:e2e
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

The custom SSR deployment uses Vercel's
[Build Output API](https://vercel.com/docs/build-output-api). No additional
framework or adapter dependency is required.

`npm run build:vercel` builds the browser assets, then
`scripts/build-vercel.ts` packages `.vercel/output/`:

- `static/`: public browser assets, excluding the unfinished HTML template.
- `functions/ssr.func/`: a bundled Node 24 function and its HTML template.
- `config.json`: static-file routing, `/` to SSR, and a 404 fallback.

`server/handler.ts` renders through the same `src/entry-server.tsx` used locally.
React and other server dependencies are bundled into the function. Only the
HTML template is reused across requests; rendered responses are not cached.
`server/dev.ts` is for local development and is not included in this function.
The build cleans only `.vercel/output/`, preserving Vercel project-link metadata.

`npm run verify:vercel` starts the built handler on a temporary local port and
checks rendered HTML, browser asset availability, GET/HEAD requests, unknown
paths, and unsupported methods. This verifies the generated artifact locally;
Vercel's routing and runtime must also be checked after the first deployment.

Import `tmarinovdev/marketlens` in the Vercel dashboard with these settings:

- Application Preset: **Other** (the app still builds with Vite).
- Root Directory: repository root (`./`).
- Build Command: use `vercel.json`; leave dashboard overrides off.
- Output Directory: leave the override off; the Build Output API supplies it.
- Install Command: use `vercel.json` (`npm ci`).
- Node.js: **24.x**, also declared in `package.json`.
- Environment Variables: none needed for the initial placeholder page.

The repository's `vercel.json` runs checks, builds the deployment artifact, and
verifies it before deployment. Production follows `main`; use branches and pull
requests for preview deployments. Push the deployment configuration before
clicking Deploy. After deployment, verify that View Page Source includes the
MarketLens heading and that a nonexistent path returns HTTP 404.

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
