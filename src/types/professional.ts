export interface TechVocabCategory {
  id: string;
  label_en: string;
  label_zh: string;
  description: string;
  term_count: number;
}

export interface TechVocabTerm {
  id: string;
  category: string;
  english: string;
  chinese: string;
  pinyin: string;
  abbreviation?: string;
  definition_en: string;
  definition_zh: string;
  example_zh: string;
  example_pinyin: string;
  example_en: string;
  hsk_level_estimate: number;
}

export interface VocabDatasetMeta {
  generated_at: string;
  model: string;
  total_terms: number;
  categories: TechVocabCategory[];
}

export interface VocabDataset {
  meta: VocabDatasetMeta;
  terms: TechVocabTerm[];
}

export interface DialogueLine {
  speaker: string;
  role: string;
  chinese: string;
  pinyin: string;
  english: string;
}

export interface DialogueKeyVocab {
  chinese: string;
  pinyin: string;
  english: string;
  context: string;
}

export interface DialogueScenario {
  id: string;
  title_en: string;
  title_zh: string;
  category: string;
  description_en: string;
  description_zh: string;
  lines: DialogueLine[];
  key_vocabulary: DialogueKeyVocab[];
}

export interface DialogueDatasetMeta {
  generated_at: string;
  model: string;
  total_scenarios: number;
  categories: string[];
}

export interface DialogueDataset {
  meta: DialogueDatasetMeta;
  scenarios: DialogueScenario[];
}
