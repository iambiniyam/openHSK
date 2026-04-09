import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Bunzip = require('seek-bzip');

const ROOT = process.cwd();
const HSK_PARTS = [
  path.join(ROOT, 'public', 'hsk3.0.part1.json'),
  path.join(ROOT, 'public', 'hsk3.0.part2.json'),
];
const DICTIONARY_PATH = path.join(ROOT, 'public', 'dictionary.txt');

const QUALITY_DIR = path.join(ROOT, 'public', 'quality');
const OUTPUT_PATH = path.join(QUALITY_DIR, 'hsk-tatoeba-examples.v1.json');
const ATTRIBUTION_PATH = path.join(QUALITY_DIR, 'ATTRIBUTION-TATOEBA.txt');

const CACHE_DIR = path.join(ROOT, 'tmp', 'tatoeba');
const SOURCE_FILES = {
  cmnSentences: {
    url: 'https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2',
    filePath: path.join(CACHE_DIR, 'cmn_sentences.tsv.bz2'),
  },
  engSentences: {
    url: 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2',
    filePath: path.join(CACHE_DIR, 'eng_sentences.tsv.bz2'),
  },
  cmnEngLinks: {
    url: 'https://downloads.tatoeba.org/exports/per_language/cmn/cmn-eng_links.tsv.bz2',
    filePath: path.join(CACHE_DIR, 'cmn-eng_links.tsv.bz2'),
  },
};

const MAX_EXAMPLES_PER_WORD = 3;
const MAX_SENTENCE_CHARS = 32;
const MIN_SENTENCE_CHARS = 4;

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isLikelyChineseCharacter(char) {
  return /[\u3400-\u9fff]/u.test(char);
}

function isReasonableChineseSentence(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return false;

  const length = Array.from(normalized).length;
  if (length < MIN_SENTENCE_CHARS || length > MAX_SENTENCE_CHARS) {
    return false;
  }

  if (/[A-Za-z]/.test(normalized)) {
    return false;
  }

  return true;
}

function isReasonableEnglishSentence(text) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return false;
  if (!/[A-Za-z]/.test(normalized)) return false;
  if (normalized.length < 5 || normalized.length > 180) return false;
  return true;
}

function toDifficulty(level) {
  if (!Number.isFinite(level)) return 'intermediate';
  if (level <= 2) return 'beginner';
  if (level <= 4) return 'intermediate';
  return 'advanced';
}

function scoreSentencePair(chinese, english) {
  const chineseLength = Array.from(chinese).length;
  const englishLength = english.length;

  let score = 100;
  score -= Math.abs(chineseLength - 10) * 1.8;
  score -= Math.abs(englishLength - 55) * 0.08;

  if (/[,;:]/.test(english)) score -= 1.2;
  if (/\bhttps?:\/\//i.test(english)) score -= 8;

  return score;
}

function readHskWords() {
  const words = new Map();

  for (const filePath of HSK_PARTS) {
    const text = fs.readFileSync(filePath, 'utf8');
    const partEntries = JSON.parse(text);
    for (const entry of partEntries) {
      const hanzi = entry?.source?.hanzi;
      if (typeof hanzi !== 'string') continue;
      const word = hanzi.trim();
      if (!word) continue;

      const level = Number(entry?.source?.level);
      if (!words.has(word)) {
        words.set(word, Number.isFinite(level) ? level : undefined);
      }
    }
  }

  return words;
}

function readCharacterPinyinMap() {
  const map = new Map();
  const text = fs.readFileSync(DICTIONARY_PATH, 'utf8');
  const lines = text.trim().split(/\r?\n/);

  for (const line of lines) {
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      const char = parsed?.character;
      const pinyin = Array.isArray(parsed?.pinyin) ? parsed.pinyin[0] : undefined;

      if (typeof char === 'string' && char.length === 1 && typeof pinyin === 'string' && pinyin.trim()) {
        map.set(char, pinyin.trim());
      }
    } catch {
      // Skip malformed rows.
    }
  }

  return map;
}

