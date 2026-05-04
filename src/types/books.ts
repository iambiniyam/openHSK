export interface BookSentence {
  chinese: string;
  pinyin: string;
  english: string;
}

export interface BookWordUsage {
  hanzi: string;
  pinyin: string;
  context_meaning: string;
  chapter_number: number;
  sentence: string;
}

export interface BookChapter {
  chapter_number: number;
  title_chinese: string;
  title_english: string;
  sentences: BookSentence[];
  words_introduced: string[];
  word_count: number;
  recap_chinese?: string;
  recap_english?: string;
}

export interface Book {
  book_id: string;
  hsk_level: number;
  genre: string;
  genre_label_chinese: string;
  genre_label_english: string;
  title_chinese: string;
  title_english: string;
  description_chinese: string;
  description_english: string;
  target_words: string[];
  word_count: number;
  coverage: number;
  missing_words: string[];
  total_chapters: number;
  chapters: BookChapter[];
  word_usage: BookWordUsage[];
  char_count: number;
  error?: string;
}

export interface BookDatasetMeta {
  generated_at: string;
  model: string;
  model_endpoint: string;
  total_books: number;
  total_chapters: number;
  total_hsk_words: number;
  words_covered: number;
  overall_coverage: number;
  levels: number[];
  genres: string[];
  notes: string;
}

export interface LevelCoverage {
  total_words: number;
  covered_words: number;
  uncovered_words: Array<{
    hanzi: string;
    pinyin: string;
    meaning: string;
    level: number;
    pos: string[];
  }>;
  coverage_ratio: number;
}

export interface BookDataset {
  meta: BookDatasetMeta;
  coverage_by_level: Record<number, LevelCoverage>;
  books: Book[];
}
