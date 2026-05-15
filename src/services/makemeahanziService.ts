// MakeMeAHanzi Service — delegates to UnifiedDictionaryService when available,
// falls back to independent load so stroke order never blocks on full dictionary init.

import { unifiedDictionary } from '@/services/unifiedDictionaryService';
import { fetchWithCacheFallback } from '@/lib/offlineFetch';
import { loadGraphicsDatasetPartsText } from '@/lib/datasetLoader';
import type { HanziCharacter, HanziGraphics } from '@/types/hanzi';

export type { HanziCharacter, HanziGraphics } from '@/types/hanzi';

class MakeMeAHanziService {
  private dictionary = new Map<string, HanziCharacter>();
  private graphics = new Map<string, HanziGraphics>();
  private ownLoaded = false;
  private ownLoadPromise: Promise<void> | null = null;

  async loadData(): Promise<void> {
    // Fast path: unified dictionary already has everything
    if (unifiedDictionary.isLoaded()) return;

    // Start unified dictionary loading in background (if not already started)
    unifiedDictionary.initialize().catch(() => {});

    // Fallback: load independently so stroke order works immediately.
    // These fetches hit the browser / service-worker cache because
    // unifiedDictionary already started downloading the same files.
    if (!this.ownLoadPromise) {
      this.ownLoadPromise = this.loadIndependently();
    }
    return this.ownLoadPromise;
  }

  private async loadIndependently(): Promise<void> {
    if (this.ownLoaded) return;
    try {
      const [dictText, graphicsParts] = await Promise.all([
        fetchWithCacheFallback('/dictionary.txt').then((r) => r.text()),
        loadGraphicsDatasetPartsText(),
      ]);
      this.parseDictionary(dictText);
      graphicsParts.forEach((p) => this.parseGraphics(p));
      this.ownLoaded = true;
    } catch (error) {
      console.error('Failed to load makemeahanzi fallback data:', error);
    }
  }

  private parseDictionary(text: string): void {
    const lines = text.trim().split('\n');
    for (const line of lines) {
      try {
        const entry: HanziCharacter = JSON.parse(line);
        this.dictionary.set(entry.character, entry);
      } catch {
        // Skip invalid lines
      }
    }
  }

  private parseGraphics(text: string): void {
    const lines = text.trim().split('\n');
    for (const line of lines) {
      try {
        const entry: HanziGraphics = JSON.parse(line);
        this.graphics.set(entry.character, entry);
      } catch {
        // Skip invalid lines
      }
    }
  }

  private useOwnData(): boolean {
    return this.ownLoaded && !unifiedDictionary.isLoaded();
  }

  getCharacter(char: string): HanziCharacter | undefined {
    if (this.useOwnData()) return this.dictionary.get(char);
    return unifiedDictionary.getHanziCharacter(char);
  }

  getGraphics(char: string): HanziGraphics | undefined {
    if (this.useOwnData()) return this.graphics.get(char);
    return unifiedDictionary.getHanziGraphics(char);
  }

  hasStrokeData(char: string): boolean {
    if (this.useOwnData()) return this.graphics.has(char);
    return unifiedDictionary.hasStrokeData(char);
  }

  getStrokePaths(char: string): string[] {
    return this.getGraphics(char)?.strokes || [];
  }

  getDecomposition(char: string): {
    structure: string;
    components: { char: string; name?: string; meaning?: string }[];
    etymology?: HanziCharacter['etymology'];
  } | null {
    const entry = this.getCharacter(char);
    if (!entry) return null;

    const components: { char: string; name?: string; meaning?: string }[] = [];
    const componentChars = entry.decomposition.replace(/[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻？]/g, '').split('');
    for (const compChar of componentChars) {
      const compEntry = this.getCharacter(compChar);
      components.push({
        char: compChar,
        name: compEntry?.radical,
        meaning: compEntry?.definition
      });
    }

    return {
      structure: entry.decomposition,
      components,
      etymology: entry.etymology
    };
  }

  getRadical(char: string): { radical: string; meaning?: string } | null {
    const entry = this.getCharacter(char);
    if (!entry) return null;
    const radicalEntry = this.getCharacter(entry.radical);
    return {
      radical: entry.radical,
      meaning: radicalEntry?.definition
    };
  }

  searchByDefinition(query: string): HanziCharacter[] {
    if (this.useOwnData()) {
      const results: HanziCharacter[] = [];
      const lowerQuery = query.toLowerCase();
      for (const entry of this.dictionary.values()) {
        if (entry.definition?.toLowerCase().includes(lowerQuery)) {
          results.push(entry);
        }
      }
      return results.slice(0, 20);
    }
    return unifiedDictionary.searchHanziByDefinition(query);
  }

  getCharactersByRadical(radical: string): HanziCharacter[] {
    if (this.useOwnData()) {
      const results: HanziCharacter[] = [];
      for (const entry of this.dictionary.values()) {
        if (entry.radical === radical) {
          results.push(entry);
        }
      }
      return results.slice(0, 50);
    }
    return unifiedDictionary.getHanziByRadical(radical);
  }

  getAllRadicals(): { char: string; definition?: string; count: number }[] {
    if (this.useOwnData()) {
      const radicalCounts = new Map<string, number>();
      for (const entry of this.dictionary.values()) {
        const count = radicalCounts.get(entry.radical) || 0;
        radicalCounts.set(entry.radical, count + 1);
      }
      return Array.from(radicalCounts.entries())
        .map(([char, count]) => ({
          char,
          definition: this.dictionary.get(char)?.definition,
          count
        }))
        .sort((a, b) => b.count - a.count);
    }
    return unifiedDictionary.getAllHanziRadicals();
  }
}

export const makemeahanziService = new MakeMeAHanziService();
