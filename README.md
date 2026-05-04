# OpenHSK

OpenHSK is a fast Chinese learning app with HSK vocabulary, stroke practice, quizzes, and daily study workflows.

## Stack

- React 19 + TypeScript + Vite
- Tailwind + shadcn/ui + Framer Motion
- PWA enabled (offline-ready after first load)

## Quick Start

Node.js `>=20.19.0`, npm `>=10`

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
npm run data:prepare:quality
npm run data:prepare:examples
npm run data:prepare:stories
```

`npm run data:prepare:quality` builds an HSK-focused lexical enrichment file from CC-CEDICT.
`npm run data:prepare:examples` builds an HSK-focused example sentence enrichment file from Tatoeba Mandarin-English pairs.
`npm run data:prepare:stories` generates AI-powered stories for each HSK level that incorporate target vocabulary for contextual memorization. Run `npm run data:prepare:stories:test` first to compare chat models.

Data preparation scripts are in `scripts/data/`.

## Story-Based Learning

OpenHSK includes an AI-powered story generation pipeline that creates engaging Chinese stories embedding HSK vocabulary words. Each story includes:
- Full Chinese text with sentence-by-sentence pinyin and English translation
- Multiple display modes (Chinese-only, Chinese+Pinyin, Chinese+English, annotated vocabulary)
- Vocabulary word usage tracking with context sentences
- Coverage analysis per HSK level

### Generating Story Datasets

```bash
# Compare chat models with a small test (recommended first step)
npm run data:prepare:stories:test

# Generate the full story dataset with the best model
npm run data:prepare:stories

# Force a specific model (e.g., gpt-oss-120b or gemma-4-31b)
npm run data:prepare:stories -- full gpt-oss-120b
```

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Runtime: Node.js `20.x` or newer
- Deploy command (if manually configured): `npm run deploy:pages:prod`
- Do not use: `wrangler deploy`

## Data Files

- `public/hsk3.0.part1.json`
- `public/hsk3.0.part2.json`
- `public/dictionary.txt`
- `public/graphics.part1.txt`
- `public/graphics.part2.txt`
- `public/quality/hsk-cedict-enrichment.v1.json`
- `public/quality/hsk-tatoeba-examples.v1.json`
- `public/quality/ATTRIBUTION-CC-CEDICT.txt`
- `public/quality/ATTRIBUTION-TATOEBA.txt`
- `public/quality/hsk-stories.v1.json`
