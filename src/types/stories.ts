export interface StoryWordUsage {
  hanzi: string;
  pinyin: string;
  sentence: string;
  context_meaning: string;
}

export interface StorySentence {
  chinese: string;
  pinyin: string;
  english: string;
}

export interface StoryEntry {
  story_id: string;
  hsk_level: number;
  target_words: string[];
  word_count: number;
  title_chinese: string;
  title_english: string;
  story_chinese: string;
  story_chinese_sentences: string[];
  story_pinyin: string;
  story_pinyin_sentences: string[];
  story_english: string;
  story_english_sentences: string[];
  sentences: StorySentence[];
  word_usage: StoryWordUsage[];
  coverage: number;
  missing_words: string[];
  error?: string;
  parse_error?: string;
}

export interface LevelCoverage {
  total_words: number;
  covered_words: number;
  uncovered_words: Array<{ hanzi: string; pinyin: string; meaning: string; level: number; pos: string[] }>;
  coverage_ratio: number;
}

export interface StoryDatasetMeta {
  generated_at: string;
  model: string;
  model_endpoint: string;
  total_stories: number;
  total_hsk_words: number;
  words_covered: number;
  overall_coverage: number;
  levels: number[];
  notes: string;
}

export interface StoryDataset {
  meta: StoryDatasetMeta;
  coverage_by_level: Record<number, LevelCoverage>;
  stories: StoryEntry[];
}
