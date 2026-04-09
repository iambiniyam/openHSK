import { fetchWithCacheFallback } from '@/lib/offlineFetch';

const HSK_LEGACY_PATH = '/hsk3.0.json';
const HSK_PART_PATHS = ['/hsk3.0.part1.json', '/hsk3.0.part2.json'];

const GRAPHICS_LEGACY_PATH = '/graphics.txt';
const GRAPHICS_PART_PATHS = ['/graphics.part1.txt', '/graphics.part2.txt'];
const CEDICT_ENRICHMENT_PATH = '/quality/hsk-cedict-enrichment.v1.json';
const TATOEBA_EXAMPLES_PATH = '/quality/hsk-tatoeba-examples.v1.json';

const NETWORK_SEQUENTIAL_TYPES = new Set(['slow-2g', '2g']);
let hskDatasetPromise: Promise<unknown[]> | null = null;

type NetworkConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

export interface CedictEnrichmentEntry {
  hanzi: string;
  traditionalVariants: string[];
  pinyin: string[];
  definitions: string[];
  qualityScore: number;
  matchCount: number;
}

export interface CedictEnrichmentDataset {
  meta: {
    generatedAt: string;
    source: string;
    sourceVersion: string;
    sourceSubversion: string;
    sourceFormat: string;
    sourceCharset: string;
    sourceLicense: string;
    targetHskTerms: number;
    matchedHskTerms: number;
    coverage: number;
    notes: string;
  };
  entries: CedictEnrichmentEntry[];
}

export interface TatoebaExample {
  chinese: string;
  pinyin: string;
  english: string;
  sourceId: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface TatoebaWordExamples {
  hanzi: string;
  hskLevel?: number;
  examples: TatoebaExample[];
}

export interface TatoebaExamplesDataset {
  meta: {
    generatedAt: string;
    source: string;
    sourceTerms: string;
    sourceLicenseNote: string;
    targetHskTerms: number;
    wordsWithExamples: number;
    totalExamples: number;
    coverage: number;
    consideredSentences: number;
    notes: string;
  };
  words: TatoebaWordExamples[];
}

const getNetworkConnection = (): NetworkConnection | null => {
  if (typeof navigator === 'undefined') return null;

  const nav = navigator as Navigator & { connection?: NetworkConnection };
  return nav.connection ?? null;
};

const shouldUseSequentialFetch = (): boolean => {
  const connection = getNetworkConnection();
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType ? NETWORK_SEQUENTIAL_TYPES.has(connection.effectiveType) : false;
};

async function fetchJsonArray<T>(path: string): Promise<T[]> {
  const response = await fetchWithCacheFallback(path);
  return (await response.json()) as T[];
}

async function fetchText(path: string): Promise<string> {
  const response = await fetchWithCacheFallback(path);
  return response.text();
}

async function fetchJsonArrayParts<T>(paths: string[]): Promise<T[]> {
  if (shouldUseSequentialFetch()) {
    const merged: T[] = [];
    for (const path of paths) {
      const part = await fetchJsonArray<T>(path);
      merged.push(...part);
    }
    return merged;
  }

  const parts = await Promise.all(paths.map((path) => fetchJsonArray<T>(path)));
  return parts.flat();
}

async function fetchTextParts(paths: string[]): Promise<string[]> {
  if (shouldUseSequentialFetch()) {
    const parts: string[] = [];
    for (const path of paths) {
      parts.push(await fetchText(path));
    }
    return parts;
  }

  return Promise.all(paths.map((path) => fetchText(path)));
}

export async function loadHskDataset<T>(): Promise<T[]> {
  if (!hskDatasetPromise) {
    hskDatasetPromise = (async () => {
      try {
        return await fetchJsonArrayParts<unknown>(HSK_PART_PATHS);
      } catch {
        return fetchJsonArray<unknown>(HSK_LEGACY_PATH);
      }
    })();
  }

  try {
    return (await hskDatasetPromise) as T[];
  } catch (error) {
    hskDatasetPromise = null;
    throw error;
  }
}

export async function loadGraphicsDatasetPartsText(): Promise<string[]> {
  try {
    return await fetchTextParts(GRAPHICS_PART_PATHS);
  } catch {
    return [await fetchText(GRAPHICS_LEGACY_PATH)];
  }
}

export async function loadGraphicsDatasetText(): Promise<string> {
  const parts = await loadGraphicsDatasetPartsText();
  return parts.map((part) => part.trim()).join('\n');
}

export async function loadCedictEnrichmentDataset(): Promise<CedictEnrichmentDataset | null> {
  try {
    const response = await fetchWithCacheFallback(CEDICT_ENRICHMENT_PATH);
    return (await response.json()) as CedictEnrichmentDataset;
  } catch {
    return null;
  }
}

export async function loadTatoebaExamplesDataset(): Promise<TatoebaExamplesDataset | null> {
  try {
    const response = await fetchWithCacheFallback(TATOEBA_EXAMPLES_PATH);
    return (await response.json()) as TatoebaExamplesDataset;
  } catch {
    return null;
  }
}

export async function warmDatasetCaches(): Promise<void> {
  const connection = getNetworkConnection();
  if (connection?.saveData) return;

  const lowBandwidth = connection?.effectiveType
    ? NETWORK_SEQUENTIAL_TYPES.has(connection.effectiveType)
    : false;

  const warmupPaths = lowBandwidth
    ? ['/hsk3.0.part1.json', '/dictionary.txt']
    : [
        '/hsk3.0.part1.json',
        '/hsk3.0.part2.json',
        '/dictionary.txt',
        '/graphics.part1.txt',
        CEDICT_ENRICHMENT_PATH,
      ];

  for (const path of warmupPaths) {
    try {
      await fetchWithCacheFallback(path);
    } catch {
      // Best-effort background warmup.
    }
  }
}