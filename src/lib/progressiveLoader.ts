import { fetchWithCacheFallback } from './offlineFetch';

export interface ProgressUpdate {
  phaseId: string;
  phaseLabel: string;
  phaseIndex: number;
  totalPhases: number;
  filePath: string;
  fileProgress: number;
  phaseProgress: number;
  overallProgress: number;
  bytesLoaded: number;
  bytesTotal: number;
  status: 'downloading' | 'parsing' | 'complete' | 'error';
}

export type ProgressCallback = (update: ProgressUpdate) => void;

const PHASES = [
  { id: 'vocab-core', label: 'Loading vocabulary', files: [{ path: '/hsk3.0.part1.json', sizeEstimateMb: 24 }] },
  { id: 'vocab-extended', label: 'Loading more words', files: [{ path: '/hsk3.0.part2.json', sizeEstimateMb: 5 }] },
];

const totalEstimateMb = PHASES.reduce((s, p) => s + p.files.reduce((f, f2) => f + f2.sizeEstimateMb, 0), 0);

export async function loadDataProgressively(
  onProgress: ProgressCallback,
  signal?: AbortSignal,
): Promise<{ hskPart1: unknown[]; hskPart2: unknown[] }> {
  const results = { hskPart1: [] as unknown[], hskPart2: [] as unknown[] };
  let completedBytes = 0;

  for (let i = 0; i < PHASES.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const phase = PHASES[i];
    const phaseTotalBytes = phase.files.reduce((s, f) => s + f.sizeEstimateMb * 1024 * 1024, 0);
    let phaseLoadedBytes = 0;

    for (const file of phase.files) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const fileEstimateBytes = file.sizeEstimateMb * 1024 * 1024;
      let fileLoaded = 0;

      const report = (status: ProgressUpdate['status']) => {
        onProgress({
          phaseId: phase.id,
          phaseLabel: phase.label,
          phaseIndex: i,
          totalPhases: PHASES.length,
          filePath: file.path,
          fileProgress: fileEstimateBytes > 0 ? Math.min(100, (fileLoaded / fileEstimateBytes) * 100) : 100,
          phaseProgress: phaseTotalBytes > 0 ? Math.min(100, (phaseLoadedBytes / phaseTotalBytes) * 100) : 100,
          overallProgress: Math.min(100, ((completedBytes + fileLoaded) / (totalEstimateMb * 1024 * 1024)) * 100),
          bytesLoaded: completedBytes + fileLoaded,
          bytesTotal: totalEstimateMb * 1024 * 1024,
          status,
        });
      };

      try {
        report('downloading');

        const response = await fetchWithCacheFallback(file.path);
        const text = await response.text();
        fileLoaded = fileEstimateBytes;
        phaseLoadedBytes += fileEstimateBytes;
        report('parsing');
        if (file.path.includes('part1.json')) results.hskPart1 = JSON.parse(text);
        else results.hskPart2 = JSON.parse(text);

        report('complete');
      } catch (err) {
        report('error');
        throw err;
      }
    }

    completedBytes += phaseTotalBytes;
  }

  return results;
}
