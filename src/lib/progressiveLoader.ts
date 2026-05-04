/**
 * Progressive data loader with real-time progress tracking.
 *
 * Uses ReadableStream to track actual byte download progress per file,
 * then reports overall phase progress to the UI.
 */

import { fetchWithCacheFallback } from './offlineFetch';

export interface LoadPhase {
  id: string;
  label: string;
  description: string;
  files: { path: string; sizeEstimateMb: number }[];
  optional?: boolean;
}

export interface ProgressUpdate {
  phaseId: string;
  phaseLabel: string;
  phaseIndex: number;
  totalPhases: number;
  filePath: string;
  fileProgress: number; // 0-100
  phaseProgress: number; // 0-100
  overallProgress: number; // 0-100
  bytesLoaded: number;
  bytesTotal: number;
  status: 'downloading' | 'parsing' | 'complete' | 'error';
}

export type ProgressCallback = (update: ProgressUpdate) => void;

const PHASES: LoadPhase[] = [
  {
    id: 'vocab-core',
    label: 'Loading vocabulary',
    description: 'Essential HSK word list',
    files: [
      { path: '/hsk3.0.part1.json', sizeEstimateMb: 24 },
    ],
  },
  {
    id: 'vocab-extended',
    label: 'Loading more words',
    description: 'Additional HSK entries',
    files: [
      { path: '/hsk3.0.part2.json', sizeEstimateMb: 5 },
    ],
  },
  {
    id: 'character-data',
    label: 'Loading character data',
    description: 'Definitions, radicals, etymology',
    files: [
      { path: '/dictionary.txt', sizeEstimateMb: 2.5 },
    ],
  },
  {
    id: 'stroke-graphics',
    label: 'Loading stroke animations',
    description: 'Character writing practice data',
    files: [
      { path: '/graphics.part1.txt', sizeEstimateMb: 24 },
      { path: '/graphics.part2.txt', sizeEstimateMb: 5 },
    ],
  },
  {
    id: 'enrichment',
    label: 'Enriching dictionary',
    description: 'CC-CEDICT definitions & examples',
    files: [
      { path: '/quality/hsk-cedict-enrichment.v1.json', sizeEstimateMb: 3.5 },
    ],
    optional: true,
  },
  {
    id: 'examples',
    label: 'Loading example sentences',
    description: 'Tatoeba sentence corpus',
    files: [
      { path: '/quality/hsk-tatoeba-examples.v1.json', sizeEstimateMb: 4 },
    ],
    optional: true,
  },
];

const TOTAL_ESTIMATED_MB = PHASES.reduce(
  (sum, p) => sum + p.files.reduce((fSum, f) => fSum + f.sizeEstimateMb, 0),
  0,
);

async function fetchWithProgress(
  path: string,
  onProgress: (loaded: number, total: number) => void,
): Promise<Response> {
  const response = await fetchWithCacheFallback(path);

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body || total === 0) {
    // Can't track progress — just return the response
    return response;
  }

  const reader = response.body.getReader();
  let loaded = 0;

  const stream = new ReadableStream({
    start(controller) {
      function pump(): Promise<void> {
        return reader.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }
          loaded += value.byteLength;
          onProgress(loaded, total);
          controller.enqueue(value);
          return pump();
        });
      }
      return pump();
    },
  });

  return new Response(stream, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export async function loadDataProgressively(
  onProgress: ProgressCallback,
  signal?: AbortSignal,
): Promise<{
  hskPart1: unknown[];
  hskPart2: unknown[];
  dictionaryText: string;
  graphicsParts: string[];
  cedictDataset: unknown | null;
  tatoebaDataset: unknown | null;
}> {
  const results = {
    hskPart1: [] as unknown[],
    hskPart2: [] as unknown[],
    dictionaryText: '',
    graphicsParts: [] as string[],
    cedictDataset: null as unknown | null,
    tatoebaDataset: null as unknown | null,
  };

  let completedBytes = 0;

  for (let phaseIdx = 0; phaseIdx < PHASES.length; phaseIdx++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const phase = PHASES[phaseIdx];
    const phaseTotalBytes = phase.files.reduce(
      (sum, f) => sum + f.sizeEstimateMb * 1024 * 1024,
      0,
    );
    let phaseLoadedBytes = 0;

    for (let fileIdx = 0; fileIdx < phase.files.length; fileIdx++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const file = phase.files[fileIdx];
      const fileEstimateBytes = file.sizeEstimateMb * 1024 * 1024;
      let fileLoaded = 0;

      const reportProgress = (status: ProgressUpdate['status']) => {
        const fileProgress = fileEstimateBytes > 0
          ? Math.min(100, (fileLoaded / fileEstimateBytes) * 100)
          : 100;
        const phaseProgress = phaseTotalBytes > 0
          ? Math.min(100, (phaseLoadedBytes / phaseTotalBytes) * 100)
          : 100;
        const overallProgress = Math.min(
          100,
          (completedBytes / (TOTAL_ESTIMATED_MB * 1024 * 1024)) * 100,
        );

        onProgress({
          phaseId: phase.id,
          phaseLabel: phase.label,
          phaseIndex: phaseIdx,
          totalPhases: PHASES.length,
          filePath: file.path,
          fileProgress,
          phaseProgress,
          overallProgress,
          bytesLoaded: completedBytes + fileLoaded,
          bytesTotal: TOTAL_ESTIMATED_MB * 1024 * 1024,
          status,
        });
      };

      try {
        reportProgress('downloading');

        const response = await fetchWithProgress(file.path, (loaded) => {
          fileLoaded = loaded;
          phaseLoadedBytes = phase.files
            .slice(0, fileIdx)
            .reduce((s, f) => s + f.sizeEstimateMb * 1024 * 1024, 0) + loaded;
          reportProgress('downloading');
        });

        reportProgress('parsing');

        const text = await response.text();

        if (phase.id === 'vocab-core') {
          results.hskPart1 = JSON.parse(text) as unknown[];
        } else if (phase.id === 'vocab-extended') {
          results.hskPart2 = JSON.parse(text) as unknown[];
        } else if (phase.id === 'character-data') {
          results.dictionaryText = text;
        } else if (phase.id === 'stroke-graphics') {
          results.graphicsParts.push(text);
        } else if (phase.id === 'enrichment') {
          results.cedictDataset = JSON.parse(text);
        } else if (phase.id === 'examples') {
          results.tatoebaDataset = JSON.parse(text);
        }

        fileLoaded = fileEstimateBytes;
        phaseLoadedBytes = phase.files
          .slice(0, fileIdx + 1)
          .reduce((s, f) => s + f.sizeEstimateMb * 1024 * 1024, 0);
        reportProgress('complete');
      } catch (err) {
        if (phase.optional) {
          // Optional phases can fail gracefully
          fileLoaded = fileEstimateBytes;
          reportProgress('complete');
        } else {
          reportProgress('error');
          throw err;
        }
      }
    }

    completedBytes += phaseTotalBytes;
  }

  return results;
}

export function getLoadingPhases(): LoadPhase[] {
  return PHASES;
}

export function getTotalEstimatedSizeMb(): number {
  return TOTAL_ESTIMATED_MB;
}
