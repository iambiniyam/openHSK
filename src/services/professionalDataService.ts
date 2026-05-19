import { fetchWithCacheFallback } from '@/lib/offlineFetch';
import type { VocabDataset, DialogueDataset } from '@/types/professional';

let vocabDataset: VocabDataset | null = null;
let dialogueDataset: DialogueDataset | null = null;
let vocabPromise: Promise<VocabDataset | null> | null = null;
let dialoguePromise: Promise<DialogueDataset | null> | null = null;

export async function loadVocabDataset(): Promise<VocabDataset | null> {
  if (vocabDataset) return vocabDataset;
  if (vocabPromise) return vocabPromise;

  vocabPromise = (async () => {
    try {
      const res = await fetchWithCacheFallback('/quality/professional-vocabulary.v1.json');
      const data = (await res.json()) as VocabDataset;
      if (data?.terms?.length) {
        vocabDataset = data;
        return data;
      }
      return null;
    } catch {
      return null;
    }
  })();

  return vocabPromise;
}

export async function loadDialogueDataset(): Promise<DialogueDataset | null> {
  if (dialogueDataset) return dialogueDataset;
  if (dialoguePromise) return dialoguePromise;

  dialoguePromise = (async () => {
    try {
      const res = await fetchWithCacheFallback('/quality/professional-dialogues.v1.json');
      const data = (await res.json()) as DialogueDataset;
      if (data?.scenarios?.length) {
        dialogueDataset = data;
        return data;
      }
      return null;
    } catch {
      return null;
    }
  })();

  return dialoguePromise;
}

export function getVocabDataset(): VocabDataset | null {
  return vocabDataset;
}

export function getDialogueDataset(): DialogueDataset | null {
  return dialogueDataset;
}

export function clearProfessionalCache() {
  vocabDataset = null;
  dialogueDataset = null;
  vocabPromise = null;
  dialoguePromise = null;
}
