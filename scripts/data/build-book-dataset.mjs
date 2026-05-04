import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// ── Configuration ──────────────────────────────────────────────────────────

const HSK_PARTS = [
  path.join(ROOT, 'public', 'hsk3.0.part1.json'),
  path.join(ROOT, 'public', 'hsk3.0.part2.json'),
];

const QUALITY_DIR = path.join(ROOT, 'public', 'quality');
const BOOKS_OUTPUT = path.join(QUALITY_DIR, 'hsk-books.v1.json');

const EMBEDDING_API = process.env.OPENHSK_EMBEDDING_API || 'http://10.10.11.7:11535/v1/embeddings';
const EMBEDDING_MODEL = process.env.OPENHSK_EMBEDDING_MODEL || 'BAAI/bge-m3';
const EMBEDDING_BATCH = 40;

const CHAT_MODELS = [
  { name: 'gpt-oss-120b', url: process.env.OPENHSK_CHAT_API_1 || 'http://10.10.11.7:11541/v1/chat/completions', model: 'openai-mirror/gpt-oss-120b', key: process.env.OPENHSK_API_KEY || 'vllm', maxTokens: 131072 },
  { name: 'gemma-4-31b', url: process.env.OPENHSK_CHAT_API_2 || 'http://10.10.11.7:11542/v1/chat/completions', model: 'google/gemma-4-31B-it', key: process.env.OPENHSK_API_KEY || 'vllm', maxTokens: 138240 },
];

const RERANK_API = process.env.OPENHSK_RERANK_API || 'http://10.10.11.7:11534/v1/rerank';
const RERANK_MODEL = process.env.OPENHSK_RERANK_MODEL || 'BAAI/bge-reranker-v2-m3';

const WORDS_PER_CHAPTER = { 1: 28, 2: 32, 3: 36, 4: 40, 5: 42, 6: 45, 7: 50 };
const MIN_WORDS_PER_CHAPTER = 12;
const CONCURRENCY = 1;
const API_DELAY_MS = 3000;
const MAX_RETRIES = 2;

const GENRES = [
  { id: 'adventure',    labelZh: '冒险', labelEn: 'Adventure',    icon: '🏔️' },
  { id: 'mystery',      labelZh: '悬疑', labelEn: 'Mystery',      icon: '🔍' },
  { id: 'scifi',        labelZh: '科幻', labelEn: 'Sci-Fi',       icon: '🚀' },
  { id: 'romance',      labelZh: '爱情', labelEn: 'Romance',      icon: '💕' },
  { id: 'historical',   labelZh: '历史', labelEn: 'Historical',   icon: '🏯' },
  { id: 'comedy',       labelZh: '喜剧', labelEn: 'Comedy',       icon: '😄' },
  { id: 'thriller',     labelZh: '惊悚', labelEn: 'Thriller',     icon: '🌑' },
  { id: 'slice_of_life',labelZh: '生活', labelEn: 'Slice of Life',icon: '🏠' },
  { id: 'fantasy',      labelZh: '奇幻', labelEn: 'Fantasy',      icon: '🐉' },
  { id: 'travel',       labelZh: '旅行', labelEn: 'Travel',       icon: '🗺️' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: options.signal });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${url}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

function logSection(title) {
  const line = '─'.repeat(50);
  console.log(`\n${line}\n  ${title}\n${line}`);
}

// ── API Functions ──────────────────────────────────────────────────────────

async function getEmbeddings(texts) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 60000);
  try {
    const body = { model: EMBEDDING_MODEL, input: texts, encoding_format: 'float' };
    const data = await fetchJson(EMBEDDING_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return data.data.map((d) => d.embedding);
  } finally {
    clearTimeout(timeout);
  }
}

function cosineSim(a, b) {
  let dot = 0, mA = 0, mB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; mA += a[i] * a[i]; mB += b[i] * b[i];
  }
  return dot / (Math.sqrt(mA) * Math.sqrt(mB));
}

