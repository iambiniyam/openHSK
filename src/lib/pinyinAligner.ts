/**
 * Aligns pinyin syllables to Chinese characters.
 *
 * Chinese syllables generally map 1:1 to characters, but there are edge cases:
 * - "er" (儿) as a retroflex suffix attaches to the previous syllable
 * - Some transliterations may have unusual mappings
 *
 * This utility splits pinyin by spaces and aligns each to a character.
 */

export interface AlignedCharacter {
  char: string;
  pinyin: string;
}

/**
 * Align pinyin syllables to characters.
 *
 * Strategy:
 * 1. Split pinyin by spaces to get syllables
 * 2. Map each syllable to one character
 * 3. Handle 'r' suffix (retroflex 儿) by attaching to previous character
 */
export function alignPinyinToChars(text: string, pinyin: string): AlignedCharacter[] {
  const chars = Array.from(text.trim());
  const syllables = pinyin.trim().split(/\s+/);

  const result: AlignedCharacter[] = [];
  let syllableIndex = 0;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    // Skip non-Chinese characters (punctuation, spaces, numbers, etc.)
    if (!isChineseChar(char)) {
      result.push({ char, pinyin: '' });
      continue;
    }

    // Check if next syllable is 'r' (retroflex suffix) - attach to current
    const currentSyllable = syllables[syllableIndex] || '';
    const nextSyllable = syllables[syllableIndex + 1];

    if (nextSyllable === 'r' || nextSyllable === 'er') {
      result.push({ char, pinyin: `${currentSyllable}${nextSyllable}` });
      syllableIndex += 2;
    } else {
      result.push({ char, pinyin: currentSyllable });
      syllableIndex += 1;
    }
  }

  return result;
}

function isChineseChar(char: string): boolean {
  const code = char.charCodeAt(0);
  // CJK Unified Ideographs: 4E00-9FFF
  // CJK Unified Ideographs Extension A: 3400-4DBF
  // CJK Compatibility Ideographs: F900-FAFF
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff)
  );
}

/**
 * Render aligned characters with ruby pinyin annotations.
 * Returns an array of <ruby> element strings or JSX-friendly objects.
 */
export function renderRubyText(aligned: AlignedCharacter[]): { char: string; pinyin: string }[] {
  return aligned;
}
