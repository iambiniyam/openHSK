import type { UnifiedEntry } from '@/services/unifiedDictionaryService';

const MAX_DETAIL_NAV_SEQUENCE = 240;

export const buildDetailSequenceWindow = (sequence: UnifiedEntry[], selectedId: string): UnifiedEntry[] => {
  if (sequence.length <= MAX_DETAIL_NAV_SEQUENCE) {
    return sequence;
  }

  const selectedIndex = sequence.findIndex((entry) => entry.id === selectedId);
  if (selectedIndex === -1) {
    return sequence.slice(0, MAX_DETAIL_NAV_SEQUENCE);
  }

  const halfWindow = Math.floor(MAX_DETAIL_NAV_SEQUENCE / 2);
  const start = Math.max(0, selectedIndex - halfWindow);
  const end = Math.min(sequence.length, start + MAX_DETAIL_NAV_SEQUENCE);
  const normalizedStart = Math.max(0, end - MAX_DETAIL_NAV_SEQUENCE);

  return sequence.slice(normalizedStart, end);
};
