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
const STORIES_OUTPUT = path.join(QUALITY_DIR, 'hsk-stories.v1.json');
const TEST_OUTPUT = path.join(QUALITY_DIR, 'hsk-stories-model-test.json');

const EMBEDDING_API = process.env.OPENHSK_EMBEDDING_API || 'http://10.10.11.7:11535/v1/embeddings';
const EMBEDDING_MODEL = process.env.OPENHSK_EMBEDDING_MODEL || 'BAAI/bge-m3';
const EMBEDDING_BATCH = 40;

const CHAT_MODELS = [
  { name: 'gpt-oss-120b', url: process.env.OPENHSK_CHAT_API_1 || 'http://10.10.11.7:11541/v1/chat/completions', model: 'openai-mirror/gpt-oss-120b', key: process.env.OPENHSK_API_KEY || 'vllm', maxTokens: 131072 },
  { name: 'gemma-4-31b', url: process.env.OPENHSK_CHAT_API_2 || 'http://10.10.11.7:11542/v1/chat/completions', model: 'google/gemma-4-31B-it', key: process.env.OPENHSK_API_KEY || 'vllm', maxTokens: 138240 },
];

const RERANK_API = process.env.OPENHSK_RERANK_API || 'http://10.10.11.7:11534/v1/rerank';
const RERANK_MODEL = process.env.OPENHSK_RERANK_MODEL || 'BAAI/bge-reranker-v2-m3';

// Target stories per level for full coverage
const TARGET_STORIES_PER_LEVEL = {
  1: 15, 2: 18, 3: 20, 4: 20, 5: 25, 6: 28, 7: 90,
};