async function downloadIfMissing(source) {
  if (fs.existsSync(source.filePath)) {
    return;
  }

  const response = await fetch(source.url);
  if (!response.ok) {
    throw new Error(`Failed to download ${source.url}: HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(source.filePath, buffer);
}

function decodeBzipText(filePath) {
  const compressed = fs.readFileSync(filePath);
  const decoded = Bunzip.decode(compressed);
  return Buffer.from(decoded).toString('utf8');
}

function parseSentenceRows(text) {
  const map = new Map();
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;

    const columns = line.split('\t');
    if (columns.length < 2) continue;

    const id = columns[0].trim();
    const sentence = normalizeWhitespace(columns.length >= 3 ? columns.slice(2).join('\t') : columns.slice(1).join('\t'));
    if (!id || !sentence) continue;

    map.set(id, sentence);
  }

  return map;
}

function parseLinkRows(text) {
  const map = new Map();
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const columns = line.split('\t');
    if (columns.length < 2) continue;

    const sourceId = columns[0].trim();
    const targetId = columns[1].trim();
    if (!sourceId || !targetId) continue;

    const existing = map.get(sourceId) ?? [];
    existing.push(targetId);
    map.set(sourceId, existing);
  }

  return map;
}

function chooseEnglishSentence(linkedIds, englishSentences) {
  let best = null;

  for (const engId of linkedIds) {
    const english = englishSentences.get(engId);
    if (!english || !isReasonableEnglishSentence(english)) continue;

    const score = scoreSentencePair('placeholder', english);
    if (!best || score > best.score) {
      best = { engId, english, score };
    }
  }

  return best;
}

function extractMatchedWords(sentence, hskWordSet, maxWordLength) {
  const chars = Array.from(sentence);
  const candidates = [];

  for (let start = 0; start < chars.length; start += 1) {
    for (let size = maxWordLength; size >= 1; size -= 1) {
      if (start + size > chars.length) continue;

      const token = chars.slice(start, start + size).join('');
      if (!hskWordSet.has(token)) continue;

      if (size === 1 && chars.length > 8) {
        continue;
      }

      candidates.push({ word: token, start, size });
    }
  }

  candidates.sort((a, b) => b.size - a.size || a.start - b.start);

  const occupied = new Set();
  const selected = [];

  for (const candidate of candidates) {
    let hasOverlap = false;
    for (let i = candidate.start; i < candidate.start + candidate.size; i += 1) {
      if (occupied.has(i)) {
        hasOverlap = true;
        break;
      }
    }
    if (hasOverlap) continue;

    selected.push(candidate.word);
    for (let i = candidate.start; i < candidate.start + candidate.size; i += 1) {
      occupied.add(i);
    }
  }

  return Array.from(new Set(selected));
}

function convertSentenceToPinyin(sentence, characterPinyinMap) {
  const chunks = [];
  const punctuation = new Set(['，', '。', '！', '？', '；', '：', ',', '.', '!', '?', ';', ':', '、', '（', '）', '(', ')', '"', '\'']);

  for (const char of sentence) {
    if (isLikelyChineseCharacter(char)) {
      chunks.push(characterPinyinMap.get(char) ?? char);
      continue;
    }

    if (/\s/.test(char)) {
      continue;
    }

    if (punctuation.has(char)) {
      if (chunks.length === 0) {
        chunks.push(char);
      } else {
        chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}${char}`;
      }
      continue;
    }

    chunks.push(char);
  }

  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

