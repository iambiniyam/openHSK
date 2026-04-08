import type { HSKEntry } from '@/types/hsk';
import { fetchWithCacheFallback } from '@/lib/offlineFetch';

// Unified Dictionary Entry - combines HSK + makemeahanzi + additional data
export interface UnifiedEntry {
  id: string;
  hanzi: string;
  traditional?: string;
  pinyin: string;
  pinyinTones: number[]; // Tone numbers [1, 2, 3, 4, 0]
  definitions: string[];
  hskLevel?: number;
  partOfSpeech: string[];
  
  // Character data (from makemeahanzi)
  strokeCount?: number;
  radical?: string;
  decomposition?: string;
  etymology?: {
    type: 'ideographic' | 'pictophonetic';
    hint?: string;
    phonetic?: string;
    semantic?: string;
  };
  
  // Multi-character word character breakdown
  characterBreakdown?: {
    char: string;
    pinyin: string;
    definition?: string;
    strokeCount?: number;
    radical?: string;
    etymology?: UnifiedEntry['etymology'];
  }[];
  
  // Usage data
  frequency?: number; // Word frequency rank
  examples: ExampleSentence[];
  
  // Related words
  synonyms: RelatedWord[];
  antonyms: RelatedWord[];
  collocations: string[];
  wordFamily: RelatedWord[];
  
  // Learning aids
  mnemonic?: string;
  commonMistakes?: string[];
  usageNotes?: string;
}

export interface ExampleSentence {
  chinese: string;
  pinyin: string;
  english: string;
  source?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface RelatedWord {
  hanzi: string;
  pinyin: string;
  definition: string;
  hskLevel?: number;
}

export interface SearchResult {
  entry: UnifiedEntry;
  matchType: 'exact' | 'pinyin' | 'definition' | 'component' | 'fuzzy';
  matchScore: number;
}

// Character stroke data from graphics.txt
interface CharacterGraphics {
  character: string;
  strokes: string[];
  medians: number[][][];
}

interface CharacterDictionaryData {
  character: string;
  definition?: string;
  pinyin?: string[];
  decomposition: string;
  etymology?: UnifiedEntry['etymology'];
  radical: string;
  matches?: (number[] | null)[];
}

class UnifiedDictionaryService {
  private entries: Map<string, UnifiedEntry> = new Map();
  private hanziIndex: Map<string, string[]> = new Map(); // hanzi -> entry IDs
  private pinyinIndex: Map<string, string[]> = new Map(); // pinyin (no tones) -> entry IDs
  private definitionIndex: Map<string, string[]> = new Map(); // word -> entry IDs
  private hskData: HSKEntry[] = [];
  private charData: Map<string, CharacterDictionaryData> = new Map(); // makemeahanzi dictionary data
  private graphicsData: Map<string, CharacterGraphics> = new Map(); // stroke graphics data
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;
    
    this.loadPromise = this.loadAllData();
    return this.loadPromise;
  }

  private async loadAllData(): Promise<void> {
    console.time('Dictionary Load');
    
    try {
      // Load all large datasets in parallel and fallback to cache when offline.
      const [hskResponse, dictResponse, graphicsResponse] = await Promise.all([
        fetchWithCacheFallback('/hsk3.0.json'),
        fetchWithCacheFallback('/dictionary.txt'),
        fetchWithCacheFallback('/graphics.txt'),
      ]);

      const [hskData, dictText, graphicsText] = await Promise.all([
        hskResponse.json() as Promise<HSKEntry[]>,
        dictResponse.text(),
        graphicsResponse.text(),
      ]);

      this.hskData = hskData;
      this.parseCharacterData(dictText);
      this.parseGraphicsData(graphicsText);
      
      // Build unified entries
      this.buildUnifiedEntries();
      
      // Build search indexes
      this.buildIndexes();
      
      this.loaded = true;
      console.timeEnd('Dictionary Load');
      console.log(`Loaded ${this.entries.size} unified entries`);
      console.log(`Character data: ${this.charData.size} entries`);
      console.log(`Graphics data: ${this.graphicsData.size} entries`);
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      throw error;
    }
  }