const MAX_WORDS_PER_STORY = 52;
const MIN_WORDS_PER_STORY = 15;
const CONCURRENCY = 2;
const API_DELAY_MS = 2500;
const TEST_STORIES_PER_MODEL = 3;
const MAX_RETRIES = 2;

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
  const timeout = setTimeout(() => ctrl.abort(), 600000); // 10 min timeout for large stories
  try {
    const body = {
      model: modelConfig.model,
      messages,
      temperature: opts.temperature ?? 0.72,
      max_tokens: opts.max_tokens ?? 8192,
    };
    const data = await fetchJson(modelConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${modelConfig.key}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const content = data.choices?.[0]?.message?.content;
    // vllm sometimes returns content as a pre-parsed object instead of a string
    if (content == null) return null;
    if (typeof content === 'object') return JSON.stringify(content);
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

async function rerankScores(query, documents) {
  const body = { model: RERANK_MODEL, query, documents, top_n: documents.length };
  try {
    const data = await fetchJson(RERANK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const resultMap = new Map();
    for (const r of (data.results || [])) {
      resultMap.set(r.index, r.relevance_score);
    }
    return documents.map((_, i) => resultMap.get(i) ?? 0);
  } catch {
    return documents.map(() => 0.5);
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
  } catch {
    return false;
  }
}

async function checkAllApis() {
  console.log('  Checking API endpoints...');
  // Build models-list URLs by extracting the base from the API paths
  const embBase = EMBEDDING_API.replace('/embeddings', '') + '/models';
  const chatBases = CHAT_MODELS.map((m) => m.url.replace('/chat/completions', '') + '/models');

  const results = await Promise.all([
    checkApiHealth(embBase, '').then((ok) => ({ name: 'embedding (bge-m3)', ok })),
    ...CHAT_MODELS.map((m, i) =>
      checkApiHealth(chatBases[i], m.key).then((ok) => ({ name: `chat (${m.name})`, ok }))
    ),
  ]);
  for (const r of results) {
    console.log(`    ${r.ok ? '✓' : '✗'} ${r.name}`);
  }
  const embeddingOk = results[0].ok;
  const chatOk = results.slice(1).some((r) => r.ok);
  if (!chatOk) throw new Error('No chat API reachable. Check your network/VPN connection or OPENHSK_CHAT_API_1 / OPENHSK_CHAT_API_2 environment variables.');
  return { embeddingOk };
}

// ── Thematic Clustering ────────────────────────────────────────────────────

/**
 * Fallback clustering using character overlap and part-of-speech similarity.
 * Groups words that share common characters or belong to the same POS family.
 */
function clusterWordsByCharacters(words, numClusters) {
  console.log(`  Using character+POS-based clustering for ${words.length} words into ${numClusters} groups...`);

  // Build character index
  const charToWords = new Map();
  for (const w of words) {
    for (const ch of w.hanzi) {
      if (!charToWords.has(ch)) charToWords.set(ch, []);
      charToWords.get(ch).push(w);
    }
  }

  // Score word similarity based on shared characters and POS overlap
  const similarity = (a, b) => {
    let score = 0;
    const aChars = new Set(a.hanzi);
    for (const ch of b.hanzi) {
      if (aChars.has(ch)) score += 3;
    }
    const aPOS = new Set(a.pos);
    for (const p of b.pos) {
      if (aPOS.has(p)) score += 4;
    }
    // Boost for words starting with same character
    if (a.hanzi[0] === b.hanzi[0]) score += 5;
    return score;
  };

  // Greedy clustering
  const remaining = [...words];
  const clusters = [];

  // Seed clusters with distinct "anchor" words
  const anchors = [];
  const usedAsAnchor = new Set();
  for (const w of remaining) {
    if (anchors.length >= numClusters) break;
    if (!usedAsAnchor.has(w.entry_id)) {
      anchors.push(w);
      usedAsAnchor.add(w.entry_id);
    }
  }
  while (anchors.length < numClusters) {
    const r = remaining[Math.floor(Math.random() * remaining.length)];
    if (!usedAsAnchor.has(r.entry_id)) {
      anchors.push(r);
      usedAsAnchor.add(r.entry_id);
    }
  }

  for (const anchor of anchors) {
    clusters.push([anchor]);
  }
  const assigned = new Set(anchors.map((a) => a.entry_id));

  // Assign remaining words to best cluster
  for (const w of remaining) {
    if (assigned.has(w.entry_id)) continue;
    let best = 0, bestScore = -1;
    for (let k = 0; k < clusters.length; k++) {
      let totalSim = 0;
      const sample = clusters[k].slice(0, 6);
      for (const cw of sample) {
        totalSim += similarity(w, cw);
      }
      const avgSim = totalSim / sample.length;
      if (avgSim > bestScore) { bestScore = avgSim; best = k; }
    }
    clusters[best].push(w);
    assigned.add(w.entry_id);
  }

  for (const c of clusters) {
    c.theme = extractClusterTheme(c);
  }

  return clusters.filter((c) => c.length > 0);
}

/**
 * Embedding-based k-means++ clustering (requires bge-m3 API).
 */
async function clusterWordsByEmbedding(words, numClusters) {
  console.log(`  Embedding ${words.length} words via bge-m3 for thematic clustering...`);

  const embeddingMap = new Map();
  for (let i = 0; i < words.length; i += EMBEDDING_BATCH) {
    const batch = words.slice(i, i + EMBEDDING_BATCH);
    const texts = batch.map((w) => `[${w.hanzi}] ${w.meaning}`);
    const embs = await getEmbeddings(texts);
    for (let j = 0; j < batch.length; j++) {
      embeddingMap.set(batch[j].entry_id, { word: batch[j], emb: embs[j] });
    }
    process.stdout.write(`\r    Embedded ${Math.min(i + EMBEDDING_BATCH, words.length)}/${words.length}`);
    await sleep(150);
  }
  console.log('');

  const items = [...embeddingMap.values()];

  // K-means++ initialization
  const centroids = [];
  centroids.push(items[Math.floor(Math.random() * items.length)].emb);

  for (let k = 1; k < numClusters; k++) {
    const distances = items.map((item) => {
      let minDist = Infinity;
      for (const c of centroids) {
        const d = 1 - cosineSim(item.emb, c);
        if (d < minDist) minDist = d;
      }
      return minDist;
    });
    const totalDist = distances.reduce((s, d) => s + d, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < items.length; i++) {
      r -= distances[i];
      if (r <= 0) { centroids.push(items[i].emb); break; }
    }
    if (centroids.length <= k) centroids.push(items[items.length - 1].emb);
  }

  let assignments = new Array(items.length).fill(0);
  for (let iter = 0; iter < 15; iter++) {
    let changed = false;
    for (let i = 0; i < items.length; i++) {
      let best = 0, bestDist = -Infinity;
      for (let k = 0; k < centroids.length; k++) {
        const sim = cosineSim(items[i].emb, centroids[k]);
        if (sim > bestDist) { bestDist = sim; best = k; }
      }
      if (assignments[i] !== best) { changed = true; assignments[i] = best; }
    }
    const sums = Array.from({ length: numClusters }, () => new Array(centroids[0].length).fill(0));
    const counts = new Array(numClusters).fill(0);
    for (let i = 0; i < items.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let j = 0; j < items[i].emb.length; j++) sums[c][j] += items[i].emb[j];
    }
    for (let k = 0; k < numClusters; k++) {
      if (counts[k] > 0) {
        for (let j = 0; j < centroids[k].length; j++) centroids[k][j] = sums[k][j] / counts[k];
      }
    }
    if (!changed) break;
  }

  const clusters = [];
  for (let k = 0; k < numClusters; k++) clusters.push([]);
  for (let i = 0; i < items.length; i++) clusters[assignments[i]].push(items[i].word);
  for (const cluster of clusters) cluster.theme = extractClusterTheme(cluster);

  return clusters.filter((c) => c.length > 0);
}

async function clusterWordsThematically(words, numClusters, useEmbeddings) {
  if (useEmbeddings) {
    try {
      return await clusterWordsByEmbedding(words, numClusters);
    } catch (e) {
      console.warn(`  Embedding API failed: ${e.message}`);
      console.warn('  Falling back to character+POS-based clustering...');
    }
  }
  return clusterWordsByCharacters(words, numClusters);
}

function extractClusterTheme(words) {
  const allMeanings = words.map((w) => w.meaning.toLowerCase()).join(' ');
  const keywords = allMeanings.split(/[\s,;()/]+/).filter((w) => w.length > 3);

  const freq = new Map();
  for (const kw of keywords) {
    freq.set(kw, (freq.get(kw) || 0) + 1);
  }

  const stopWords = new Set(['with', 'from', 'that', 'this', 'have', 'been', 'they', 'will', 'which', 'about', 'their', 'there', 'used', 'also', 'some']);
  const sorted = [...freq.entries()]
    .filter(([k]) => !stopWords.has(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return sorted.map(([k]) => k).join(', ') || 'general';
}

// ── Prompt Engineering ─────────────────────────────────────────────────────

function buildVocabTable(words) {
  return words
    .map((w, i) => `${i + 1}. **${w.hanzi}** (${w.pinyin}) — ${w.meaning}`)
    .join('\n');
}

function buildSystemPrompt(level, wordCount, clusterTheme) {
  const storyLength = Math.max(400, Math.min(2500, wordCount * 35));
  const isAdvanced = level >= 5;

  return `You are a master storyteller and Chinese language educator. Your task is to write an engaging, narratively rich short story in Simplified Chinese that naturally incorporates ALL of the target HSK vocabulary words.

## YOUR MISSION
Write a ${isAdvanced ? 'sophisticated' : 'simple yet charming'} story where every target word appears naturally in the narrative flow. The story must feel like authentic literature — not a textbook exercise.

## STORY PARAMETERS
- HSK Level: ${level}
- Target length: ~${storyLength} Chinese characters
- Theme direction: ${clusterTheme}
- Tone: ${level <= 2 ? 'warm, simple, everyday life' : level <= 4 ? 'engaging, slightly more complex, real-world scenarios' : 'nuanced, culturally rich, intellectually stimulating'}

## CRITICAL RULES
1. **Use EVERY target word at least once** — this is non-negotiable
2. Words must appear in natural, meaning-revealing contexts
3. The story must have: clear beginning → conflict/tension → resolution
4. Characters should have names and personalities
5. Include dialogue where appropriate
6. Each sentence should be on its own line in the output
7. **story_pinyin**: Accurate pinyin per sentence with TONE NUMBERS (1-4), matching Chinese lines 1:1
8. **story_english**: Natural English translation per sentence, matching Chinese lines 1:1

## OUTPUT FORMAT — Strict JSON only, no markdown wrappers
{
  "title_chinese": "story title in Chinese",
  "title_english": "English title",
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
}

The word_usage array MUST include EVERY target word. After writing, double-check your word_usage list against the target word list.`;
}

function buildUserPrompt(words, level, clusterTheme) {
  const wordList = buildVocabTable(words);
  const hanziList = words.map((w) => w.hanzi).join('、');
  const total = words.length;

  return `## HSK Level ${level} — Theme: ${clusterTheme}
## Target Vocabulary (${total} words — ALL must be used in the story):

${wordList}

---
## VERIFICATION CHECKLIST
Before outputting, verify: ${hanziList}

Write your story now. Every one of these ${total} words MUST appear in the narrative.`;
}

function buildFollowUpPrompt(missingWords) {
  const wordList = missingWords
    .map((w) => `${w.hanzi} (${w.pinyin}): ${w.meaning}`)
    .join('\n');

  return `Excellent story! However, these vocabulary words were NOT used in your story:

${wordList}

Please add 1-3 additional sentences or a short paragraph to the END of your story that naturally incorporates ALL of these missing words. Return the same JSON structure but with the updated story_chinese, story_pinyin, story_english, and word_usage (now including the new words).

Return ONLY the complete updated JSON.`;
}

// ── Response Parsing ───────────────────────────────────────────────────────

function extractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  // Strategy 1: Try markdown code fence (json or plain)
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    const inner = fenceMatch[1].trim();
    if (inner.startsWith('{')) {
      try { JSON.parse(inner); return inner; } catch { /* continue */ }
    }
  }

  // Strategy 2: Find JSON by balancing braces (robust to extra text around it)
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;
  
  let depth = 0, inString = false, escaped = false;
  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) { const candidate = text.slice(firstBrace, i + 1); try { JSON.parse(candidate); return candidate; } catch { continue; } } }
  }
  
  // Strategy 3: Try the entire text as JSON (after stripping markdown fences)
  let stripped = text.trim();
  stripped = stripped.replace(/^```(?:json)?\s*\n?|\n?\s*```$/g, '');
  try { JSON.parse(stripped); return stripped; } catch { /* continue */ }
  
  return null;
}