async function chatCompletion(modelConfig, messages, opts = {}) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 600000);
  try {
    const body = {
      model: modelConfig.model,
      messages,
      temperature: opts.temperature ?? 0.75,
      max_tokens: opts.max_tokens ?? 12288,
    };
    const data = await fetchJson(modelConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${modelConfig.key}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return data.choices[0].message.content;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Data Loading ───────────────────────────────────────────────────────────

function loadHskEntries() {
  const all = [];
  for (const fp of HSK_PARTS) {
    if (!fs.existsSync(fp)) throw new Error(`Missing: ${fp}`);
    all.push(...JSON.parse(fs.readFileSync(fp, 'utf8')));
  }
  return all;
}

function extractWords(entries) {
  return entries.map((e) => ({
    entry_id: e.entry_id,
    hanzi: e.source.hanzi,
    pinyin: e.source.pinyin,
    meaning: e.source.meaning,
    level: e.source.level,
    pos: e.core.part_of_speech || [],
  }));
}

// ── API Health Check ────────────────────────────────────────────────────────

async function checkApiHealth(baseUrl, key) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(baseUrl, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch { return false; }
}

async function checkAllApis() {
  console.log('  Checking API endpoints...');
  const embBase = EMBEDDING_API.replace('/embeddings', '') + '/models';
  const chatBases = CHAT_MODELS.map((m) => m.url.replace('/chat/completions', '') + '/models');
  const results = await Promise.all([
    checkApiHealth(embBase, '').then((ok) => ({ name: 'embedding (bge-m3)', ok })),
    ...CHAT_MODELS.map((m, i) =>
      checkApiHealth(chatBases[i], m.key).then((ok) => ({ name: `chat (${m.name})`, ok }))
    ),
  ]);
  for (const r of results) console.log(`    ${r.ok ? '✓' : '✗'} ${r.name}`);
  const chatOk = results.slice(1).some((r) => r.ok);
  if (!chatOk) throw new Error('No chat API reachable.');
  return { embeddingOk: results[0].ok };
}

// ── Thematic Clustering ────────────────────────────────────────────────────

function clusterWordsByCharacters(words, numClusters) {
  const similarity = (a, b) => {
    let score = 0;
    const aChars = new Set(a.hanzi);
    for (const ch of b.hanzi) if (aChars.has(ch)) score += 3;
    const aPOS = new Set(a.pos);
    for (const p of b.pos) if (aPOS.has(p)) score += 4;
    if (a.hanzi[0] === b.hanzi[0]) score += 5;
    return score;
  };

  const remaining = [...words];
  const anchors = [];
  const usedAsAnchor = new Set();
  for (const w of remaining) {
    if (anchors.length >= numClusters) break;
    if (!usedAsAnchor.has(w.entry_id)) { anchors.push(w); usedAsAnchor.add(w.entry_id); }
  }
  while (anchors.length < numClusters) {
    const r = remaining[Math.floor(Math.random() * remaining.length)];
    if (!usedAsAnchor.has(r.entry_id)) { anchors.push(r); usedAsAnchor.add(r.entry_id); }
  }

  const clusters = anchors.map((a) => [a]);
  const assigned = new Set(anchors.map((a) => a.entry_id));
  for (const w of remaining) {
    if (assigned.has(w.entry_id)) continue;
    let best = 0, bestScore = -1;
    for (let k = 0; k < clusters.length; k++) {
      let totalSim = 0;
      const sample = clusters[k].slice(0, 6);
      for (const cw of sample) totalSim += similarity(w, cw);
      const avgSim = totalSim / sample.length;
      if (avgSim > bestScore) { bestScore = avgSim; best = k; }
    }
    clusters[best].push(w);
    assigned.add(w.entry_id);
  }
  for (const c of clusters) c.theme = extractClusterTheme(c);
  return clusters.filter((c) => c.length > 0);
}

async function clusterWordsByEmbedding(words, numClusters) {
  console.log(`  Embedding ${words.length} words via bge-m3 for thematic clustering...`);
  const embeddingMap = new Map();
  for (let i = 0; i < words.length; i += EMBEDDING_BATCH) {
    const batch = words.slice(i, i + EMBEDDING_BATCH);
    const texts = batch.map((w) => `[${w.hanzi}] ${w.meaning}`);
    const embs = await getEmbeddings(texts);
    for (let j = 0; j < batch.length; j++) embeddingMap.set(batch[j].entry_id, { word: batch[j], emb: embs[j] });
    process.stdout.write(`\r    Embedded ${Math.min(i + EMBEDDING_BATCH, words.length)}/${words.length}`);
    await sleep(150);
  }
  console.log('');

  const items = [...embeddingMap.values()];
  const centroids = [items[Math.floor(Math.random() * items.length)].emb];
  for (let k = 1; k < numClusters; k++) {
    const distances = items.map((item) => {
      let minDist = Infinity;
      for (const c of centroids) { const d = 1 - cosineSim(item.emb, c); if (d < minDist) minDist = d; }
      return minDist;
    });
    const totalDist = distances.reduce((s, d) => s + d, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < items.length; i++) { r -= distances[i]; if (r <= 0) { centroids.push(items[i].emb); break; } }
    if (centroids.length <= k) centroids.push(items[items.length - 1].emb);
  }

  let assignments = new Array(items.length).fill(0);
  for (let iter = 0; iter < 15; iter++) {
    let changed = false;
    for (let i = 0; i < items.length; i++) {
      let best = 0, bestDist = -Infinity;
      for (let k = 0; k < centroids.length; k++) { const sim = cosineSim(items[i].emb, centroids[k]); if (sim > bestDist) { bestDist = sim; best = k; } }
      if (assignments[i] !== best) { changed = true; assignments[i] = best; }
    }
    const sums = Array.from({ length: numClusters }, () => new Array(centroids[0].length).fill(0));
    const counts = new Array(numClusters).fill(0);
    for (let i = 0; i < items.length; i++) { const c = assignments[i]; counts[c]++; for (let j = 0; j < items[i].emb.length; j++) sums[c][j] += items[i].emb[j]; }
    for (let k = 0; k < numClusters; k++) { if (counts[k] > 0) for (let j = 0; j < centroids[k].length; j++) centroids[k][j] = sums[k][j] / counts[k]; }
    if (!changed) break;
  }

  const clusters = [];
  for (let k = 0; k < numClusters; k++) clusters.push([]);
  for (let i = 0; i < items.length; i++) clusters[assignments[i]].push(items[i].word);
  for (const c of clusters) c.theme = extractClusterTheme(c);
  return clusters.filter((c) => c.length > 0);
}

async function clusterWordsThematically(words, numClusters, useEmbeddings) {
  if (useEmbeddings) {
    try { return await clusterWordsByEmbedding(words, numClusters); }
    catch (e) { console.warn(`  Embedding API failed: ${e.message}\n  Falling back to character+POS clustering...`); }
  }
  return clusterWordsByCharacters(words, numClusters);
}

function extractClusterTheme(words) {
  const allMeanings = words.map((w) => w.meaning.toLowerCase()).join(' ');
  const keywords = allMeanings.split(/[\s,;()/]+/).filter((w) => w.length > 3);
  const freq = new Map();
  for (const kw of keywords) freq.set(kw, (freq.get(kw) || 0) + 1);
  const stopWords = new Set(['with', 'from', 'that', 'this', 'have', 'been', 'they', 'will', 'which', 'about', 'their', 'there', 'used', 'also', 'some']);
  const sorted = [...freq.entries()].filter(([k]) => !stopWords.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return sorted.map(([k]) => k).join(', ') || 'general';
}

// ── Genre Prompts ───────────────────────────────────────────────────────────

function getGenreSettings(genreId) {
  const settings = {
    adventure: {
      tone: 'Exciting, fast-paced, with clear goals and obstacles',
      elements: 'quests, exploration, physical challenges, discovery of new places or abilities, overcoming adversity',
      setting: 'remote mountains, ancient temples, bustling marketplaces, uncharted territories',
      protagonist: 'brave explorer, curious student, or unlikely hero discovering their courage',
    },
    mystery: {
      tone: 'Suspenseful, clever, with gradual revelations and satisfying conclusions',
      elements: 'clues, red herrings, logical deduction, hidden secrets, surprising twists',
      setting: 'old neighborhoods, markets with hidden corners, school campuses, family homes with secrets',
      protagonist: 'observant amateur detective, curious journalist, or clever child noticing what adults miss',
    },
    scifi: {
      tone: 'Imaginative, thought-provoking, blending technology with human emotion',
      elements: 'future technology, space exploration, AI, scientific discovery, ethical dilemmas',
      setting: 'near-future China, space stations, high-tech labs, virtual worlds',
      protagonist: 'scientist, engineer, student at a tech academy, or ordinary person encountering the extraordinary',
    },
    romance: {
      tone: 'Warm, emotionally resonant, with genuine character connection',
      elements: 'meeting, misunderstanding, growing affection, sacrifice, heartfelt resolution',
      setting: 'coffee shops, university campuses, parks in spring, family gatherings, modern workplaces',
      protagonist: 'young professional, university student, or someone rediscovering love',
    },
    historical: {
      tone: 'Rich, atmospheric, grounded in cultural authenticity',
      elements: 'historical events, cultural traditions, period-appropriate details, generational wisdom',
      setting: 'ancient China (Tang/Song/Ming dynasties), Silk Road, imperial courts, traditional villages',
      protagonist: 'scholar, artisan, merchant, or young person navigating tradition and change',
    },
    comedy: {
      tone: 'Lighthearted, witty, with humorous misunderstandings and happy endings',
      elements: 'mistaken identity, cultural mix-ups, comedic timing, playful dialogue, absurd situations',
      setting: 'schools, offices, family dinners, social gatherings, travel mishaps',
      protagonist: 'lovable goof, witty observer, or well-meaning person causing accidental chaos',
    },
    thriller: {
      tone: 'Tense, gripping, with high stakes and narrow escapes',
      elements: 'danger, pursuit, hidden threats, time pressure, courage under fire',
      setting: 'city streets at night, remote locations, crowded stations, abandoned buildings',
      protagonist: 'ordinary person caught in extraordinary danger, or someone with a hidden past',
    },
    slice_of_life: {
      tone: 'Gentle, observant, finding beauty in everyday moments',
      elements: 'daily routines, family relationships, friendship, personal growth, small triumphs',
      setting: 'neighborhoods, homes, schools, local shops, parks, community centers',
      protagonist: 'student, parent, shopkeeper, or anyone living their daily life with quiet wisdom',
    },
    fantasy: {
      tone: 'Magical, wondrous, blending myth with imagination',
      elements: 'magic systems, mythical creatures, ancient prophecies, chosen ones, moral choices',
      setting: 'magical academies, enchanted forests, dragon kingdoms, spirit worlds, temples of power',
      protagonist: 'young mage, dragon companion, reincarnated hero, or ordinary person discovering magic',
    },
    travel: {
      tone: 'Curious, descriptive, celebrating cultural discovery and personal growth',
      elements: 'journeys, local customs, food, landscapes, unexpected friendships, self-discovery',
      setting: 'famous Chinese landmarks, countryside villages, night markets, train journeys, natural wonders',
      protagonist: 'backpacker, exchange student, photographer, or local guide showing their homeland',
    },
  };
  return settings[genreId] || settings.slice_of_life;
}

function buildGenreSystemPrompt(level, wordCount, genre, totalChapters, chapterNum) {
  const gSettings = getGenreSettings(genre.id);
  const isFirstChapter = chapterNum === 1;
  const isAdvanced = level >= 5;
  const chapterLength = Math.max(300, Math.min(1800, wordCount * 40));

  return `You are a master ${genre.labelEn} storyteller and Chinese language educator. You are writing a ${isAdvanced ? 'sophisticated' : 'engaging'} ${genre.labelEn} novel in Simplified Chinese designed for HSK Level ${level} learners.

## GENRE: ${genre.icon} ${genre.labelEn} (${genre.labelZh})
**Tone**: ${gSettings.tone}
**Key Elements**: ${gSettings.elements}
**Setting Suggestions**: ${gSettings.setting}
**Protagonist Style**: ${gSettings.protagonist}

## BOOK STRUCTURE
- This is Chapter ${chapterNum} of ${totalChapters} total chapters
- The entire book will tell ONE continuous ${genre.labelEn} story
${isFirstChapter ? '- This is the FIRST chapter: introduce the protagonist, setting, and inciting incident' : '- Continue the ongoing narrative. Maintain character consistency, advance the plot, and end with a hook for the next chapter'}

## YOUR MISSION
Write Chapter ${chapterNum} that:
1. ${isFirstChapter ? 'Establishes the world, characters, and central conflict' : 'Continues the story naturally from the previous chapter'}
2. Naturally incorporates ALL target vocabulary words listed below
3. Reads like authentic ${genre.labelEn} literature — not a textbook
4. ${!isFirstChapter ? 'References previous events naturally to maintain continuity' : ''}

## CRITICAL RULES
1. **Use EVERY target word at least once** — non-negotiable
2. Words must appear in natural, meaning-revealing contexts
3. Each sentence on its own line in Chinese, with matching pinyin (TONE NUMBERS 1-5) and English lines
4. Maintain ${genre.labelEn} genre conventions: ${gSettings.elements}
5. **This chapter should stand as an exciting piece of the larger narrative**
6. End with a compelling hook/cliffhanger for the next chapter${isFirstChapter ? '' : '\n7. Maintain consistency with characters and events from previous chapters'}

## CHAPTER LENGTH
Target: ~${chapterLength} Chinese characters — enough to develop the scene and cover the vocabulary naturally.

## OUTPUT FORMAT — Strict JSON only, no markdown wrappers
{
  "title_chinese": "Chapter ${chapterNum} title in Chinese",
  "title_english": "Chapter ${chapterNum} title in English",
  "story_chinese": "Sentence 1\\nSentence 2\\n...",
  "story_pinyin": "Pinyin line 1\\nPinyin line 2\\n...",
  "story_english": "English line 1\\nEnglish line 2\\n...",
  "word_usage": [
    {
      "hanzi": "word",
      "pinyin": "pinyin with tone numbers",
      "sentence": "exact sentence from story containing this word",
      "context_meaning": "what the word means in this specific context"
    }
  ]
}`;
}

function buildGenreVocabPrompt(words, level, genre, chapterNum, totalChapters) {
  const wordList = words.map((w, i) => `${i + 1}. **${w.hanzi}** (${w.pinyin}) — ${w.meaning}`).join('\n');
  const hanziList = words.map((w) => w.hanzi).join('、');

  return `## HSK Level ${level} — ${genre.icon} ${genre.labelEn} Book — Chapter ${chapterNum}/${totalChapters}
## Target Vocabulary (${words.length} words — ALL must be used in this chapter):

${wordList}

---
## VERIFICATION CHECKLIST
Before outputting, verify: ${hanziList}

Write Chapter ${chapterNum} of this ${genre.labelEn} novel now. Every one of these ${words.length} words MUST appear in the narrative.`;
}

function buildContinuityContext(previousChapters) {
  if (!previousChapters || previousChapters.length === 0) return '';
  const lastChapter = previousChapters[previousChapters.length - 1];
  const summary = previousChapters.map((ch) =>
    `Chapter ${ch.chapter_number}: "${ch.title_chinese}" — ${ch.sentences.slice(-3).map((s) => s.chinese).join(' ')}`
  ).join('\n');

  return `## PREVIOUS CHAPTERS SUMMARY (for continuity)
${summary}

## LAST CHAPTER ENDING (continue from here)
${lastChapter.sentences.slice(-5).map((s) => s.chinese).join('\n')}

Maintain character names, personalities, and plot threads from above.`;
}

function buildFollowUpPrompt(missingWords) {
  const wordList = missingWords.map((w) => `${w.hanzi} (${w.pinyin}): ${w.meaning}`).join('\n');
  return `Excellent chapter! However, these vocabulary words were NOT used:

${wordList}

Please add 2-4 additional sentences to the END of this chapter that naturally incorporates ALL of these missing words. Return the same JSON structure with the updated story_chinese, story_pinyin, story_english, and word_usage.

Return ONLY the complete updated JSON.`;
}

// ── Response Parsing ───────────────────────────────────────────────────────

function parseChapterJson(response, targetWords) {
  let jsonStr = response.trim();
  const fenceMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) jsonStr = objMatch[0];

  let parsed;
  try { parsed = JSON.parse(jsonStr); }
  catch { return { error: 'JSON parse failed', raw: response.slice(0, 500), coverage: 0, missing_words: targetWords.map((w) => w.hanzi) }; }

  const cnLines = (parsed.story_chinese || '').split('\n').filter((l) => l.trim());
  const pyLines = (parsed.story_pinyin || '').split('\n').filter((l) => l.trim());
  const enLines = (parsed.story_english || '').split('\n').filter((l) => l.trim());

  const sentences = [];
  const max = Math.max(cnLines.length, pyLines.length, enLines.length);
  for (let i = 0; i < max; i++) {
    sentences.push({ chinese: cnLines[i] || '', pinyin: pyLines[i] || '', english: enLines[i] || '' });
  }

  const usedHanzi = new Set();
  const wordUsage = (parsed.word_usage || []).map((u) => {
    const h = u.hanzi || u.word || '';
    usedHanzi.add(h);
    return { hanzi: h, pinyin: u.pinyin || '', sentence: u.sentence || '', context_meaning: u.context_meaning || '' };
  });

  const targetHanzi = new Set(targetWords.map((w) => w.hanzi));
  const missing = [...targetHanzi].filter((h) => !usedHanzi.has(h));
  const coverage = targetHanzi.size > 0 ? usedHanzi.size / targetHanzi.size : 0;

  return {
    title_chinese: parsed.title_chinese || '',
    title_english: parsed.title_english || '',
    story_chinese: parsed.story_chinese || '',
    story_pinyin: parsed.story_pinyin || '',
    story_english: parsed.story_english || '',
    sentences,
    word_usage: wordUsage,
    coverage,
    missing_words: missing,
    char_count: (parsed.story_chinese || '').replace(/\s/g, '').length,
  };
}

// ── Chapter Generation ─────────────────────────────────────────────────────

async function generateOneChapter(modelConfig, words, level, genre, chapterNum, totalChapters, previousChapters) {
  const prefix = `  [Ch ${chapterNum}/${totalChapters}]`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const continuityCtx = buildContinuityContext(previousChapters);
      const messages = [
        { role: 'system', content: buildGenreSystemPrompt(level, words.length, genre, totalChapters, chapterNum) },
        ...(continuityCtx ? [{ role: 'user', content: continuityCtx }] : []),
        { role: 'user', content: buildGenreVocabPrompt(words, level, genre, chapterNum, totalChapters) },
      ];

      const response = await chatCompletion(modelConfig, messages, {
        temperature: 0.75,
        max_tokens: Math.min(12288, Math.max(4096, words.length * 180)),
      });

      let result = parseChapterJson(response, words);
      if (result.error) {
        console.log(`${prefix} JSON parse error (attempt ${attempt + 1}), retrying...`);
        await sleep(API_DELAY_MS);
        continue;
      }

      if (result.missing_words.length > 0 && attempt < MAX_RETRIES) {
        console.log(`${prefix} ${result.missing_words.length} words missing, requesting additions...`);
        const missingData = result.missing_words.map((h) => words.find((w) => w.hanzi === h) || { hanzi: h, pinyin: '', meaning: '' });
        const followUpMessages = [
          { role: 'system', content: buildGenreSystemPrompt(level, words.length, genre, totalChapters, chapterNum) },
          ...(continuityCtx ? [{ role: 'user', content: continuityCtx }] : []),
          { role: 'user', content: buildGenreVocabPrompt(words, level, genre, chapterNum, totalChapters) },
          { role: 'assistant', content: response },
          { role: 'user', content: buildFollowUpPrompt(missingData) },
        ];
        const followUp = await chatCompletion(modelConfig, followUpMessages, {
          temperature: 0.65,
          max_tokens: Math.min(8192, Math.max(2048, missingData.length * 150)),
        });
        result = parseChapterJson(followUp, words);
        if (result.error) continue;
      }

      return { ...result, attempt: attempt + 1 };
    } catch (e) {
      console.error(`${prefix} Error (attempt ${attempt + 1}):`, e.message);
      if (attempt < MAX_RETRIES) await sleep(API_DELAY_MS * 2);
    }
  }

  return {
    title_chinese: `Chapter ${chapterNum}`,
    title_english: '',
    story_chinese: '',
    story_pinyin: '',
    story_english: '',
    sentences: [],
    word_usage: [],
    coverage: 0,
    missing_words: words.map((w) => w.hanzi),
    error: 'Failed after max retries',
    char_count: 0,
  };
}

