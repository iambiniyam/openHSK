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
npm run data:prepare:book         # Generate beautiful HTML books for ALL HSK levels (1-7)
npm run data:prepare:book:all     # Same as above (alias)
npm run data:prepare:book -- --level=1   # Generate book for HSK level 1 only
npm run data:prepare:book -- --levels=1,2,3  # Generate books for levels 1-3
npm run deploy:pages:prod    # Deploy dist/ to Cloudflare Pages (main branch)
```

## Beautiful HSK Books (`scripts/data/build-hsk-book.mjs`)

Generates stunning, interactive HTML books from the HSK dataset. Each book features:

- **Per-level learning guides**: 7 books (HSK 1–7), grouped by part of speech for logical progression
- **Rich word entries**: hanzi, traditional variants, tone-colored pinyin, multiple definitions, POS badges
- **Graded examples**: 3 difficulty levels (beginner/elementary/intermediate) with chinese + pinyin + english
- **Learning aids**: mnemonics, character breakdown with etymology hints, distinguish tips
- **Grammar**: common patterns, collocations, common mistakes with corrections
- **Related vocabulary**: synonyms, antonyms, word family organized visually
- **Interactive audio**: click any 🔊 button for instant TTS pronunciation (Web Speech API)
- **Beautiful design**: HSK-level color coding, card-based layout, dark mode toggle, responsive
- **Print-ready**: CSS @page rules, page-break handling for PDF export (open in browser → Print → Save as PDF)

Output: `out/hsk-level-{N}.html` + `out/index.html` (navigation hub)

## Architecture

- **SPA without React Router**: views are a `ViewMode` state machine in `src/App.tsx` (landing, browse, detail, audio, stories, books). No URL routing.
- **Path alias**: `@/` → `src/` (configured in both tsconfig and vite).
- **shadcn/ui**: new-york style, CSS variables theming, dark mode via `class` strategy. Components in `src/components/ui/`.
- **PWA**: service worker via `vite-plugin-pwa`. HSK dataset files use runtime `CacheFirst` under `openhsk-dataset-cache`; excluded from precache glob.
- **Data files** live in `public/` and are loaded client-side at runtime.

## Data Preparation

- Scripts are Node `.mjs` files in `scripts/data/` — no TypeScript, no build step.
- `data:prepare:stories:test` should be run first to compare model outputs before the full (expensive) generation.
- Stories dataset (`public/quality/hsk-stories.v1.json`) is optional. The app loads it in background without blocking.
- `data:prepare:books:test` tests a single HSK 1 adventure book before full generation.
- Books dataset (`public/quality/hsk-books.v1.json`) is optional. Genre-based continuous stories per HSK level.
- `data:prepare:book` generates standalone interactive HTML books (no dependencies, open in any browser).

## State Persistence

- UI session persisted to `localStorage` under key `openhsk.ui-session.v1`. On reload, view, filters, and scroll positions are restored.
- All persisted keys are validated with runtime type guards (see `isViewMode`, etc. in `src/App.tsx`).

## ESLint

- Flat config (`eslint.config.js`). Uses `typescript-eslint`, `react-hooks`, `react-refresh`.
- `src/components/ui/**` files have `react-refresh/only-export-components` disabled (shadcn components export multiple named exports).
- `dist/` is globally ignored.