function parseStoryJson(response, targetWords) {
  const jsonStr = extractJsonFromText(response);

  if (!jsonStr) {
    return { error: 'JSON extraction failed', raw: response.slice(0, 500), coverage: 0,
      missing_words: targetWords.map((w) => w.hanzi) };
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { error: 'JSON parse failed', raw: response.slice(0, 500), coverage: 0,
      missing_words: targetWords.map((w) => w.hanzi) };
  }

  const cnLines = (parsed.story_chinese || '').split('\n').filter((l) => l.trim());
  const pyLines = (parsed.story_pinyin || '').split('\n').filter((l) => l.trim());
  const enLines = (parsed.story_english || '').split('\n').filter((l) => l.trim());

  const sentences = [];
  const max = Math.max(cnLines.length, pyLines.length, enLines.length);
  for (let i = 0; i < max; i++) {
    sentences.push({
      chinese: cnLines[i] || '',
      pinyin: pyLines[i] || '',
      english: enLines[i] || '',
    });
  }

  // Calculate coverage
  const usedHanzi = new Set();
  const wordUsage = (parsed.word_usage || []).map((u) => {
    const h = u.hanzi || u.word || '';
    usedHanzi.add(h);
    return {
      hanzi: h,
      pinyin: u.pinyin || '',
      sentence: u.sentence || '',
      context_meaning: u.context_meaning || '',
    };
  });

  const targetHanzi = new Set(targetWords.map((w) => w.hanzi));
  const missing = [...targetHanzi].filter((h) => !usedHanzi.has(h));
  const coverage = targetHanzi.size > 0 ? usedHanzi.size / targetHanzi.size : 0;

  return {
    title_chinese: parsed.title_chinese || '',
    title_english: parsed.title_english || '',
    story_chinese: parsed.story_chinese || '',
    story_chinese_sentences: cnLines,
    story_pinyin: parsed.story_pinyin || '',
    story_pinyin_sentences: pyLines,
    story_english: parsed.story_english || '',
    story_english_sentences: enLines,
    sentences,
    word_usage: wordUsage,
    coverage,
    missing_words: missing,
    char_count: (parsed.story_chinese || '').replace(/\s/g, '').length,
  };
}