// ── Book Generation ─────────────────────────────────────────────────────────

async function generateBook(modelConfig, level, allLevelWords, genre, useEmbeddings, onChapterDone) {
  const wordsPerChapter = WORDS_PER_CHAPTER[level] || 35;
  const totalChapters = Math.max(3, Math.ceil(allLevelWords.length / wordsPerChapter));
  const actualWpc = Math.ceil(allLevelWords.length / totalChapters);

  console.log(`\n  📖 ${genre.icon} ${genre.labelEn} (${genre.labelZh})`);
  console.log(`     ${allLevelWords.length} words → ${totalChapters} chapters × ~${actualWpc} words`);

  // Cluster words into chapters
  const clusters = await clusterWordsThematically(allLevelWords, totalChapters, useEmbeddings);

  // Balance clusters
  const chapterBatches = [];
  for (const cluster of clusters) {
    if (cluster.length <= actualWpc + 10) {
      if (cluster.length >= MIN_WORDS_PER_CHAPTER) chapterBatches.push(cluster);
    } else {
      for (let i = 0; i < cluster.length; i += actualWpc) {
        const chunk = cluster.slice(i, i + actualWpc);
        if (chunk.length >= MIN_WORDS_PER_CHAPTER) { chunk.theme = cluster.theme; chapterBatches.push(chunk); }
      }
    }
  }

  // Distribute stragglers
  const usedIds = new Set(chapterBatches.flat().map((w) => w.entry_id));
  const leftovers = allLevelWords.filter((w) => !usedIds.has(w.entry_id));
  for (const w of leftovers) {
    let best = 0, minCount = Infinity;
    for (let i = 0; i < chapterBatches.length; i++) {
      if (chapterBatches[i].length < minCount) { minCount = chapterBatches[i].length; best = i; }
    }
    chapterBatches[best].push(w);
  }

  const actualChapters = chapterBatches.length;
  console.log(`     ${actualChapters} chapters ready`);

  // Generate chapters one at a time
  const chapters = [];
  const allWordUsage = [];
  let totalChars = 0;
  const bookStart = Date.now();

  for (let ci = 0; ci < actualChapters; ci++) {
    const batch = chapterBatches[ci];
    const theme = batch.theme || extractClusterTheme(batch);
    const elapsed = Math.round((Date.now() - bookStart) / 1000);
    const eta = ci > 0 ? Math.round(elapsed / ci * (actualChapters - ci)) : 0;

    process.stdout.write(`\r     [Ch ${ci + 1}/${actualChapters}] "${theme.slice(0, 35)}" (${batch.length}w) | ETA ${eta}s`.padEnd(90));

    const result = await generateOneChapter(modelConfig, batch, level, genre, ci + 1, actualChapters, chapters);

    const chapter = {
      chapter_number: ci + 1,
      title_chinese: result.title_chinese,
      title_english: result.title_english,
      sentences: result.sentences || [],
      words_introduced: batch.map((w) => w.hanzi),
      word_count: batch.length,
    };

    chapters.push(chapter);

    if (result.word_usage) {
      for (const wu of result.word_usage) {
        allWordUsage.push({ ...wu, chapter_number: ci + 1 });
      }
    }
    totalChars += result.char_count || 0;

    const covStr = result.coverage > 0 ? `${(result.coverage * 100).toFixed(0)}%` : 'FAIL';
    const missingStr = result.missing_words?.length ? ` missing:${result.missing_words.length}` : '';
    console.log(`\n       ✓ ${covStr} | ${result.char_count || 0} chars${missingStr}${result.attempt > 1 ? ` (retry ${result.attempt})` : ''}`);

    // Incremental save callback
    if (onChapterDone) {
      await onChapterDone({
        chapters,
        word_usage: allWordUsage,
        chapter,
        chapterIndex: ci,
        totalChapters: actualChapters,
      });
    }

    await sleep(API_DELAY_MS);
  }

  // Calculate coverage
  const usedHanzi = new Set(allWordUsage.map((u) => u.hanzi).filter(Boolean));
  const targetHanzi = new Set(allLevelWords.map((w) => w.hanzi));
  const missing = [...targetHanzi].filter((h) => !usedHanzi.has(h));
  const coverage = targetHanzi.size > 0 ? usedHanzi.size / targetHanzi.size : 0;

  const bookTime = Math.round((Date.now() - bookStart) / 1000);
  console.log(`     ✅ Book complete: ${(coverage * 100).toFixed(1)}% coverage in ${bookTime}s`);

  return {
    chapters,
    word_usage: allWordUsage,
    coverage,
    missing_words: missing,
    char_count: totalChars,
    total_chapters: chapters.length,
  };
}

