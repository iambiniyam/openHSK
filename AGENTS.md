# AGENTS.md

## Commands

```bash
npm run dev                  # Vite dev server
npm run build                # tsc -b && vite build  (typecheck first)
npm run lint                 # eslint .
npm run preview              # Vite preview of built dist/
npm run data:prepare:quality  # Build HSK lexical enrichment from CC-CEDICT
npm run data:prepare:examples # Build HSK example sentences from Tatoeba
npm run data:prepare:stories:test  # Compare AI chat models (small test first)
npm run data:prepare:stories       # Full AI story generation
npm run data:prepare:stories -- full gpt-oss-120b  # Force a specific model
npm run data:prepare:books:test    # Test: HSK 1 + 1 genre only
npm run data:prepare:books         # Full AI book generation (genre-based continuous stories)
npm run data:prepare:books -- full gpt-oss-120b --level=1 --genre=adventure  # Force model/level/genre
npm run deploy:pages:prod    # Deploy dist/ to Cloudflare Pages (main branch)
```

## Build & Deploy Quirks

- **`tsc -b && vite build`**: typechecking runs before Vite build. If types fail, build fails.
- **Deploy only via `npm run deploy:pages:prod`**. Never use `wrangler deploy` (that targets Workers, not Pages).
- **Node >= 20.19.0** required.
- Output directory: `dist/`.

## Architecture

- **SPA without React Router**: views are a `ViewMode` state machine in `src/App.tsx` (landing, dashboard, browse, detail, study, progress, audio, stories, books). No URL routing.
- **Path alias**: `@/` → `src/` (configured in both tsconfig and vite).
- **shadcn/ui**: new-york style, CSS variables theming, dark mode via `class` strategy. Components in `src/components/ui/`.
- **PWA**: service worker via `vite-plugin-pwa`. Large dataset files (HSK JSON, dictionary, graphics) use runtime `CacheFirst` under `openhsk-dataset-cache`; they are excluded from precache glob.
- **Data files** live in `public/` and are loaded client-side at runtime.

## Data Preparation

- Scripts are Node `.mjs` files in `scripts/data/` — no TypeScript, no build step.
- `data:prepare:stories:test` should be run first to compare model outputs before the full (expensive) generation.
- Stories dataset (`public/quality/hsk-stories.v1.json`) is optional. The app loads it in background without blocking.
- `data:prepare:books:test` tests a single HSK 1 adventure book before full generation.
- Books dataset (`public/quality/hsk-books.v1.json`) is optional. Genre-based continuous stories per HSK level.

## State Persistence

- UI session persisted to `localStorage` under key `openhsk.ui-session.v1`. On reload, view, filters, and scroll positions are restored.
- All persisted keys are validated with runtime type guards (see `isViewMode`, `isListViewMode`, `isProgressTab`, etc. in `src/App.tsx`).

## ESLint

- Flat config (`eslint.config.js`). Uses `typescript-eslint`, `react-hooks`, `react-refresh`.
- `src/components/ui/**` files have `react-refresh/only-export-components` disabled (shadcn components export multiple named exports).
- `dist/` is globally ignored.

## Key Dependencies

- `framer-motion` for animations, `hanzi-writer` for stroke order, `d3` + `react-force-graph-2d` for character graphs, `recharts` for statistics.
- Vite build chunks: `graph-vendor` (d3/react-force-graph-2d), `hanzi-vendor`, `radix-vendor`, `motion-vendor`, and general `vendor`.