// ── Story Generation (with retry for missing words) ─────────────────────────

async function generateOneStory(modelConfig, words, level, clusterTheme, storyIndex, totalStories) {
  const prefix = `  [${storyIndex + 1}/${totalStories}]`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const messages = [
        { role: 'system', content: buildSystemPrompt(level, words.length, clusterTheme) },
        { role: 'user', content: buildUserPrompt(words, level, clusterTheme) },
      ];

      const response = await chatCompletion(modelConfig, messages, {
        temperature: 0.72,
        max_tokens: Math.min(modelConfig.maxTokens, Math.max(4096, words.length * 300)),
      });

      let result = parseStoryJson(response, words);
      if (result.error) {
        const debugFile = `${STORIES_OUTPUT}.debug-fail-l${level}-s${storyIndex+1}.txt`;
        fs.writeFileSync(debugFile, `--- ATTEMPT ${attempt + 1} ---\n` + response, 'utf8');
        console.log(`${prefix} JSON parse error (attempt ${attempt + 1}), saved raw to ${path.basename(debugFile)}`);
        await sleep(API_DELAY_MS);
        continue;
      }

      // If missing words, try a follow-up
      if (result.missing_words.length > 0 && attempt < MAX_RETRIES) {
        console.log(`${prefix} ${result.missing_words.length} words missing, requesting additions...`);
        const missingData = result.missing_words.map((h) =>
          words.find((w) => w.hanzi === h) || { hanzi: h, pinyin: '', meaning: '' }
        );

        const followUpMessages = [
          { role: 'system', content: buildSystemPrompt(level, words.length, clusterTheme) },
          { role: 'user', content: buildUserPrompt(words, level, clusterTheme) },
          { role: 'assistant', content: response },
          { role: 'user', content: buildFollowUpPrompt(missingData) },
        ];

        const followUp = await chatCompletion(modelConfig, followUpMessages, {
          temperature: 0.65,
          max_tokens: Math.min(modelConfig.maxTokens, Math.max(4096, missingData.length * 200)),
        });

        result = parseStoryJson(followUp, words);
        if (result.error) continue;
      }

      return { ...result, attempt: attempt + 1 };
    } catch (e) {
      const delay = API_DELAY_MS * (2 + attempt * 3); // progressive backoff
      console.error(`${prefix} Error (attempt ${attempt + 1}), waiting ${delay/1000}s:`, e.message);
      if (attempt < MAX_RETRIES) await sleep(delay);
    }
  }

  return {
    title_chinese: `Story ${storyIndex + 1}`,
    title_english: '',
    story_chinese: '',
    story_chinese_sentences: [],
    story_pinyin: '',
    story_pinyin_sentences: [],
    story_english: '',
    story_english_sentences: [],
    sentences: [],
    word_usage: [],
    coverage: 0,
    missing_words: words.map((w) => w.hanzi),
    error: 'Failed after max retries',
  };
}

// ── Level Coverage Analysis ─────────────────────────────────────────────────