  private parseCharacterData(text: string): void {
    const lines = text.trim().split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as CharacterDictionaryData;
        this.charData.set(entry.character, entry);
      } catch {
        // Skip invalid lines
      }
    }
  }

  private parseGraphicsData(text: string): void {
    const lines = text.trim().split('\n');
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as CharacterGraphics;
        this.graphicsData.set(entry.character, entry);
      } catch {
        // Skip invalid lines
      }
    }
  }

  private buildUnifiedEntries(): void {
    // Process HSK entries
    for (const hskEntry of this.hskData) {
      const hanzi = hskEntry.source.hanzi;
      const id = hskEntry.entry_id;
      
      // Get character data for each character in the word
      const charDataList = hanzi.split('').map(char => this.charData.get(char));
      const mainChar = charDataList[0];
      
      // Parse pinyin tones
      const pinyinTones = this.extractTones(hskEntry.source.pinyin);
      
      // Build character breakdown for multi-character words
      const characterBreakdown = this.buildCharacterBreakdown(hanzi);
      
      // Build unified entry
      const unified: UnifiedEntry = {
        id,
        hanzi,
        traditional: hskEntry.source.traditional,
        pinyin: hskEntry.source.pinyin,
        pinyinTones,
        definitions: hskEntry.core.english_definitions,
        hskLevel: hskEntry.source.level,
        partOfSpeech: hskEntry.core.part_of_speech,
        
        // Character data - for single chars use direct data, for multi-char use aggregate
        strokeCount: this.calculateStrokeCount(hanzi),
        radical: hanzi.length === 1 ? mainChar?.radical : undefined,
        decomposition: hanzi.length === 1 ? mainChar?.decomposition : undefined,
        etymology: hanzi.length === 1 ? mainChar?.etymology : undefined,
        
        // Character breakdown for multi-character words
        characterBreakdown: characterBreakdown && characterBreakdown.length > 0 ? characterBreakdown : undefined,
        
        // Examples
        examples: hskEntry.examples.map(ex => ({
          chinese: ex.chinese,
          pinyin: ex.pinyin,
          english: ex.english,
          difficulty: this.mapDifficulty(ex.difficulty_level)
        })),
        
        // Related words
        synonyms: hskEntry.related_vocabulary.synonyms.map(s => ({
          hanzi: s.word,
          pinyin: '', // Will be filled later
          definition: s.note || ''
        })),
        antonyms: hskEntry.related_vocabulary.antonyms.map(a => ({
          hanzi: a.word,
          pinyin: '',
          definition: a.note || ''
        })),
        collocations: hskEntry.usage_grammar?.collocations || [],
        wordFamily: hskEntry.related_vocabulary.word_family.map(w => ({
          hanzi: w.word,
          pinyin: '',
          definition: w.note || ''
        })),
        
        // Learning aids
        mnemonic: hskEntry.learning_aids?.mnemonic,
        commonMistakes: hskEntry.usage_grammar?.common_mistakes?.map(m => m.mistake),
        usageNotes: hskEntry.usage_grammar?.register?.join(', ')
      };
      
      this.entries.set(id, unified);
    }
    
    // Enrich related words with pinyin from our data
    this.enrichRelatedWords();
  }

  private buildCharacterBreakdown(hanzi: string): UnifiedEntry['characterBreakdown'] {
    if (hanzi.length <= 1) return [];
    
    const breakdown: NonNullable<UnifiedEntry['characterBreakdown']> = [];
    
    for (let i = 0; i < hanzi.length; i++) {
      const char = hanzi[i];
      const charData = this.charData.get(char);
      
      if (charData) {
        breakdown.push({
          char,
          pinyin: charData.pinyin?.[0] || '',
          definition: charData.definition,
          strokeCount: charData.matches?.length || 0,
          radical: charData.radical,
          etymology: charData.etymology
        });
      }
    }
    
    return breakdown;
  }

  private extractTones(pinyin: string): number[] {
    const tones: number[] = [];
    const toneMap: { [key: string]: number } = {
      'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1,
      'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2,
      'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3,
      'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4,
    };
    
    // Extract tone numbers from pinyin
    const syllables = pinyin.split(' ');
    for (const syllable of syllables) {
      let tone = 0;
      for (const char of syllable) {
        if (toneMap[char]) {
          tone = toneMap[char];
          break;
        }
      }
      // Check for number tone markers
      const numMatch = syllable.match(/(\d)$/);
      if (numMatch) {
        tone = parseInt(numMatch[1]);
      }
      tones.push(tone);
    }
    
    return tones;
  }

  private calculateStrokeCount(hanzi: string): number {
    let count = 0;
    for (const char of hanzi) {
      const charData = this.charData.get(char);
      if (charData?.matches) {
        count += charData.matches.length;
      }
    }
    return count || hanzi.length;
  }

  private mapDifficulty(level: number): 'beginner' | 'intermediate' | 'advanced' {
    if (level <= 2) return 'beginner';
    if (level <= 4) return 'intermediate';
    return 'advanced';
  }

  private enrichRelatedWords(): void {
    // Create a lookup for all words
    const wordLookup = new Map<string, UnifiedEntry>();
    for (const entry of this.entries.values()) {
      wordLookup.set(entry.hanzi, entry);
    }
    
    // Enrich related words with pinyin and definitions
    for (const entry of this.entries.values()) {
      for (const related of [...entry.synonyms, ...entry.antonyms, ...entry.wordFamily]) {
        const found = wordLookup.get(related.hanzi);
        if (found) {
          related.pinyin = found.pinyin;
          related.definition = found.definitions[0] || '';
          related.hskLevel = found.hskLevel;
        }
      }
    }
  }

  private buildIndexes(): void {
    for (const entry of this.entries.values()) {
      // Hanzi index
      const existingHanzi = this.hanziIndex.get(entry.hanzi) || [];
      existingHanzi.push(entry.id);
      this.hanziIndex.set(entry.hanzi, existingHanzi);
      
      // Pinyin index (without tones)
      const pinyinNoTones = entry.pinyin.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (c) => {
        const map: { [key: string]: string } = {
          'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
          'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
          'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
          'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
          'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
          'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
        };
        return map[c] || c;
      }).replace(/\d/g, '').toLowerCase();
      
      const existingPinyin = this.pinyinIndex.get(pinyinNoTones) || [];
      existingPinyin.push(entry.id);
      this.pinyinIndex.set(pinyinNoTones, existingPinyin);
      
      // Definition index
      for (const def of entry.definitions) {
        const words = def.toLowerCase().split(/\s+/);
        for (const word of words) {
          const cleanWord = word.replace(/[^a-z]/g, '');
          if (cleanWord.length > 2) {
            const existingDef = this.definitionIndex.get(cleanWord) || [];
            if (!existingDef.includes(entry.id)) {
              existingDef.push(entry.id);
              this.definitionIndex.set(cleanWord, existingDef);
            }
          }
        }
      }
    }
  }

  // Search methods
  search(query: string, options: {
    hskLevel?: number | '7-9';
    partOfSpeech?: string;
    maxResults?: number;
  } = {}): SearchResult[] {
    if (!this.loaded) return [];
    
    const { hskLevel, partOfSpeech, maxResults } = options;
    const normalizedQuery = query.toLowerCase().trim();
    const shouldLimit = typeof maxResults === 'number' && Number.isFinite(maxResults);
    
    // Get all entries first
    let allEntries = Array.from(this.entries.values());
    
    // Apply HSK filter first (for performance)
    if (hskLevel) {
      if (hskLevel === '7-9') {
        allEntries = allEntries.filter(e => e.hskLevel && e.hskLevel >= 7);
      } else {
        allEntries = allEntries.filter(e => e.hskLevel === hskLevel);
      }
    }
    
    // Apply part of speech filter
    if (partOfSpeech && partOfSpeech !== 'all') {
      allEntries = allEntries.filter(e => e.partOfSpeech.includes(partOfSpeech));
    }
    
    // If no search query, return filtered results sorted by HSK level
    if (!normalizedQuery) {
      const sorted = allEntries
        .sort((a, b) => (a.hskLevel || 99) - (b.hskLevel || 99))
        .map(e => ({ entry: e, matchType: 'exact' as const, matchScore: 1 }));

      return shouldLimit ? sorted.slice(0, maxResults) : sorted;
    }
    
    const results = new Map<string, SearchResult>();
    
    // 1. Exact hanzi match (highest priority)
    const exactHanzi = this.hanziIndex.get(query);
    if (exactHanzi) {
      for (const id of exactHanzi) {
        const entry = this.entries.get(id);
        if (entry && this.entryInList(entry, allEntries)) {
          results.set(id, { entry, matchType: 'exact', matchScore: 100 });
        }
      }
    }
    
    // 2. Pinyin match
    const pinyinMatches = this.pinyinIndex.get(normalizedQuery);
    if (pinyinMatches) {
      for (const id of pinyinMatches) {
        if (!results.has(id)) {
          const entry = this.entries.get(id);
          if (entry && this.entryInList(entry, allEntries)) {
            results.set(id, { entry, matchType: 'pinyin', matchScore: 80 });
          }
        }
      }
    }
    
    // 3. Definition match
    const defMatches = this.definitionIndex.get(normalizedQuery);
    if (defMatches) {
      for (const id of defMatches) {
        if (!results.has(id)) {
          const entry = this.entries.get(id);
          if (entry && this.entryInList(entry, allEntries)) {
            results.set(id, { entry, matchType: 'definition', matchScore: 60 });
          }
        }
      }
    }
    
    // 4. Fuzzy hanzi match (contains query)
    for (const entry of allEntries) {
      if (!results.has(entry.id) && entry.hanzi.includes(query) && entry.hanzi !== query) {
        results.set(entry.id, { entry, matchType: 'fuzzy', matchScore: 40 });
      }
    }
    
    // Sort by score and return
    const sortedResults = Array.from(results.values())
      .sort((a, b) => b.matchScore - a.matchScore);

    return shouldLimit ? sortedResults.slice(0, maxResults) : sortedResults;
  }

  private entryInList(entry: UnifiedEntry, list: UnifiedEntry[]): boolean {
    return list.some(e => e.id === entry.id);
  }

  // Get entry by ID
  getEntry(id: string): UnifiedEntry | undefined {
    return this.entries.get(id);
  }

  // Get entry by hanzi
  getEntryByHanzi(hanzi: string): UnifiedEntry | undefined {
    const ids = this.hanziIndex.get(hanzi);
    if (ids && ids.length > 0) {
      return this.entries.get(ids[0]);
    }
    return undefined;
  }

  // Get all entries
  getAllEntries(): UnifiedEntry[] {
    return Array.from(this.entries.values());
  }

  // Get entries by HSK level
  getByHSKLevel(level: number | '7-9'): UnifiedEntry[] {
    let entries: UnifiedEntry[];
    if (level === '7-9') {
      entries = Array.from(this.entries.values()).filter(e => e.hskLevel && e.hskLevel >= 7);
    } else {
      entries = Array.from(this.entries.values()).filter(e => e.hskLevel === level);
    }
    // Sort by frequency or HSK sub-level
    return entries.sort((a, b) => (a.hskLevel || 99) - (b.hskLevel || 99));
  }

  // Get related entries
  getRelatedEntries(hanzi: string): UnifiedEntry[] {
    const entry = this.getEntryByHanzi(hanzi);
    if (!entry) return [];
    
    const related: UnifiedEntry[] = [];
    
    // Add synonyms
    for (const syn of entry.synonyms) {
      const found = this.getEntryByHanzi(syn.hanzi);
      if (found) related.push(found);
    }
    
    // Add antonyms
    for (const ant of entry.antonyms) {
      const found = this.getEntryByHanzi(ant.hanzi);
      if (found) related.push(found);
    }
    
    // Add word family
    for (const word of entry.wordFamily) {
      const found = this.getEntryByHanzi(word.hanzi);
      if (found) related.push(found);
    }
    
    // Add entries with shared characters
    for (const char of entry.hanzi) {
      const ids = this.hanziIndex.get(char);
      if (ids) {
        for (const id of ids) {
          const found = this.entries.get(id);
          if (found && found.hanzi !== entry.hanzi && !related.includes(found)) {
            related.push(found);
          }
        }
      }
    }
    
    return related.slice(0, 20);
  }

  // Get character decomposition
  getCharacterDecomposition(char: string): {
    character: string;
    definition?: string;
    pinyin: string[];
    decomposition: string;
    etymology?: UnifiedEntry['etymology'];
    radical: string;
    strokeCount: number;
  } | null {
    const charData = this.charData.get(char);
    if (!charData) return null;
    
    return {
      character: charData.character,
      definition: charData.definition,
      pinyin: charData.pinyin || [],
      decomposition: charData.decomposition,
      etymology: charData.etymology,
      radical: charData.radical,
      strokeCount: charData.matches?.length || 0
    };
  }

  // Get stroke data for a character
  getStrokeData(char: string): CharacterGraphics | null {
    return this.graphicsData.get(char) || null;
  }

  // Get stroke data for all characters in a word
  getWordStrokeData(hanzi: string): { char: string; strokes: string[]; medians: number[][][] }[] {
    const result: { char: string; strokes: string[]; medians: number[][][] }[] = [];
    
    for (const char of hanzi) {
      const graphics = this.graphicsData.get(char);
      if (graphics) {
        result.push({
          char: graphics.character,
          strokes: graphics.strokes,
          medians: graphics.medians
        });
      }
    }
    
    return result;
  }

  // Check if character has stroke data
  hasStrokeData(char: string): boolean {
    return this.graphicsData.has(char);
  }

  // Get HSK statistics - group 7-9 together
  getHSKStats(): { level: number | '7-9'; label: string; count: number; totalStudied?: number }[] {
    const stats: { [level: string]: number } = {};
    
    for (const entry of this.entries.values()) {
      const level = entry.hskLevel || 0;
      if (level >= 7) {
        stats['7-9'] = (stats['7-9'] || 0) + 1;
      } else if (level > 0) {
        stats[level] = (stats[level] || 0) + 1;
      }
    }
    
    const result: { level: number | '7-9'; label: string; count: number }[] = [];
    
    // Add levels 1-6
    for (let i = 1; i <= 6; i++) {
      if (stats[i]) {
        result.push({ level: i, label: `HSK ${i}`, count: stats[i] });
      }
    }
    
    // Add 7-9 group
    if (stats['7-9']) {
      result.push({ level: '7-9', label: 'HSK 7-9', count: stats['7-9'] });
    }
    
    return result;
  }

  // Get data coverage statistics
  getDataCoverage(): {
    totalWords: number;
    wordsWithStrokeData: number;
    wordsWithEtymology: number;
    singleCharsWithData: number;
    multiCharsWithBreakdown: number;
  } {
    let wordsWithStrokeData = 0;
    let wordsWithEtymology = 0;
    let singleCharsWithData = 0;
    let multiCharsWithBreakdown = 0;
    
    for (const entry of this.entries.values()) {
      // Check if all characters have stroke data
      const allCharsHaveStrokes = entry.hanzi.split('').every(char => this.graphicsData.has(char));
      if (allCharsHaveStrokes) {
        wordsWithStrokeData++;
      }
      
      // Check etymology
      if (entry.etymology || (entry.characterBreakdown?.some(c => c.etymology))) {
        wordsWithEtymology++;
      }
      
      // Single char with data
      if (entry.hanzi.length === 1 && this.charData.has(entry.hanzi)) {
        singleCharsWithData++;
      }
      
      // Multi-char with breakdown
      if (entry.hanzi.length > 1 && entry.characterBreakdown && entry.characterBreakdown.length > 0) {
        multiCharsWithBreakdown++;
      }
    }
    
    return {
      totalWords: this.entries.size,
      wordsWithStrokeData,
      wordsWithEtymology,
      singleCharsWithData,
      multiCharsWithBreakdown
    };
  }

  // Get random entries
  getRandomEntries(count: number, hskLevel?: number | '7-9'): UnifiedEntry[] {
    let entries = Array.from(this.entries.values());
    if (hskLevel !== undefined) {
      if (hskLevel === '7-9') {
        entries = entries.filter(e => e.hskLevel && e.hskLevel >= 7);
      } else {
        entries = entries.filter(e => e.hskLevel === hskLevel);
      }
    }
    return entries.sort(() => Math.random() - 0.5).slice(0, count);
  }

  // Get total count
  getCount(): number {
    return this.entries.size;
  }

  // Check if loaded
  isLoaded(): boolean {
    return this.loaded;
  }
}

export const unifiedDictionary = new UnifiedDictionaryService();
