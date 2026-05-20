const DB_NAME = 'openhsk-runtime-v3';
const STORE_NAME = 'dict';
const CACHE_VERSION = 1;

function dataVersion(): string {
  const files = [
    '/hsk3.0.part1.json',
    '/hsk3.0.part2.json',
    '/dictionary.txt',
    '/graphics.part1.txt',
    '/graphics.part2.txt',
    '/quality/hsk-cedict-enrichment.v1.json',
    '/quality/hsk-tatoeba-examples.v1.json',
  ];
  return `${CACHE_VERSION}|${files.join(',')}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface CachePayload {
  version: string;
  entries: [string, unknown][];
  hanziIndex: [string, string[]][];
  pinyinIndex: [string, string[]][];
  definitionIndex: [string, string[]][];
  hskData: unknown[];
  charData: [string, unknown][];
  graphicsData: [string, unknown][];
  cedictEnrichment: [string, unknown][];
  tatoebaExamples: [string, unknown[]][];
}

export async function saveRuntimeCache(payload: CachePayload): Promise<boolean> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(payload, 'data');
      tx.oncomplete = () => { resolve(); };
      tx.onerror = () => { reject(tx.error); };
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

export async function loadRuntimeCache(): Promise<CachePayload | null> {
  try {
    const db = await openDB();
    const payload = await new Promise<CachePayload | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('data');
      req.onsuccess = () => { resolve(req.result); };
      req.onerror = () => { reject(req.error); };
    });
    db.close();
    if (!payload) return null;
    if (payload.version !== dataVersion()) return null;
    return payload;
  } catch {
    return null;
  }
}