function writeAttributionFile() {
  const content = [
    'Data source: Tatoeba',
    'Website: https://tatoeba.org/',
    'Downloads: https://downloads.tatoeba.org/exports/per_language/',
    'Terms: https://tatoeba.org/en/terms_of_use',
    'License note: Sentence licenses are managed per sentence in Tatoeba (default is CC BY 2.0 FR).',
    'Attribution note: Keep sentence IDs and source links to preserve attribution traceability.',
    '',
    'This generated file stores sentence IDs and source links for educational reuse in OpenHSK.',
  ].join('\n');

  fs.writeFileSync(ATTRIBUTION_PATH, `${content}\n`, 'utf8');
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(QUALITY_DIR, { recursive: true });

  const wordLevels = readHskWords();
  const hskWordSet = new Set(wordLevels.keys());
  const characterPinyinMap = readCharacterPinyinMap();
  const maxWordLength = Math.max(...Array.from(hskWordSet).map((word) => Array.from(word).length));

  await downloadIfMissing(SOURCE_FILES.cmnSentences);
  await downloadIfMissing(SOURCE_FILES.engSentences);
  await downloadIfMissing(SOURCE_FILES.cmnEngLinks);

  const cmnSentences = parseSentenceRows(decodeBzipText(SOURCE_FILES.cmnSentences.filePath));
  const engSentences = parseSentenceRows(decodeBzipText(SOURCE_FILES.engSentences.filePath));
  const cmnEngLinks = parseLinkRows(decodeBzipText(SOURCE_FILES.cmnEngLinks.filePath));

  const examplesByWord = new Map();
  let consideredSentences = 0;

  for (const [cmnId, chinese] of cmnSentences.entries()) {
    if (!isReasonableChineseSentence(chinese)) {
      continue;
    }

    const linkedIds = cmnEngLinks.get(cmnId);
    if (!linkedIds || linkedIds.length === 0) {
      continue;
    }

    const bestEnglish = chooseEnglishSentence(linkedIds, engSentences);
    if (!bestEnglish) {
      continue;
    }

    const matchedWords = extractMatchedWords(chinese, hskWordSet, maxWordLength);
    if (matchedWords.length === 0) {
      continue;
    }

    const sentencePinyin = convertSentenceToPinyin(chinese, characterPinyinMap);
    const pairScore = scoreSentencePair(chinese, bestEnglish.english);
    consideredSentences += 1;

    for (const word of matchedWords) {
      const examples = examplesByWord.get(word) ?? [];
      const duplicate = examples.some((item) => item.chinese === chinese && item.english === bestEnglish.english);
      if (duplicate) continue;

      examples.push({
        chinese,
        pinyin: sentencePinyin,
        english: bestEnglish.english,
        sourceId: cmnId,
        difficulty: toDifficulty(wordLevels.get(word)),
        score: pairScore,
      });
      examplesByWord.set(word, examples);
    }
  }

  const words = [];
  let totalExamples = 0;

  for (const [hanzi, level] of wordLevels.entries()) {
    const examples = examplesByWord.get(hanzi);
    if (!examples || examples.length === 0) continue;

    examples.sort((a, b) => b.score - a.score);
    const topExamples = examples
      .slice(0, MAX_EXAMPLES_PER_WORD)
      .map(({ score, ...rest }) => rest);

    totalExamples += topExamples.length;
    words.push({
      hanzi,
      hskLevel: level,
      examples: topExamples,
    });
  }

  words.sort((a, b) => a.hanzi.localeCompare(b.hanzi, 'zh-Hans-CN'));

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'Tatoeba',
      sourceFiles: {
        cmnSentences: SOURCE_FILES.cmnSentences.url,
        engSentences: SOURCE_FILES.engSentences.url,
        cmnEngLinks: SOURCE_FILES.cmnEngLinks.url,
      },
      sourceTerms: 'https://tatoeba.org/en/terms_of_use',
      sourceLicenseNote: 'Sentence licenses are per sentence in Tatoeba; default text license is CC BY 2.0 FR.',
      targetHskTerms: wordLevels.size,
      wordsWithExamples: words.length,
      totalExamples,
      coverage: Number((words.length / wordLevels.size).toFixed(4)),
      consideredSentences,
      notes: 'Examples are selected for readability and linked to original Tatoeba sentence IDs for attribution traceability.',
    },
    words,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output), 'utf8');
  writeAttributionFile();

  console.log(`[example-dataset] HSK target terms: ${wordLevels.size}`);
  console.log(`[example-dataset] Words with examples: ${words.length}`);
  console.log(`[example-dataset] Total selected examples: ${totalExamples}`);
  console.log(`[example-dataset] Coverage: ${(output.meta.coverage * 100).toFixed(2)}%`);
  console.log(`[example-dataset] Considered Mandarin sentences: ${consideredSentences}`);
  console.log(`[example-dataset] Output: ${OUTPUT_PATH}`);
  console.log(`[example-dataset] Attribution: ${ATTRIBUTION_PATH}`);
}

try {
  await main();
} catch (error) {
  console.error('[example-dataset] Failed:', error);
  process.exitCode = 1;
}