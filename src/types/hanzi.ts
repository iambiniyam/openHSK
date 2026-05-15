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
  strokes: string[];
  medians: number[][][];
}
