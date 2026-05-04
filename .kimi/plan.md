# OpenHSK Performance & World-Class UX Overhaul

## Problem Statement
The app loads ~78MB of data and has a 1,765-line App.tsx monolith. Study mode uses random words instead of SRS. Stories/books lack click-to-define, ruby pinyin, and inline dictionary. Bundle is 408KB vendor + 109KB index.js. Users feel slowness on every interaction.

## Architecture Decisions
1. **Perceived performance > actual performance** — skeleton states, instant transitions, progressive disclosure
2. **Study is the core loop** — SRS due reviews, fast quiz, keyboard nav, audio autoplay
3. **Reading should feel like Kindle + Zhongwen** — click any word, ruby pinyin, inline popup, persistent position
4. **Bundle must shrink** — extract views, better chunking, defer heavy libs

---

## Phase 1: Bundle & Initial Load (Biggest Perceived Speed Win)

### 1.1 Extract inline views from App.tsx into lazy-loaded route components
**Why:** App.tsx is 1,765 lines / 109KB. Every state change re-renders ALL view functions.
**Files to create:**
- `src/views/DashboardView.tsx`
- `src/views/BrowseView.tsx`
- `src/views/StudyView.tsx`
- `src/views/ProgressView.tsx`
- `src/views/StoriesView.tsx`
- `src/views/BooksView.tsx`
- `src/views/DetailView.tsx`

### 1.2 Better Vite chunking
**Why:** vendor chunk is 408KB. Recharts only used in GrammarMap + progress charts.
**Changes in `vite.config.ts`:**
- Add `recharts` → `charts-vendor` chunk
- Add `lucide-react` → `icons-vendor` chunk

### 1.3 Preload critical data in index.html
- Add `<link rel="preload" as="fetch" crossorigin="anonymous" href="/hsk3.0.part1.json">`
- Add `<link rel="preload" as="fetch" crossorigin="anonymous" href="/dictionary.txt">`

### 1.4 Fix AnimatePresence mode="wait" on root
**Why:** Every view switch holds old DOM until exit animation finishes.
**Changes:** Replace with CSS fade transitions. Keep AnimatePresence only for detail/study.

### 1.5 Lazy-load AudioPlaylist
**Changes:** Convert to `lazy()` import.

---

## Phase 2: Study Mode — The Core Loop

### 2.1 SRS-aware study session
**Changes in App.tsx:**
- `startStudySession()` → `hskDataService.getRecommendedEntries(20)`
- Show "Due: X | New: Y" badge

### 2.2 Fast QuizMode
**Changes in `QuizMode.tsx`:**
- Fisher-Yates shuffle instead of biased `.sort(() => Math.random() - 0.5)`
- Pre-filter entries once, sample without replacement
- Keyboard navigation (1-4, Space)
- Memoize display functions

### 2.3 Flashcard performance
**Changes:**
- Extract to `StudyView.tsx`
- Audio autoplay on reveal
- Keyboard shortcuts (Space=flip, 1=Again, 2=Got it)
- Show 3 examples with "Show more"

### 2.4 hskDataService batching
- Batch localStorage writes with `requestIdleCallback`
- Debounce `calculateLevelProgress`
- Fix streak logic to use local midnight

---

## Phase 4: Stories & Books — World-Class Reading

### 4.1 Click-to-define ANY word in text
**Changes in `StoryViewer.tsx` and `BookReader.tsx`:**
- Every character clickable
- `InlineDictionaryPopup` on click (no navigation away)

### 4.2 InlineDictionaryPopup component
- Positioned absolutely near clicked word
- Shows hanzi, pinyin, definitions, HSK badge
- Buttons: "Full Details", "+ Study", "🔊 Listen"

### 4.3 Ruby pinyin alignment
- New utility: `src/lib/pinyinAligner.ts`
- `<ruby>` tags per character
- Toggle: Off / Hover / Always

### 4.4 Memoize highlightWords
- Cache per sentence

### 4.5 Replace TooltipProvider-per-word
- Use single shared tooltip or click-to-define popup

### 4.6 Story position persistence
- Save `currentSentenceIndex` per story_id

### 4.7 Mobile swipe gestures
- Swipe left/right between chapters

### 4.8 TTS read-along word highlighting
- Use `onboundary` events to highlight characters

### 4.9 Reading themes
- light | sepia | dark | black

### 4.10 Font size + line spacing
- Unified across stories and books
- Persist in localStorage

---

## Rollout Order

1. **Phase 1** (extract views, chunking, preload, AnimatePresence)
2. **Phase 2** (SRS study, fast quiz, flashcard UX)
3. **Phase 4** (click-to-define, ruby pinyin, inline popup)
4. **Phase 3** (browse/detail polish)
5. **Phase 5** (micro-opts, themes, swipe)
