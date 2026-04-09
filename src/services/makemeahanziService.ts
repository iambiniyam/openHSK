// MakeMeAHanzi Service - Provides accurate stroke order and character decomposition
// Data from https://github.com/skishore/makemeahanzi

import { loadGraphicsDatasetText } from '@/lib/datasetLoader';
import { fetchWithCacheFallback } from '@/lib/offlineFetch';

export interface HanziCharacter {
  character: string;
  definition?: string;
  pinyin: string[];
  decomposition: string;
  etymology?: {
    type: 'ideographic' | 'pictophonetic';
    hint?: string;
    phonetic?: string;
    semantic?: string;
  };
  radical: string;
  matches: (number[] | null)[];
}

export interface HanziGraphics {
  character: string;
  strokes: string[];  // SVG path data for each stroke
  medians: number[][][];  // Median points for animation
}

class MakeMeAHanziService {
  private dictionary: Map<string, HanziCharacter> = new Map();
  private graphics: Map<string, HanziGraphics> = new Map();
  private loaded = false;

  async loadData(): Promise<void> {
    if (this.loaded) return;
    
    try {
      const [dictText, graphicsText] = await Promise.all([
        fetchWithCacheFallback('/dictionary.txt').then((response) => response.text()),
        loadGraphicsDatasetText(),
      ]);

      this.parseDictionary(dictText);
      this.parseGraphics(graphicsText);

      this.loaded = true;
      console.log(`Loaded ${this.dictionary.size} characters from makemeahanzi`);
    } catch (error) {
      console.error('Failed to load makemeahanzi data:', error);
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

  getCharacter(char: string): HanziCharacter | undefined {
    return this.dictionary.get(char);
  }

  getGraphics(char: string): HanziGraphics | undefined {
    return this.graphics.get(char);
  }

  hasStrokeData(char: string): boolean {
    return this.graphics.has(char);
  }

  // Get stroke order SVG paths for a character
  getStrokePaths(char: string): string[] {
    const graphics = this.graphics.get(char);
    return graphics?.strokes || [];
  }

  // Get character decomposition with meanings
  getDecomposition(char: string): {
    structure: string;
    components: { char: string; name?: string; meaning?: string }[];
    etymology?: HanziCharacter['etymology'];
  } | null {
    const entry = this.dictionary.get(char);
    if (!entry) return null;

    const components: { char: string; name?: string; meaning?: string }[] = [];
    
    // Parse decomposition (e.g., "⿰亻言" = left-right structure with 亻 and 言)
    const decomp = entry.decomposition;
    
    // Extract component characters from decomposition
    const componentChars = decomp.replace(/[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻？]/g, '').split('');
    
    for (const compChar of componentChars) {
      const compEntry = this.dictionary.get(compChar);
      components.push({
        char: compChar,
        name: compEntry?.radical,
        meaning: compEntry?.definition
      });
    }

    return {
      structure: decomp,
      components,
      etymology: entry.etymology
    };
  }

  // Get radical information
  getRadical(char: string): { radical: string; meaning?: string } | null {
    const entry = this.dictionary.get(char);
    if (!entry) return null;

    const radicalEntry = this.dictionary.get(entry.radical);
    return {
      radical: entry.radical,
      meaning: radicalEntry?.definition
    };
  }

  // Search characters by definition
  searchByDefinition(query: string): HanziCharacter[] {
    const results: HanziCharacter[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const entry of this.dictionary.values()) {
      if (entry.definition?.toLowerCase().includes(lowerQuery)) {
        results.push(entry);
      }
    }
    
    return results.slice(0, 20);
  }

  // Get characters by radical
  getCharactersByRadical(radical: string): HanziCharacter[] {
    const results: HanziCharacter[] = [];
    
    for (const entry of this.dictionary.values()) {
      if (entry.radical === radical) {
        results.push(entry);
      }
    }
    
    return results.slice(0, 50);
  }

  // Get all radicals
  getAllRadicals(): { char: string; definition?: string; count: number }[] {
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
}

export const makemeahanziService = new MakeMeAHanziService();
