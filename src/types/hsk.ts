export interface HSKExample {
  difficulty_level: number;
  difficulty_label: string;
  chinese: string;
  pinyin: string;
  english: string;
}

export interface HSKVocabularyItem {
  word: string;
  note?: string;
}

export interface HSKWordBreakdown {
  character: string;
  components: string[];
  literal_hint: string;
  etymology_hint: string;
}

export interface HSKCommonMistake {
  mistake: string;
  correction: string;
  note: string;
}

export interface HSKCharacterInsights {
  word_breakdown: HSKWordBreakdown[];
}

export interface HSKUsageGrammar {
  common_patterns: string[];
  collocations: string[];
  register: string[];
  common_mistakes: HSKCommonMistake[];
}

export interface HSKLearningAids {
  mnemonic: string;
  distinguish_tips: {
    similar_word: string;
    tip: string;
  }[];
}

export interface HSKRelatedVocabulary {
  synonyms: HSKVocabularyItem[];
  antonyms: HSKVocabularyItem[];
  word_family: HSKVocabularyItem[];
}

export interface HSKSource {
  hanzi: string;
  traditional: string;
  pinyin: string;
  meaning: string;
  level: number;
  hskVersion: string;
  levelLabel: string;
}

export interface HSKCore {
  simplified: string;
  traditional: string;
  pinyin: string;
  part_of_speech: string[];
  english_definitions: string[];
}

export interface HSKEntry {
  entry_id: string;
  source_index: number;
  source: HSKSource;
  core: HSKCore;
  examples: HSKExample[];
  related_vocabulary: HSKRelatedVocabulary;
  usage_grammar: HSKUsageGrammar;
  character_insights: HSKCharacterInsights;
  learning_aids: HSKLearningAids;
}

export interface StudyProgress {
  entryId: string;
  level: number;
  lastReviewed: number;
  nextReview: number;
  confidence: number;
  reviewCount: number;
  correctCount: number;
}

export interface UserStats {
  totalStudied: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string;
  levelProgress: { [level: number]: { studied: number; total: number } };
}

export type ViewMode = 'dashboard' | 'vocabulary' | 'character' | 'study' | 'graph' | 'progress';
