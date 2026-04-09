import { fetchWithCacheFallback } from '@/lib/offlineFetch';

const HSK_LEGACY_PATH = '/hsk3.0.json';
const HSK_PART_PATHS = ['/hsk3.0.part1.json', '/hsk3.0.part2.json'];

const GRAPHICS_LEGACY_PATH = '/graphics.txt';
const GRAPHICS_PART_PATHS = ['/graphics.part1.txt', '/graphics.part2.txt'];

async function fetchJsonArray<T>(path: string): Promise<T[]> {
  const response = await fetchWithCacheFallback(path);
  return (await response.json()) as T[];
}

async function fetchText(path: string): Promise<string> {
  const response = await fetchWithCacheFallback(path);
  return response.text();
}

export async function loadHskDataset<T>(): Promise<T[]> {
  try {
    const parts = await Promise.all(HSK_PART_PATHS.map((path) => fetchJsonArray<T>(path)));
    return parts.flat();
  } catch {
    return fetchJsonArray<T>(HSK_LEGACY_PATH);
  }
}

export async function loadGraphicsDatasetText(): Promise<string> {
  try {
    const parts = await Promise.all(GRAPHICS_PART_PATHS.map((path) => fetchText(path)));
    return parts.map((part) => part.trim()).join('\n');
  } catch {
    return fetchText(GRAPHICS_LEGACY_PATH);
  }
}