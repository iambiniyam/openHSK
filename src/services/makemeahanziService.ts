// MakeMeAHanzi Service - Thin wrapper around UnifiedDictionaryService
// Eliminates duplicate fetch/parse of dictionary.txt and graphics data.

import { unifiedDictionary } from '@/services/unifiedDictionaryService';
import type { HanziCharacter, HanziGraphics } from '@/types/hanzi';

export type { HanziCharacter, HanziGraphics } from '@/types/hanzi';

class MakeMeAHanziService {
  async loadData(): Promise<void> {
    if (unifiedDictionary.isLoaded()) return;
    await unifiedDictionary.initialize();
  }

  getCharacter(char: string): HanziCharacter | undefined {
    return unifiedDictionary.getHanziCharacter(char);
  }

  getGraphics(char: string): HanziGraphics | undefined {
    return unifiedDictionary.getHanziGraphics(char);
  }

  hasStrokeData(char: string): boolean {
    return unifiedDictionary.hasStrokeData(char);
  }

  getStrokePaths(char: string): string[] {
    return unifiedDictionary.getStrokeData(char)?.strokes || [];
  }

  getDecomposition(char: string): {
    structure: string;
    components: { char: string; name?: string; meaning?: string }[];
    etymology?: HanziCharacter['etymology'];
  } | null {
    return unifiedDictionary.getHanziDecomposition(char);
  }

  getRadical(char: string): { radical: string; meaning?: string } | null {
    return unifiedDictionary.getHanziRadical(char);
  }

  searchByDefinition(query: string): HanziCharacter[] {
    return unifiedDictionary.searchHanziByDefinition(query);
  }

  getCharactersByRadical(radical: string): HanziCharacter[] {
    return unifiedDictionary.getHanziByRadical(radical);
  }

  getAllRadicals(): { char: string; definition?: string; count: number }[] {
    return unifiedDictionary.getAllHanziRadicals();
  }
}

export const makemeahanziService = new MakeMeAHanziService();
