import type { HSKEntry } from '@/types/hsk';
import { loadDataProgressively, type ProgressCallback } from '@/lib/progressiveLoader';
import { yieldToMain } from '@/lib/yieldToMain';
import { stripTones } from '@/lib/pinyin';

export interface UnifiedEntry {
  id: string;
  hanzi: string;
  traditional?: string;
  pinyin: string;
  pinyinTones: number[];
  definitions: string[];
  hskLevel?: number;
  partOfSpeech: string[];
  examples: ExampleSentence[];
  synonyms: RelatedWord[];
  antonyms: RelatedWord[];
  collocations: string[];
  wordFamily: RelatedWord[];
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

class UnifiedDictionaryService {
  private entries: Map<string, UnifiedEntry> = new Map();
  private hanziIndex: Map<string, string[]> = new Map();
  private pinyinIndex: Map<string, string[]> = new Map();
  private definitionIndex: Map<string, string[]> = new Map();
  private hskData: HSKEntry[] = [];
  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private loadAbortController: AbortController | null = null;
  private searchCache = new Map<string, SearchResult[]>();
  private readonly SEARCH_CACHE_MAX_SIZE = 50;

  async initialize(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.loadAllData();
    return this.loadPromise;
  }

  async initializeWithProgress(onProgress: ProgressCallback): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadAbortController = new AbortController();
    this.loadPromise = this.loadAllDataProgressive(onProgress, this.loadAbortController.signal);
    return this.loadPromise;
  }

  abortLoad(): void {
    this.loadAbortController?.abort();
    this.loadAbortController = null;
    this.loadPromise = null;
  }

  private async loadAllData(): Promise<void> {
    try {
      const data = await loadDataProgressively(() => {});
      this.hskData = [...(data.hskPart1 as HSKEntry[]), ...(data.hskPart2 as HSKEntry[])];
      await this.buildUnifiedEntries();
      await this.buildIndexes();
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      throw error;
    }
  }

  private async loadAllDataProgressive(onProgress: ProgressCallback, signal: AbortSignal): Promise<void> {
    try {
      const data = await loadDataProgressively(onProgress, signal);
      this.hskData = [...(data.hskPart1 as HSKEntry[]), ...(data.hskPart2 as HSKEntry[])];
      await this.buildUnifiedEntries();
      await this.buildIndexes();
      this.loaded = true;
    } catch (error) {
      console.error('Failed to load dictionary:', error);
      throw error;
    }
  }

  private async buildUnifiedEntries(): Promise<void> {
    for (let i = 0; i < this.hskData.length; i++) {
      const hskEntry = this.hskData[i];
      const hanzi = hskEntry.source.hanzi;
      const id = hskEntry.entry_id;
      const pinyinTones = this.extractTones(hskEntry.source.pinyin);

      const unified: UnifiedEntry = {
        id,
        hanzi,
        traditional: hskEntry.source.traditional,
        pinyin: hskEntry.source.pinyin,
        pinyinTones,
        definitions: hskEntry.core.english_definitions,
        hskLevel: hskEntry.source.level,
        partOfSpeech: hskEntry.core.part_of_speech,
        examples: hskEntry.examples.map(ex => ({
          chinese: ex.chinese,
          pinyin: ex.pinyin,
          english: ex.english,
          source: 'OpenHSK',
          difficulty: this.mapDifficulty(ex.difficulty_level),
        })),
        synonyms: hskEntry.related_vocabulary.synonyms.map(s => ({
          hanzi: s.word, pinyin: '', definition: s.note || ''
        })),
        antonyms: hskEntry.related_vocabulary.antonyms.map(a => ({
          hanzi: a.word, pinyin: '', definition: a.note || ''
        })),
        collocations: hskEntry.usage_grammar?.collocations || [],
        wordFamily: hskEntry.related_vocabulary.word_family.map(w => ({
          hanzi: w.word, pinyin: '', definition: w.note || ''
        })),
        mnemonic: hskEntry.learning_aids?.mnemonic,
        commonMistakes: hskEntry.usage_grammar?.common_mistakes?.map(m => m.mistake),
        usageNotes: hskEntry.usage_grammar?.register?.join(', '),
      };

      this.entries.set(id, unified);
      if (i % 500 === 499) await yieldToMain();
    }

    await this.enrichRelatedWords();
  }

