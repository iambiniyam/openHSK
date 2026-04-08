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
```

## Deploy (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Runtime: Node.js `20.x` or newer

## Data Files

- `public/hsk3.0.json`
- `public/dictionary.txt`
- `public/graphics.txt`