// ── Book Title/Description Generation ──────────────────────────────────────

async function generateBookTitle(modelConfig, level, genre, allWordUsage, chapters) {
  const themeWords = chapters.slice(0, 3).flatMap((ch) => ch.words_introduced.slice(0, 6));
  const sampleText = chapters.slice(0, 3).flatMap((ch) => ch.sentences.slice(0, 3).map((s) => s.chinese)).join(' ');

  const prompt = `Based on this ${genre.labelEn} story for HSK Level ${level}, generate a compelling title and description.

Key vocabulary themes: ${themeWords.join(', ')}
Sample text: ${sampleText.slice(0, 300)}

Return ONLY JSON:
{
  "title_chinese": "Chinese book title that captures the genre and story essence",
  "title_english": "English book title",
  "description_chinese": "2-3 sentence Chinese description that hooks the reader",
  "description_english": "2-3 sentence English description that hooks the reader"
}`;

  try {
    const response = await chatCompletion(modelConfig, [
      { role: 'system', content: `You are a book marketing copywriter specializing in ${genre.labelEn} fiction for Chinese language learners.` },
      { role: 'user', content: prompt },
    ], { temperature: 0.8, max_tokens: 1024 });

    let jsonStr = response.trim();
    const fenceMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const parsed = JSON.parse(jsonStr);
    return {
      title_chinese: parsed.title_chinese || `${genre.labelZh}故事`,
      title_english: parsed.title_english || `${genre.labelEn} Story`,
      description_chinese: parsed.description_chinese || `一本HSK${level}${genre.labelZh}小说`,
      description_english: parsed.description_english || `An HSK ${level} ${genre.labelEn} novel`,
    };
  } catch {
    return {
      title_chinese: `${genre.labelZh}故事 - HSK ${level}`,
      title_english: `${genre.labelEn} Story - HSK ${level}`,
      description_chinese: `一本为HSK${level}学习者创作的${genre.labelZh}小说`,
      description_english: `A ${genre.labelEn} novel written for HSK ${level} learners`,
    };
  }
}