function analyzeLevelCoverage(stories, allLevelWords) {
  const wordMap = new Map();
  for (const w of allLevelWords) {
    wordMap.set(w.hanzi, { ...w, story_ids: [], covered: false });
  }

  for (const story of stories) {
    if (story.error) continue;
    for (const u of (story.word_usage || [])) {
      const entry = wordMap.get(u.hanzi);
      if (entry) {
        entry.story_ids.push(story.story_id);
        entry.covered = true;
      }
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

// ── Model Testing ──────────────────────────────────────────────────────────

async function testModel(modelConfig, testWords, level, numStories, useEmbeddings) {
  console.log(`\n  Testing ${modelConfig.name}...`);

  const wordsPerStory = Math.min(MAX_WORDS_PER_STORY, Math.max(MIN_WORDS_PER_STORY,
    Math.ceil(testWords.length / numStories)));

  const clusters = await clusterWordsThematically(testWords, numStories, useEmbeddings);
  const flatClusters = clusters.map((c) => c.slice(0, wordsPerStory)).filter((c) => c.length >= 5);

  // Re-distribute remaining words
  const used = new Set(flatClusters.flat().map((w) => w.entry_id));
  const remaining = testWords.filter((w) => !used.has(w.entry_id));
  for (const w of remaining) {
    let bestCluster = 0, minCount = Infinity;
    for (let i = 0; i < flatClusters.length; i++) {
      if (flatClusters[i].length < minCount) {
        minCount = flatClusters[i].length; bestCluster = i;
      }
    }
    flatClusters[bestCluster].push(w);
  }

  console.log(`  ${flatClusters.length} story clusters, ~${wordsPerStory} words each`);

  const stories = [];
  for (let i = 0; i < Math.min(TEST_STORIES_PER_MODEL, flatClusters.length); i++) {
    const cluster = flatClusters[i];
    const theme = extractClusterTheme(cluster);
    console.log(`    Story ${i + 1}: ${cluster.length} words, theme: ${theme}`);

    const result = await generateOneStory(modelConfig, cluster, level, theme, i, flatClusters.length);
    stories.push({
      story_id: `test-${modelConfig.name}-l${level}-s${i + 1}`,
      hsk_level: level,
      target_words: cluster.map((w) => w.hanzi),
      word_count: cluster.length,
      cluster_theme: theme,
      ...result,
    });

    const { raw, error, word_usage, sentences, story_chinese_sentences, story_pinyin_sentences, story_english_sentences, ...log } = result;
    console.log(`      ✓ Coverage: ${(result.coverage * 100).toFixed(0)}%` +
      ` (${result.word_usage?.length || 0}/${cluster.length} words)` +
      ` | ${result.char_count} chars` +
      (result.missing_words?.length ? ` | Missing: ${result.missing_words.length}` : ''));
    await sleep(API_DELAY_MS);
  }

  const valid = stories.filter((s) => !s.error);
  const avgCov = valid.length > 0 ? valid.reduce((s, r) => s + (r.coverage || 0), 0) / valid.length : 0;

  return { model: modelConfig.name, avg_coverage: avgCov, stories, errors: stories.filter((s) => s.error).length };
}

// ── Atomic Dataset Writer ───────────────────────────────────────────────────

function writeDatasetSafe(filePath, meta, coverageByLevel, allStories) {
  const tmpPath = filePath + '.tmp';
  const dataset = {
    meta,
    coverage_by_level: coverageByLevel,
    stories: allStories.map((s) => {
      const { raw, ...rest } = s;
      return rest;
    }),
  };
  const json = JSON.stringify(dataset, null, 2);
  fs.writeFileSync(tmpPath, json, 'utf8');
  // Validate the written file parses back correctly
  JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
  // Atomic rename
  fs.renameSync(tmpPath, filePath);
}

// ── Build Dataset from Existing ─────────────────────────────────────────────

function buildCoverageFromStories(stories, allLevelWords) {
  return analyzeLevelCoverage(stories.filter((s) => !s.error), allLevelWords);
}

// ── Full Dataset Generation (streaming saves) ───────────────────────────────

async function generateStoriesForLevel(modelConfig, level, allLevelWords, useEmbeddings, opts = {}) {
  const { onStoryDone } = opts;
  const numStories = TARGET_STORIES_PER_LEVEL[level] || 20;
  const wordsPerStory = Math.min(MAX_WORDS_PER_STORY, Math.max(MIN_WORDS_PER_STORY,
    Math.ceil(allLevelWords.length / numStories)));

  console.log(`\n━━━ HSK Level ${level} ━━━`);
  console.log(`  ${allLevelWords.length} words → ~${numStories} stories × ~${wordsPerStory} words`);

  // Thematic clustering
  const clusters = await clusterWordsThematically(allLevelWords, numStories, useEmbeddings);
  console.log(`  Clustered into ${clusters.length} themes:`);
  for (let i = 0; i < Math.min(5, clusters.length); i++) {
    console.log(`    ${i + 1}. "${clusters[i].theme}" (${clusters[i].length} words)`);
  }
  if (clusters.length > 5) console.log(`    ... and ${clusters.length - 5} more`);

  // Balance clusters into stories
  const storyBatches = [];
  for (const cluster of clusters) {
    if (cluster.length <= wordsPerStory + 10) {
      storyBatches.push(cluster);
    } else {
      for (let i = 0; i < cluster.length; i += wordsPerStory) {
        const chunk = cluster.slice(i, i + wordsPerStory);
        if (chunk.length >= MIN_WORDS_PER_STORY) {
          chunk.theme = cluster.theme;
          storyBatches.push(chunk);
        } else {
          const last = storyBatches[storyBatches.length - 1];
          if (last) last.push(...chunk);
          else storyBatches.push(chunk);
        }
      }
    }
  }

  // Ensure all words are assigned
  const usedIds = new Set(storyBatches.flat().map((w) => w.entry_id));
  const uncovered = allLevelWords.filter((w) => !usedIds.has(w.entry_id));
  if (uncovered.length > 0) {
    console.log(`  Distributing ${uncovered.length} uncovered words into existing batches...`);
    for (const w of uncovered) {
      let bestIdx = 0, minCount = Infinity;
      for (let i = 0; i < storyBatches.length; i++) {
        if (storyBatches[i].length < minCount) {
          minCount = storyBatches[i].length; bestIdx = i;
        }
      }
      storyBatches[bestIdx].push(w);
    }
  }

  const totalBatches = storyBatches.length;
  console.log(`  ${totalBatches} story batches ready`);

  // Generate stories one at a time, with streaming save callbacks
  const stories = [];
  const failedWords = []; // Collect words from failed stories for catch-all story

  const levelStart = Date.now();
  for (let i = 0; i < totalBatches; i++) {
    const batch = storyBatches[i];
    const theme = batch.theme || extractClusterTheme(batch);
    const elapsed = Math.round((Date.now() - levelStart) / 1000);
    const remaining = totalBatches - i - 1;
    const avgTime = i > 0 ? elapsed / i : 0;
    const eta = remaining > 0 ? Math.round(avgTime * remaining) : 0;

    process.stdout.write(`\r  [${i + 1}/${totalBatches}] "${theme}" (${batch.length}w) | elapsed: ${elapsed}s | ETA: ${eta}s `.padEnd(90));
    if (onStoryDone) {
      console.log('');
    }

    const result = await generateOneStory(modelConfig, batch, level, theme, i, totalBatches);

    const storyEntry = {
      story_id: `hsk${level}-s${String(i + 1).padStart(3, '0')}`,
      hsk_level: level,
      target_words: batch.map((w) => w.hanzi),
      word_count: batch.length,
      cluster_theme: theme,
      ...result,
    };

    if (result.coverage === 0 && result.error) {
      // Story failed - track words for catch-all
      failedWords.push(...batch);
    }

    stories.push(storyEntry);

    // Streaming callback
    if (onStoryDone) {
      await onStoryDone(storyEntry, i + 1, totalBatches, level);
    }

    // Live status line
    const covStr = result.coverage > 0
      ? `${(result.coverage * 100).toFixed(0)}%`
      : 'FAIL';
    console.log(`    ✓ ${covStr}`.padEnd(10) +
      `${result.char_count || result.story_chinese?.length || 0}c`.padEnd(10) +
      (result.coverage < 1 && result.missing_words?.length ? `missing:${result.missing_words.length}` : ''));

    await sleep(API_DELAY_MS);
  }

  // Catch-all story for failed words
  if (failedWords.length > 0) {
    console.log(`\n  ⟳ Catch-all story for ${failedWords.length} failed words...`);
    // Split if too many
    const catchBatches = [];
    for (let i = 0; i < failedWords.length; i += wordsPerStory) {
      catchBatches.push(failedWords.slice(i, i + wordsPerStory));
    }

    for (let ci = 0; ci < catchBatches.length; ci++) {
      const cb = catchBatches[ci];
      // Remove duplicates
      const unique = [];
      const seen = new Set();
      for (const w of cb) {
        if (!seen.has(w.hanzi)) { seen.add(w.hanzi); unique.push(w); }
      }

      const catchStory = await generateOneStory(modelConfig, unique, level, 'catch-all', totalBatches + ci, totalBatches + catchBatches.length);
      const catchEntry = {
        story_id: `hsk${level}-s${String(totalBatches + ci + 1).padStart(3, '0')}`,
        hsk_level: level,
        target_words: unique.map((w) => w.hanzi),
        word_count: unique.length,
        cluster_theme: 'catch-all (failed words retry)',
        ...catchStory,
      };
      stories.push(catchEntry);

      if (onStoryDone) {
        await onStoryDone(catchEntry, totalBatches + ci + 1, totalBatches + catchBatches.length, level);
      }

      console.log(`    ✓ Catch-all: ${(catchStory.coverage * 100).toFixed(0)}% ${catchStory.char_count || catchStory.story_chinese?.length || 0}c`);
      await sleep(API_DELAY_MS);
    }
  }

  const totalTime = Math.round((Date.now() - levelStart) / 1000);
  console.log(`\n  Level ${level} complete in ${totalTime}s (${stories.length} stories)`);

  return stories;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'full';
  const forceModel = args[1] || null;
  const levelFilter = args.find((a) => a.startsWith('--level='))?.split('=')[1] || null;
  const targetLevels = levelFilter ? levelFilter.split(',').map(Number).filter((n) => n >= 1 && n <= 9) : null;

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  OpenHSK Story Dataset Builder v2        ║');
  console.log('║  Thematic clustering + full coverage     ║');
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
  const activeLevels = targetLevels
    ? levels.filter((l) => targetLevels.includes(l))
    : levels;

  if (targetLevels) {
    console.log(`  Target levels: ${activeLevels.join(', ')}`);
  }

  fs.mkdirSync(QUALITY_DIR, { recursive: true });

  // Check API health
  logSection('API Health Check');
  const { embeddingOk } = await checkAllApis();
  const useEmbeddings = embeddingOk;
  if (!useEmbeddings) {
    console.log('  Embedding API unavailable – using character+POS clustering fallback.');
  }

  // Model selection
  let selectedModel = null;

  if (mode === 'test' || (mode === 'full' && !forceModel)) {
    logSection('Phase 1: Model Comparison');

    const testLevel = levels[0]; // HSK 1
    const testWords = wordsByLevel[testLevel];
    const testStories = TARGET_STORIES_PER_LEVEL[testLevel] || 15;

    console.log(`  Testing on HSK ${testLevel} (${testWords.length} words, ${testStories} stories)`);

    const results = [];
    for (const mc of CHAT_MODELS) {
      results.push(await testModel(mc, testWords, testLevel, testStories, useEmbeddings));
    }

    console.log(`\n  ${'Model'.padEnd(20)} ${'Coverage'.padEnd(12)} ${'Errors'}`);
    console.log('  ' + '─'.repeat(46));
    for (const r of results) {
      console.log(`  ${r.model.padEnd(20)} ${(r.avg_coverage * 100).toFixed(1)}%`.padEnd(16) + `${r.errors}`);
    }

    fs.writeFileSync(TEST_OUTPUT, JSON.stringify({
      meta: { generated_at: new Date().toISOString(), test_level: testLevel, test_words: testWords.length },
      results: results.map((r) => ({
        model: r.model,
        avg_coverage: r.avg_coverage,
        errors: r.errors,
        stories: r.stories.map((s) => {
          const { raw, ...rest } = s;
          return rest;
        }),
      })),
    }, null, 2), 'utf8');

    const best = results.reduce((a, b) => b.avg_coverage > a.avg_coverage ? b : a);
    selectedModel = CHAT_MODELS.find((m) => m.name === best.model);
    console.log(`\n  ✓ Best model: ${best.model} (${(best.avg_coverage * 100).toFixed(1)}% coverage)`);

    if (mode === 'test') {
      console.log(`\n  Results saved to: ${TEST_OUTPUT}`);
      console.log('  Run without "test" argument to generate full dataset.');
      return;
    }
  }

  if (forceModel) {
    selectedModel = CHAT_MODELS.find((m) => m.name === forceModel);
    if (!selectedModel) {
      console.error(`Unknown model: ${forceModel}. Options: ${CHAT_MODELS.map((m) => m.name).join(', ')}`);
      process.exit(1);
    }
    console.log(`\n  Using forced model: ${selectedModel.name}`);
  }
  if (!selectedModel) {
    // Default to first model
    selectedModel = CHAT_MODELS[0];
    console.log(`\n  Using default model: ${selectedModel.name}`);
  }

  // Full generation with incremental saves and live progress
  logSection(`Phase 2: Full Generation (${selectedModel.name})`);

  // Load existing dataset if present (for resuming)
  let allStories = [];
  const coverageByLevel = {};
  const levelStoryCount = {}; // track how many stories per level exist

  if (fs.existsSync(STORIES_OUTPUT)) {
    try {
      const existing = JSON.parse(fs.readFileSync(STORIES_OUTPUT, 'utf8'));
      if (existing.stories?.length > 0) {
        // Only keep stories without errors
        allStories = existing.stories.filter((s) => !s.error && s.coverage > 0);
        for (const [lv, cov] of Object.entries(existing.coverage_by_level || {})) {
          coverageByLevel[Number(lv)] = cov;
        }
        // Count stories per level
        for (const s of allStories) {
          const lv = s.hsk_level;
          levelStoryCount[lv] = (levelStoryCount[lv] || 0) + 1;
        }
        console.log(`  Loaded existing: ${allStories.length} stories for levels ${Object.keys(coverageByLevel).join(', ')}`);
      }
    } catch { /* start fresh */ }
  }

  // Filter to pending levels
  const pendingLevels = activeLevels.filter((lv) => {
    const cov = coverageByLevel[lv];
    if (cov && cov.covered >= cov.total) {
      console.log(`  Skipping HSK ${lv} — already at 100% coverage`);
      return false;
    }
    return true;
  });

  if (pendingLevels.length === 0) {
    console.log('  All target levels already complete.');
    return;
  }

  // Helper to save dataset (called after each story)
  const saveDataset = (note = '') => {
    try {
      const levelsDone = Object.keys(coverageByLevel).map(Number);
      const coveredTotal = Object.values(coverageByLevel).reduce((s, c) => s + c.covered, 0);
      const totalWords = Object.values(coverageByLevel).reduce((s, c) => s + c.total, 0);

      const dataset = {
        meta: {
          generated_at: new Date().toISOString(),
          model: selectedModel.name,
          total_stories: allStories.length,
          total_hsk_words: totalWords,
          words_covered: coveredTotal,
          overall_coverage: totalWords > 0 ? +(coveredTotal / totalWords).toFixed(4) : 0,
          levels: levelsDone,
          note: note || (levelsDone.length < levels.length ? 'Partial dataset' : 'Full HSK story dataset'),
        },
        coverage_by_level: coverageByLevel,
        stories: allStories.map((s) => { const { raw, ...rest } = s; return rest; }),
      };
      fs.writeFileSync(STORIES_OUTPUT, JSON.stringify(dataset, null, 2), 'utf8');
      const mb = (fs.statSync(STORIES_OUTPUT).size / 1024 / 1024).toFixed(1);
      console.log(`    💾 Saved: ${allStories.length} stories (${mb} MB) | ${coveredTotal}/${totalWords} words (${(coveredTotal/totalWords*100).toFixed(0)}%)`);
    } catch (e) {
      console.error(`    ⚠ Save failed: ${e.message}`);
    }
  };

  // Generation loop — one story at a time with saves
  const startTime = Date.now();
  let totalStoriesGenerated = allStories.length;

  for (const lv of pendingLevels) {
    const levelWords = wordsByLevel[lv];
    const numStories = TARGET_STORIES_PER_LEVEL[lv] || 20;
    const wordsPerStory = Math.min(MAX_WORDS_PER_STORY, Math.max(MIN_WORDS_PER_STORY,
      Math.ceil(levelWords.length / numStories)));

    // Get already-covered words for this level from existing stories
    const coveredHanzi = new Set();
    for (const s of allStories) {
      if (s.hsk_level === lv && s.word_usage) {
        for (const u of s.word_usage) {
          if (u.hanzi) coveredHanzi.add(u.hanzi);
        }
      }
    }

    const uncoveredWords = levelWords.filter((w) => !coveredHanzi.has(w.hanzi));

    if (uncoveredWords.length === 0) {
      coverageByLevel[lv] = { total: levelWords.length, covered: levelWords.length, uncovered: [], ratio: 1 };
      console.log(`\n  ── HSK ${lv}: already 100% covered ──`);
      saveDataset();
      continue;
    }

    console.log(`\n━━━ HSK Level ${lv} ━━━`);
    console.log(`  ${levelWords.length} total words → ${coveredHanzi.size} already covered → ${uncoveredWords.length} remaining`);
    console.log(`  Generating ${Math.ceil(uncoveredWords.length / wordsPerStory)} stories (~${wordsPerStory} words each)`);

    // Cluster uncovered words
    const clusters = await clusterWordsThematically(uncoveredWords, Math.ceil(uncoveredWords.length / wordsPerStory), useEmbeddings);

    // Balance
    const storyClusters = [];
    for (const cluster of clusters) {
      if (cluster.length <= wordsPerStory + 8) {
        if (cluster.length >= 3) storyClusters.push(cluster);
      } else {
        for (let i = 0; i < cluster.length; i += wordsPerStory) {
          const chunk = cluster.slice(i, i + wordsPerStory);
          if (chunk.length >= 3) storyClusters.push(chunk);
        }
      }
    }

    // Distribute stragglers
    const usedInBatch = new Set(storyClusters.flat().map((w) => w.entry_id));
    const leftovers = uncoveredWords.filter((w) => !usedInBatch.has(w.entry_id));
    for (const w of leftovers) {
      let best = 0, minCount = Infinity;
      for (let i = 0; i < storyClusters.length; i++) {
        if (storyClusters[i].length < minCount) { minCount = storyClusters[i].length; best = i; }
      }
      storyClusters[best].push(w);
    }

    const levelStartTime = Date.now();
    const levelStoryBase = (levelStoryCount[lv] || 0);

    for (let si = 0; si < storyClusters.length; si++) {
      const cluster = storyClusters[si];
      const theme = cluster.theme || extractClusterTheme(cluster);
      const storyNum = levelStoryBase + si + 1;
      const totalForLevel = storyClusters.length;
      const elapsed = Math.round((Date.now() - levelStartTime) / 1000);
      const eta = si > 0 ? Math.round(elapsed / si * (totalForLevel - si)) : 0;

      // Live progress
      const pct = ((si + 1) / totalForLevel * 100).toFixed(0);
      const bar = '█'.repeat(Math.floor((si + 1) / totalForLevel * 20)).padEnd(20, '░');
      process.stdout.write(`\r  [${bar}] ${pct}% | Story ${si+1}/${totalForLevel} | "${theme.slice(0,30)}" | ${cluster.length}w | ETA ${eta}s`);

      const result = await generateOneStory(selectedModel, cluster, lv, theme, si, totalForLevel);

      const storyEntry = {
        story_id: `hsk${lv}-s${String(storyNum).padStart(3, '0')}`,
        hsk_level: lv,
        target_words: cluster.map((w) => w.hanzi),
        word_count: cluster.length,
        cluster_theme: theme,
        ...result,
      };

      allStories.push(storyEntry);
      totalStoriesGenerated++;

      // Update coverage tracking (cumulative)
      const newlyCovered = new Set((result.word_usage || []).map((u) => u.hanzi).filter(Boolean));
      for (const h of newlyCovered) coveredHanzi.add(h);
      const nowCovered = new Set(coveredHanzi);
      coverageByLevel[lv] = {
        total: levelWords.length,
        covered: nowCovered.size,
        uncovered: levelWords.filter((w) => !nowCovered.has(w.hanzi)).map((w) => ({
          hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, level: w.level, pos: w.pos,
        })),
        ratio: nowCovered.size / levelWords.length,
      };

      // Show result on new line
      const covStr = result.coverage > 0 ? `${(result.coverage * 100).toFixed(0)}%` : 'FAIL';
      const missingStr = result.missing_words?.length ? ` missing:${result.missing_words.length}` : '';
      const retryStr = result.attempt > 1 ? ` retry:${result.attempt}` : '';
      console.log(`\n    ${covStr} | chars:${result.char_count || 0}${missingStr}${retryStr} | ${nowCovered.size}/${levelWords.length} total`);

      // SAVE AFTER EACH STORY
      saveDataset();

      await sleep(API_DELAY_MS);
    }

    const levelElapsed = Math.round((Date.now() - levelStartTime) / 1000);
    const finalCov = coverageByLevel[lv];
    console.log(`\n  ✅ HSK ${lv} done: ${finalCov.covered}/${finalCov.total} (${(finalCov.ratio*100).toFixed(0)}%) in ${levelElapsed}s`);
  }

  // Final summary
  const finalCovered = Object.values(coverageByLevel).reduce((s, c) => s + c.covered, 0);
  const finalTotal = Object.values(coverageByLevel).reduce((s, c) => s + c.total, 0);
  const totalElapsed = Math.round((Date.now() - startTime) / 1000);

  logSection('Generation Complete');
  console.log(`  Stories: ${allStories.length} | Words: ${finalCovered}/${finalTotal} (${(finalCovered/finalTotal*100).toFixed(1)}%)`);
  console.log(`  Levels: ${Object.keys(coverageByLevel).join(', ')} | Time: ${Math.floor(totalElapsed/60)}m ${totalElapsed%60}s`);
  console.log(`  Output: ${STORIES_OUTPUT}`);
}

try {
  await main();
} catch (error) {
  console.error('\nFatal error:', error);
  process.exitCode = 1;
}
