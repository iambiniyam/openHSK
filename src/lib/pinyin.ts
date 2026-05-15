/**
 * Pinyin tone stripping utility.
 * Converts accented pinyin (e.g. "nǐ hǎo") to plain ASCII ("ni hao").
 * Also strips numeric tone markers (e.g. "ni3 hao3" → "ni hao").
 */

const TONE_MAP: Record<string, string> = {
  'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
  'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
  'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
  'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
  'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
  'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
};

export function stripTones(pinyin: string): string {
  return pinyin
    .replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, (c) => TONE_MAP[c] || c)
    .replace(/\d/g, '')
    .toLowerCase()
    .trim();
}