// ── Dataset Writer ─────────────────────────────────────────────────────────

function writeDatasetSafe(filePath, meta, coverageByLevel, allBooks) {
  const tmpPath = filePath + '.tmp';
  const dataset = {
    meta,
    coverage_by_level: coverageByLevel,
    books: allBooks,
  };
  const json = JSON.stringify(dataset, null, 2);
  fs.writeFileSync(tmpPath, json, 'utf8');
  JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
  fs.renameSync(tmpPath, filePath);
}

// ── Level Coverage ─────────────────────────────────────────────────────────

function analyzeLevelCoverage(books, allLevelWords) {
  const wordMap = new Map();
  for (const w of allLevelWords) wordMap.set(w.hanzi, { ...w, covered: false });

  for (const book of books) {
    if (book.error) continue;
    for (const u of (book.word_usage || [])) {
      const entry = wordMap.get(u.hanzi);
      if (entry) entry.covered = true;
    }
  }

  const uncovered = [...wordMap.values()].filter((e) => !e.covered);
  const covered = wordMap.size - uncovered.length;
  return {
    total: wordMap.size,
    covered,
    uncovered: uncovered.map((u) => ({ hanzi: u.hanzi, pinyin: u.pinyin, meaning: u.meaning, level: u.level, pos: u.pos })),
    ratio: wordMap.size > 0 ? covered / wordMap.size : 0,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'full';
  const forceModel = args[1] || null;
  const levelFilter = args.find((a) => a.startsWith('--level='))?.split('=')[1] || null;
  const genreFilter = args.find((a) => a.startsWith('--genre='))?.split('=')[1] || null;
  const targetLevels = levelFilter ? levelFilter.split(',').map(Number).filter((n) => n >= 1 && n <= 9) : null;
  const targetGenres = genreFilter ? genreFilter.split(',') : null;

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  OpenHSK Book Dataset Builder v1         ║');
  console.log('║  Genre-based continuous stories          ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Mode: ${mode}`);

  // Load HSK data
  logSection('Loading HSK Vocabulary');
  const allEntries = loadHskEntries();
  const allWords = extractWords(allEntries);
  console.log(`  ${allWords.length} total HSK words loaded`);

  const wordsByLevel = {};
  for (const w of allWords) {
    if (!wordsByLevel[w.level]) wordsByLevel[w.level] = [];
    wordsByLevel[w.level].push(w);
  }

  const levels = Object.keys(wordsByLevel).map(Number).sort((a, b) => a - b);
  const activeLevels = targetLevels ? levels.filter((l) => targetLevels.includes(l)) : levels;
  const activeGenres = targetGenres ? GENRES.filter((g) => targetGenres.includes(g.id)) : GENRES;

  console.log(`  Levels: ${activeLevels.join(', ')}`);
  console.log(`  Genres: ${activeGenres.map((g) => g.labelEn).join(', ')}`);
  console.log(`  Total books to generate: ${activeLevels.length * activeGenres.length}`);

  fs.mkdirSync(QUALITY_DIR, { recursive: true });

  // Check API health
  logSection('API Health Check');
  const { embeddingOk } = await checkAllApis();
  const useEmbeddings = embeddingOk;
  if (!useEmbeddings) console.log('  Embedding API unavailable – using character+POS clustering fallback.');

  // Model selection
  let selectedModel = CHAT_MODELS.find((m) => m.name === 'gemma-4-31b');
  if (forceModel) {
    selectedModel = CHAT_MODELS.find((m) => m.name === forceModel);
    if (!selectedModel) { console.error(`Unknown model: ${forceModel}`); process.exit(1); }
  }
  console.log(`\n  Using model: ${selectedModel.name}`);

  // Load existing dataset
  logSection('Book Generation');
  let allBooks = [];
  const coverageByLevel = {};

  if (fs.existsSync(BOOKS_OUTPUT)) {
    try {
      const existing = JSON.parse(fs.readFileSync(BOOKS_OUTPUT, 'utf8'));
      if (existing.books?.length > 0) {
        allBooks = existing.books;
        for (const [lv, cov] of Object.entries(existing.coverage_by_level || {})) {
          coverageByLevel[Number(lv)] = cov;
        }
        console.log(`  Loaded existing: ${allBooks.length} books`);
      }
    } catch { /* start fresh */ }
  }

  // Save helper
  const saveDataset = (note = '') => {
    try {
      const levelsDone = Object.keys(coverageByLevel).map(Number);
      const coveredTotal = Object.values(coverageByLevel).reduce((s, c) => s + c.covered, 0);
      const totalWords = Object.values(coverageByLevel).reduce((s, c) => s + c.total, 0);
      const allGenres = [...new Set(allBooks.map((b) => b.genre))];
      const totalChapters = allBooks.reduce((s, b) => s + (b.total_chapters || 0), 0);

      const dataset = {
        meta: {
          generated_at: new Date().toISOString(),
          model: selectedModel.name,
          model_endpoint: selectedModel.url,
          total_books: allBooks.length,
          total_chapters: totalChapters,
          total_hsk_words: totalWords,
          words_covered: coveredTotal,
          overall_coverage: totalWords > 0 ? +(coveredTotal / totalWords).toFixed(4) : 0,
          levels: levelsDone,
          genres: allGenres,
          notes: note || (levelsDone.length < levels.length ? 'Partial dataset' : 'Full HSK book dataset'),
        },
        coverage_by_level: coverageByLevel,
        books: allBooks,
      };
      fs.writeFileSync(BOOKS_OUTPUT, JSON.stringify(dataset, null, 2), 'utf8');
      const mb = (fs.statSync(BOOKS_OUTPUT).size / 1024 / 1024).toFixed(1);
      console.log(`    💾 Saved: ${allBooks.length} books, ${totalChapters} chapters (${mb} MB)`);
    } catch (e) {
      console.error(`    ⚠ Save failed: ${e.message}`);
    }
  };

  // Generate books
  const startTime = Date.now();

  for (const lv of activeLevels) {
    const levelWords = wordsByLevel[lv];
    console.log(`\n━━━ HSK Level ${lv} (${levelWords.length} words) ━━━`);

    // Get already covered words for this level
    const coveredHanzi = new Set();
    for (const book of allBooks) {
      if (book.hsk_level === lv && book.word_usage) {
        for (const u of book.word_usage) {
          if (u.hanzi) coveredHanzi.add(u.hanzi);
        }
      }
    }

    // Get genres already done for this level
    const existingGenres = new Set(allBooks.filter((b) => b.hsk_level === lv && !b.error).map((b) => b.genre));
    const pendingGenres = activeGenres.filter((g) => !existingGenres.has(g.id));

    if (pendingGenres.length === 0 && coveredHanzi.size >= levelWords.length) {
      console.log(`  All genres complete and 100% coverage — skipping`);
      coverageByLevel[lv] = { total: levelWords.length, covered: levelWords.length, uncovered: [], ratio: 1 };
      continue;
    }

    for (const genre of pendingGenres) {
      console.log(`\n  📚 ${genre.icon} ${genre.labelEn} (${genre.labelZh})`);

      // Generate the book with per-chapter save callback
      const pendingBook = {
        book_id: `hsk${lv}-${genre.id}`,
        hsk_level: lv,
        genre: genre.id,
        genre_label_chinese: genre.labelZh,
        genre_label_english: genre.labelEn,
        title_chinese: `${genre.labelZh}故事`,
        title_english: `${genre.labelEn} Story`,
        description_chinese: '',
        description_english: '',
        target_words: levelWords.map((w) => w.hanzi),
        word_count: levelWords.length,
        coverage: 0,
        missing_words: [],
        total_chapters: 0,
        chapters: [],
        word_usage: [],
        char_count: 0,
      };
      allBooks.push(pendingBook);
      const bookIndex = allBooks.length - 1;

      const bookResult = await generateBook(selectedModel, lv, levelWords, genre, useEmbeddings,
        async (progress) => {
          // Update pending book with current progress
          const b = allBooks[bookIndex];
          b.chapters = progress.chapters;
          b.word_usage = progress.word_usage;
          b.total_chapters = progress.totalChapters;
          b.char_count = progress.chapters.reduce((s, ch) => s + ch.sentences.reduce((cs, sen) => cs + sen.chinese.length, 0), 0);

          // Calculate partial coverage
          const usedH = new Set(progress.word_usage.map((u) => u.hanzi).filter(Boolean));
          const totalH = new Set(levelWords.map((w) => w.hanzi));
          const missingH = [...totalH].filter((h) => !usedH.has(h));
          b.coverage = totalH.size > 0 ? usedH.size / totalH.size : 0;
          b.missing_words = missingH;

          // Update level coverage
          const nowCovered = new Set(coveredHanzi);
          for (const h of usedH) nowCovered.add(h);
          coverageByLevel[lv] = {
            total: levelWords.length,
            covered: nowCovered.size,
            uncovered: levelWords.filter((w) => !nowCovered.has(w.hanzi)).map((w) => ({
              hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, level: w.level, pos: w.pos,
            })),
            ratio: nowCovered.size / levelWords.length,
          };

          saveDataset(`Ch ${progress.chapterIndex + 1}/${progress.totalChapters}`);
        }
      );

      // Update book with final results
      const b = allBooks[bookIndex];
      b.chapters = bookResult.chapters;
      b.word_usage = bookResult.word_usage;
      b.total_chapters = bookResult.total_chapters;
      b.char_count = bookResult.char_count;
      b.coverage = bookResult.coverage;
      b.missing_words = bookResult.missing_words;

      // Generate title
      console.log(`     Generating title...`);
      const titleInfo = await generateBookTitle(selectedModel, lv, genre, bookResult.word_usage, bookResult.chapters);
      b.title_chinese = titleInfo.title_chinese;
      b.title_english = titleInfo.title_english;
      b.description_chinese = titleInfo.description_chinese;
      b.description_english = titleInfo.description_english;
      await sleep(API_DELAY_MS);

      // Update final level coverage
      const newlyCovered = new Set(bookResult.word_usage.map((u) => u.hanzi).filter(Boolean));
      const nowCovered = new Set(coveredHanzi);
      for (const h of newlyCovered) nowCovered.add(h);
      coverageByLevel[lv] = {
        total: levelWords.length,
        covered: nowCovered.size,
        uncovered: levelWords.filter((w) => !nowCovered.has(w.hanzi)).map((w) => ({
          hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, level: w.level, pos: w.pos,
        })),
        ratio: nowCovered.size / levelWords.length,
      };

      console.log(`     📖 "${titleInfo.title_chinese}" — ${(bookResult.coverage * 100).toFixed(1)}% coverage`);
      saveDataset();
    }
  }

  // Final summary
  const finalCovered = Object.values(coverageByLevel).reduce((s, c) => s + c.covered, 0);
  const finalTotal = Object.values(coverageByLevel).reduce((s, c) => s + c.total, 0);
  const totalElapsed = Math.round((Date.now() - startTime) / 1000);

  logSection('Generation Complete');
  console.log(`  Books: ${allBooks.length} | Words: ${finalCovered}/${finalTotal} (${(finalCovered/finalTotal*100).toFixed(1)}%)`);
  console.log(`  Levels: ${Object.keys(coverageByLevel).join(', ')} | Time: ${Math.floor(totalElapsed/60)}m ${totalElapsed%60}s`);
  console.log(`  Output: ${BOOKS_OUTPUT}`);
}

try {
  await main();
} catch (error) {
  console.error('\nFatal error:', error);
  process.exitCode = 1;
}
