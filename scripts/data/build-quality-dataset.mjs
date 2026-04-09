import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

const ROOT = process.cwd();
const HSK_PARTS = [
  path.join(ROOT, 'public', 'hsk3.0.part1.json'),
  path.join(ROOT, 'public', 'hsk3.0.part2.json'),
];
const CEDICT_GZIP_PATH = path.join(ROOT, 'public', 'cedict.txt.gz');
const QUALITY_DIR = path.join(ROOT, 'public', 'quality');
const ENRICHMENT_OUTPUT_PATH = path.join(QUALITY_DIR, 'hsk-cedict-enrichment.v1.json');
const ATTRIBUTION_OUTPUT_PATH = path.join(QUALITY_DIR, 'ATTRIBUTION-CC-CEDICT.txt');

const REFERENCE_PREFIXES = [
  'variant of ',
  'old variant of ',
  'also written ',
  'see ',
  'see also ',
  'abbr. for ',
  'also pr. ',
  'classifier for ',
  'CL:',
];

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeForKey(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function shouldKeepDefinition(definition) {
  const normalized = normalizeWhitespace(definition);
  if (!normalized) return false;

  const lowercase = normalized.toLowerCase();
  return !REFERENCE_PREFIXES.some((prefix) => lowercase.startsWith(prefix));
}

function parseCedictLine(line) {
  const match = line.match(/^(\S+)\s+(\S+)\s+\[(.+?)\]\s+\/(.+)\/$/);
  if (!match) return null;

  const [, traditional, simplified, pinyin, rawDefinitions] = match;
  const definitions = rawDefinitions
    .split('/')
    .map((segment) => normalizeWhitespace(segment))
    .filter((segment) => shouldKeepDefinition(segment));

  if (definitions.length === 0) {
    return null;
  }

  return {
    traditional,
    simplified,
    pinyin: normalizeWhitespace(pinyin),
    definitions,
  };
}

function readHskTargets() {
  const targets = new Set();

  for (const filePath of HSK_PARTS) {
    const text = fs.readFileSync(filePath, 'utf8');
    const partEntries = JSON.parse(text);
    for (const entry of partEntries) {
      const hanzi = entry?.source?.hanzi;
      if (typeof hanzi === 'string' && hanzi.trim()) {
        targets.add(hanzi.trim());
      }
    }
  }

  return targets;
}

function parseCedictContent(content, targetTerms) {
  const lines = content.split(/\r?\n/);
  const metadata = {
    version: 'unknown',
    subversion: 'unknown',
    format: 'unknown',
    charset: 'UTF-8',
  };

  const records = new Map();

  for (const line of lines) {
    if (!line) continue;

    if (line.startsWith('#! version=')) {
      metadata.version = line.slice('#! version='.length).trim();
      continue;
    }
    if (line.startsWith('#! subversion=')) {
      metadata.subversion = line.slice('#! subversion='.length).trim();
      continue;
    }
    if (line.startsWith('#! format=')) {
      metadata.format = line.slice('#! format='.length).trim();
      continue;
    }
    if (line.startsWith('#! charset=')) {
      metadata.charset = line.slice('#! charset='.length).trim();
      continue;
    }
    if (line.startsWith('#')) {
      continue;
    }

    const parsed = parseCedictLine(line);
    if (!parsed) continue;
    if (!targetTerms.has(parsed.simplified)) continue;

    const current = records.get(parsed.simplified) ?? {
      hanzi: parsed.simplified,
      traditionalVariants: new Set(),
      pinyin: new Set(),
      definitions: new Map(),
      rawMatchCount: 0,
    };

    current.traditionalVariants.add(parsed.traditional);
    current.pinyin.add(parsed.pinyin);
    for (const definition of parsed.definitions) {
      const key = normalizeForKey(definition);
      if (!current.definitions.has(key)) {
        current.definitions.set(key, definition);
      }
    }
    current.rawMatchCount += 1;

    records.set(parsed.simplified, current);
  }

  return { records, metadata };
}

function toQualityScore(definitionCount, pinyinCount, rawMatchCount) {
  const score = 0.45
    + Math.min(definitionCount, 8) * 0.05
    + Math.min(pinyinCount, 3) * 0.08
    + Math.min(rawMatchCount, 4) * 0.04;
  return Number(Math.min(score, 1).toFixed(2));
}

function finalizeEntries(records) {
  const entries = [];

  for (const record of records.values()) {
    const definitions = Array.from(record.definitions.values()).slice(0, 12);
    const pinyin = Array.from(record.pinyin).slice(0, 5);
    const qualityScore = toQualityScore(definitions.length, pinyin.length, record.rawMatchCount);

    entries.push({
      hanzi: record.hanzi,
      traditionalVariants: Array.from(record.traditionalVariants).sort(),
      pinyin,
      definitions,
      qualityScore,
      matchCount: record.rawMatchCount,
    });
  }

  entries.sort((a, b) => a.hanzi.localeCompare(b.hanzi, 'zh-Hans-CN'));
  return entries;
}

function writeAttributionFile() {
  const content = [
    'Data source: CC-CEDICT',
    'Publisher: MDBG',
    'License: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
    'https://creativecommons.org/licenses/by-sa/4.0/',
    'Reference: https://www.mdbg.net/chinese/dictionary?page=cc-cedict',
    '',
    'This file is generated for OpenHSK lexical enrichment and must retain attribution.',
  ].join('\n');

  fs.writeFileSync(ATTRIBUTION_OUTPUT_PATH, `${content}\n`, 'utf8');
}

function main() {
  if (!fs.existsSync(CEDICT_GZIP_PATH)) {
    throw new Error(`Missing source dataset: ${CEDICT_GZIP_PATH}`);
  }

  const targetTerms = readHskTargets();
  if (targetTerms.size === 0) {
    throw new Error('No HSK terms found. Cannot build enrichment dataset.');
  }

  const compressed = fs.readFileSync(CEDICT_GZIP_PATH);
  const cedictContent = gunzipSync(compressed).toString('utf8');
  const { records, metadata } = parseCedictContent(cedictContent, targetTerms);
  const entries = finalizeEntries(records);

  fs.mkdirSync(QUALITY_DIR, { recursive: true });

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'CC-CEDICT',
      sourceVersion: metadata.version,
      sourceSubversion: metadata.subversion,
      sourceFormat: metadata.format,
      sourceCharset: metadata.charset,
      sourceLicense: 'CC BY-SA 4.0',
      targetHskTerms: targetTerms.size,
      matchedHskTerms: entries.length,
      coverage: Number((entries.length / targetTerms.size).toFixed(4)),
      notes: 'Definitions are filtered to reduce pure cross-reference senses and keep learner-useful meanings first.',
    },
    entries,
  };

  fs.writeFileSync(ENRICHMENT_OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  writeAttributionFile();

  console.log(`[quality-dataset] HSK target terms: ${targetTerms.size}`);
  console.log(`[quality-dataset] Matched terms from CEDICT: ${entries.length}`);
  console.log(`[quality-dataset] Coverage: ${(output.meta.coverage * 100).toFixed(2)}%`);
  console.log(`[quality-dataset] Output: ${ENRICHMENT_OUTPUT_PATH}`);
  console.log(`[quality-dataset] Attribution: ${ATTRIBUTION_OUTPUT_PATH}`);
}

try {
  main();
} catch (error) {
  console.error('[quality-dataset] Failed:', error);
  process.exitCode = 1;
}
