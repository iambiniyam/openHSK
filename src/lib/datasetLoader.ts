import { fetchWithCacheFallback } from '@/lib/offlineFetch';

const HSK_LEGACY_PATH = '/hsk3.0.json';
const HSK_PART_PATHS = ['/hsk3.0.part1.json', '/hsk3.0.part2.json'];

const NETWORK_SEQUENTIAL_TYPES = new Set(['slow-2g', '2g']);

type NetworkConnection = { saveData?: boolean; effectiveType?: string };

const getNetworkConnection = (): NetworkConnection | null => {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { connection?: NetworkConnection }).connection ?? null;
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

let hskDatasetPromise: Promise<unknown[]> | null = null;

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