  private async enrichRelatedWords(): Promise<void> {
    const wordLookup = new Map<string, UnifiedEntry>();
    const entriesArray = Array.from(this.entries.values());
    for (let i = 0; i < entriesArray.length; i++) {
      wordLookup.set(entriesArray[i].hanzi, entriesArray[i]);
      if (i % 500 === 499) await yieldToMain();
    }

    for (let i = 0; i < entriesArray.length; i++) {
      const entry = entriesArray[i];
      for (const related of [...entry.synonyms, ...entry.antonyms, ...entry.wordFamily]) {
        const found = wordLookup.get(related.hanzi);
        if (found) {
          related.pinyin = found.pinyin;
          related.definition = found.definitions[0] || '';
          related.hskLevel = found.hskLevel;
        }
      }
      if (i % 500 === 499) await yieldToMain();
    }
  }

  private async buildIndexes(): Promise<void> {
    const entriesArray = Array.from(this.entries.values());
    for (let i = 0; i < entriesArray.length; i++) {
      const entry = entriesArray[i];

      const existingHanzi = this.hanziIndex.get(entry.hanzi) || [];
      existingHanzi.push(entry.id);
      this.hanziIndex.set(entry.hanzi, existingHanzi);

      const pinyinNoTones = entry.pinyin.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (c) => {
        const map: Record<string, string> = {
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

      if (i % 500 === 499) await yieldToMain();
    }
  }

  search(query: string, options: {
    hskLevel?: number | '7-9';
    partOfSpeech?: string;
    maxResults?: number;
  } = {}): SearchResult[] {
    if (!this.loaded) return [];

    const { hskLevel, partOfSpeech, maxResults } = options;
    const normalizedQuery = query.toLowerCase().trim();
    const tonelessQuery = stripTones(normalizedQuery);
    const shouldLimit = typeof maxResults === 'number';

    const cacheKey = `${normalizedQuery}::${hskLevel ?? 'all'}::${partOfSpeech ?? 'all'}::${maxResults ?? 'all'}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached;

    let allEntries = Array.from(this.entries.values());

    if (hskLevel) {
      if (hskLevel === '7-9') {
        allEntries = allEntries.filter(e => e.hskLevel && e.hskLevel >= 7);
      } else {
        allEntries = allEntries.filter(e => e.hskLevel === hskLevel);
      }
    }

    if (partOfSpeech && partOfSpeech !== 'all') {
      allEntries = allEntries.filter(e => e.partOfSpeech.includes(partOfSpeech));
    }

    if (!normalizedQuery) {
      const sorted = allEntries
        .sort((a, b) => (a.hskLevel || 99) - (b.hskLevel || 99))
        .map(e => ({ entry: e, matchType: 'exact' as const, matchScore: 1 }));
      const result = shouldLimit ? sorted.slice(0, maxResults) : sorted;
      this.setSearchCache(cacheKey, result);
      return result;
    }

    const results = new Map<string, SearchResult>();

    const exactHanzi = this.hanziIndex.get(query);
    if (exactHanzi) {
      for (const id of exactHanzi) {
        const entry = this.entries.get(id);
        if (entry && this.entryInList(entry, allEntries)) {
          results.set(id, { entry, matchType: 'exact', matchScore: 100 });
        }
      }
    }

    const pinyinMatches = this.pinyinIndex.get(tonelessQuery);
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

    if (tonelessQuery.length >= 2 && !results.has(tonelessQuery)) {
      for (const entry of allEntries) {
        if (!results.has(entry.id)) {
          const entryToneless = stripTones(entry.pinyin);
          if (entryToneless.startsWith(tonelessQuery)) {
            results.set(entry.id, { entry, matchType: 'pinyin', matchScore: 70 });
          }
        }
      }
    }

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

    for (const entry of allEntries) {
      if (!results.has(entry.id) && entry.hanzi.includes(normalizedQuery) && entry.hanzi !== normalizedQuery) {
        results.set(entry.id, { entry, matchType: 'fuzzy', matchScore: 40 });
      }
    }

    const sortedResults = Array.from(results.values())
      .sort((a, b) => b.matchScore - a.matchScore);

    const result = shouldLimit ? sortedResults.slice(0, maxResults) : sortedResults;
    this.setSearchCache(cacheKey, result);
    return result;
  }

  private setSearchCache(key: string, results: SearchResult[]): void {
    if (this.searchCache.size >= this.SEARCH_CACHE_MAX_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey !== undefined) this.searchCache.delete(firstKey);
    }
    this.searchCache.set(key, results);
  }

  private entryInList(entry: UnifiedEntry, list: UnifiedEntry[]): boolean {
    return list.some(e => e.id === entry.id);
  }

  getEntry(id: string): UnifiedEntry | undefined {
    return this.entries.get(id);
  }

  getEntryByHanzi(hanzi: string): UnifiedEntry | undefined {
    const ids = this.hanziIndex.get(hanzi);
    if (ids && ids.length > 0) return this.entries.get(ids[0]);
    return undefined;
  }

  getAllEntries(): UnifiedEntry[] {
    return Array.from(this.entries.values());
  }

  getByHSKLevel(level: number | '7-9'): UnifiedEntry[] {
    let entries: UnifiedEntry[];
    if (level === '7-9') {
      entries = Array.from(this.entries.values()).filter(e => e.hskLevel && e.hskLevel >= 7);
    } else {
      entries = Array.from(this.entries.values()).filter(e => e.hskLevel === level);
    }
    return entries.sort((a, b) => (a.hskLevel || 99) - (b.hskLevel || 99));
  }

  getRelatedEntries(hanzi: string): UnifiedEntry[] {
    const entry = this.getEntryByHanzi(hanzi);
    if (!entry) return [];

    const baseCharSet = new Set(entry.hanzi.split(''));
    const scored = new Map<string, { entry: UnifiedEntry; score: number }>();

    const addCandidate = (candidate: UnifiedEntry | undefined, baseScore: number): void => {
      if (!candidate || candidate.id === entry.id) return;
      const candidateChars = new Set(candidate.hanzi.split(''));
      let sharedChars = 0;
      for (const char of candidateChars) {
        if (baseCharSet.has(char)) sharedChars += 1;
      }
      let score = baseScore + sharedChars * 12;
      if (entry.hskLevel && candidate.hskLevel && entry.hskLevel === candidate.hskLevel) score += 15;
      if (entry.partOfSpeech.length > 0 && candidate.partOfSpeech.length > 0 &&
          entry.partOfSpeech.some(pos => candidate.partOfSpeech.includes(pos))) score += 8;
      const existing = scored.get(candidate.id);
      if (!existing || score > existing.score) scored.set(candidate.id, { entry: candidate, score });
    };

    for (const syn of entry.synonyms) addCandidate(this.getEntryByHanzi(syn.hanzi), 120);
    for (const ant of entry.antonyms) addCandidate(this.getEntryByHanzi(ant.hanzi), 110);
    for (const word of entry.wordFamily) addCandidate(this.getEntryByHanzi(word.hanzi), 95);

    for (const char of baseCharSet) {
      const ids = this.hanziIndex.get(char);
      if (!ids) continue;
      for (const id of ids) addCandidate(this.entries.get(id), 60);
    }

    return Array.from(scored.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.entry.hskLevel || 99) - (b.entry.hskLevel || 99);
      })
      .slice(0, 24)
      .map(item => item.entry);
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  private extractTones(pinyin: string): number[] {
    const tones: number[] = [];
    const toneMap: Record<string, number> = {
      'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1,
      'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2,
      'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3,
      'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4,
    };
    const syllables = pinyin.split(' ');
    for (const syllable of syllables) {
      let tone = 0;
      for (const char of syllable) {
        if (toneMap[char]) { tone = toneMap[char]; break; }
      }
      const numMatch = syllable.match(/(\d)$/);
      if (numMatch) tone = parseInt(numMatch[1]);
      tones.push(tone);
    }
    return tones;
  }

  private mapDifficulty(level: number): 'beginner' | 'intermediate' | 'advanced' {
    if (level <= 2) return 'beginner';
    if (level <= 4) return 'intermediate';
    return 'advanced';
  }

}

export const unifiedDictionary = new UnifiedDictionaryService();
