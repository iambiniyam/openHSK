/**
 * build-hsk-book.mjs — Generate beautiful, interactive HSK learning books
 *
 * Usage:
 *   node scripts/data/build-hsk-book.mjs                # Generate all levels (1-7)
 *   node scripts/data/build-hsk-book.mjs --level=1       # Level 1 only
 *   node scripts/data/build-hsk-book.mjs --levels=1,2,3  # Levels 1, 2, 3
 *   node scripts/data/build-hsk-book.mjs --format=html   # HTML with TTS (default)
 *
 * Output: out/hsk-level-{N}.html (per level)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const OUT_DIR = join(ROOT, 'out');

const HSK_LEVEL_COLORS = {
  1: { hex: '#22c55e', name: 'Green' },
  2: { hex: '#3b82f6', name: 'Blue' },
  3: { hex: '#eab308', name: 'Amber' },
  4: { hex: '#f97316', name: 'Orange' },
  5: { hex: '#a855f7', name: 'Purple' },
  6: { hex: '#ec4899', name: 'Pink' },
  7: { hex: '#f43f5e', name: 'Rose' },
};

const POS_ORDER = [
  'noun', 'verb', 'adjective', 'adverb', 'phrase', 'idiom',
  'pronoun', 'preposition', 'conjunction', 'numeral',
  'measure word', 'classifier', 'particle', 'suffix', 'prefix',
  'interjection', 'proper noun', 'time expression',
];

const POS_LABELS = {
  noun: 'Nouns',
  verb: 'Verbs',
  adjective: 'Adjectives',
  adverb: 'Adverbs',
  phrase: 'Phrases & Expressions',
  idiom: 'Idioms',
  pronoun: 'Pronouns',
  preposition: 'Prepositions',
  conjunction: 'Conjunctions',
  numeral: 'Numerals',
  'measure word': 'Measure Words',
  classifier: 'Classifiers',
  particle: 'Particles',
  suffix: 'Suffixes',
  prefix: 'Prefixes',
  interjection: 'Interjections',
  'proper noun': 'Proper Nouns & Surnames',
  'time expression': 'Time Expressions',
};

function posScore(pos) {
  const idx = POS_ORDER.indexOf(pos);
  return idx >= 0 ? idx : 99;
}

function loadData() {
  const part1 = JSON.parse(readFileSync(join(ROOT, 'public', 'hsk3.0.part1.json'), 'utf-8'));
  const part2 = JSON.parse(readFileSync(join(ROOT, 'public', 'hsk3.0.part2.json'), 'utf-8'));
  return [...part1, ...part2];
}

function groupByLevel(entries) {
  const groups = {};
  for (const e of entries) {
    const level = e.source.level;
    if (!groups[level]) groups[level] = [];
    groups[level].push(e);
  }
  return groups;
}

function groupByPOS(entries) {
  const groups = {};
  for (const e of entries) {
    const pos = e.core.part_of_speech[0] || 'other';
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(e);
  }
  return groups;
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateToneHtml(pinyin) {
  if (!pinyin) return '';
  const toneMap = {
    'ā': '<span class="tone1">ā</span>', 'á': '<span class="tone2">á</span>',
    'ǎ': '<span class="tone3">ǎ</span>', 'à': '<span class="tone4">à</span>',
    'ē': '<span class="tone1">ē</span>', 'é': '<span class="tone2">é</span>',
    'ě': '<span class="tone3">ě</span>', 'è': '<span class="tone4">è</span>',
    'ī': '<span class="tone1">ī</span>', 'í': '<span class="tone2">í</span>',
    'ǐ': '<span class="tone3">ǐ</span>', 'ì': '<span class="tone4">ì</span>',
    'ō': '<span class="tone1">ō</span>', 'ó': '<span class="tone2">ó</span>',
    'ǒ': '<span class="tone3">ǒ</span>', 'ò': '<span class="tone4">ò</span>',
    'ū': '<span class="tone1">ū</span>', 'ú': '<span class="tone2">ú</span>',
    'ǔ': '<span class="tone3">ǔ</span>', 'ù': '<span class="tone4">ù</span>',
    'ǖ': '<span class="tone1">ǖ</span>', 'ǘ': '<span class="tone2">ǘ</span>',
    'ǚ': '<span class="tone3">ǚ</span>', 'ǜ': '<span class="tone4">ǜ</span>',
  };
  let html = '';
  for (const ch of pinyin) {
    html += toneMap[ch] || escapeHtml(ch);
  }
  return html;
}

function generateEntryHTML(entry, index) {
  const { source, core, examples, related_vocabulary, usage_grammar, character_insights, learning_aids } = entry;
  const level = source.level;
  const color = HSK_LEVEL_COLORS[level]?.hex || '#666';
  const posBadges = core.part_of_speech.map(p =>
    `<span class="pos-badge">${escapeHtml(p)}</span>`
  ).join('');
  const defs = core.english_definitions.map(d =>
    `<li>${escapeHtml(d)}</li>`
  ).join('');

  // Examples
  let examplesHtml = '';
  if (examples && examples.length) {
    examplesHtml = examples.map((ex, i) => {
      const labels = ['easy', 'medium', 'hard'];
      return `
        <div class="example">
          <span class="difficulty ${labels[i]}">${escapeHtml(ex.difficulty_label)}</span>
          <div class="ex-chinese">${escapeHtml(ex.chinese)}</div>
          <div class="ex-pinyin">${generateToneHtml(ex.pinyin)}</div>
          <div class="ex-english">${escapeHtml(ex.english)}</div>
        </div>`;
    }).join('');
  }

  // Mnemonic
  let mnemonicHtml = '';
  if (learning_aids?.mnemonic) {
    mnemonicHtml = `
      <div class="section mnemonic">
        <h3>💡 Mnemonic</h3>
        <p>${escapeHtml(learning_aids.mnemonic)}</p>
      </div>`;
  }

  // Character breakdown
  let breakdownHtml = '';
  if (character_insights?.word_breakdown?.length) {
    breakdownHtml = character_insights.word_breakdown.map(b => `
      <div class="section breakdown">
        <h3>🔤 Character Breakdown: ${escapeHtml(b.character)}</h3>
        <p><strong>Components:</strong> ${b.components.map(c => escapeHtml(c)).join(' + ')}</p>
        <p><strong>Literal:</strong> ${escapeHtml(b.literal_hint)}</p>
        ${b.etymology_hint ? `<p><strong>Etymology:</strong> ${escapeHtml(b.etymology_hint)}</p>` : ''}
      </div>
    `).join('');
  }

  // Common mistakes
  let mistakesHtml = '';
  if (usage_grammar?.common_mistakes?.length) {
    mistakesHtml = usage_grammar.common_mistakes.map(m => `
      <div class="section mistake">
        <h3>⚠️ Common Mistake</h3>
        <p><strong>✗ ${escapeHtml(m.mistake)}</strong></p>
        <p><strong>✓ ${escapeHtml(m.correction)}</strong></p>
        <p class="mistake-note">${escapeHtml(m.note)}</p>
      </div>
    `).join('');
  }

  // Collocations
  let collocationsHtml = '';
  if (usage_grammar?.collocations?.length) {
    collocationsHtml = `
      <div class="section collocations">
        <h3>📎 Collocations</h3>
        ${usage_grammar.collocations.map(c => `<span class="collocation-chip">${escapeHtml(c)}</span>`).join('')}
      </div>`;
  }

  // Grammar patterns
  let patternsHtml = '';
  if (usage_grammar?.common_patterns?.length) {
    patternsHtml = `
      <div class="section patterns">
        <h3>📐 Patterns</h3>
        <ul>${usage_grammar.common_patterns.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
      </div>`;
  }

  // Related words
  let relatedHtml = '';
  const rels = [];
  if (related_vocabulary?.synonyms?.length) {
    rels.push({ label: 'Synonyms', words: related_vocabulary.synonyms, cls: 'synonyms' });
  }
  if (related_vocabulary?.antonyms?.length) {
    rels.push({ label: 'Antonyms', words: related_vocabulary.antonyms, cls: 'antonyms' });
  }
  if (related_vocabulary?.word_family?.length) {
    rels.push({ label: 'Word Family', words: related_vocabulary.word_family, cls: 'word-family' });
  }
  if (rels.length) {
    relatedHtml = rels.map(r => `
      <div class="section related ${r.cls}">
        <h3>🔗 ${r.label}</h3>
        ${r.words.map(w => `
          <div class="related-word">
            <span class="rw-hanzi">${escapeHtml(w.word)}</span>
            ${w.note ? `<span class="rw-note">${escapeHtml(w.note)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  // Distinguish tips
  let tipsHtml = '';
  if (learning_aids?.distinguish_tips?.length) {
    tipsHtml = learning_aids.distinguish_tips.map(t => `
      <div class="section tip">
        <h3>🎯 Compare: ${escapeHtml(t.similar_word)}</h3>
        <p>${escapeHtml(t.tip)}</p>
      </div>
    `).join('');
  }

  return `
    <article class="word-entry" id="entry-${escapeHtml(entry.entry_id)}" data-level="${level}" style="--accent: ${color}">
      <div class="entry-header">
        <div class="hanzi-section">
          <h2 class="hanzi" lang="zh">${escapeHtml(source.hanzi)}</h2>
          ${source.traditional !== source.hanzi ? `<span class="traditional" lang="zh">${escapeHtml(source.traditional)}</span>` : ''}
        </div>
        <div class="pinyin-section">
          <div class="pinyin" lang="zh-Latn">${generateToneHtml(source.pinyin)}</div>
          <button class="audio-btn" onclick="speak('${escapeHtml(source.hanzi)}')" title="Listen to pronunciation" aria-label="Play audio">🔊</button>
        </div>
        <div class="meta-row">
          ${posBadges}
          <span class="level-badge" style="background:${color}22; color:${color}; border-color:${color}44;">HSK ${source.level}${source.level >= 7 ? ' (9)' : ''}</span>
        </div>
        <ul class="definitions">${defs}</ul>
      </div>

      <div class="entry-body">
        ${examplesHtml ? `
          <div class="section examples">
            <h3>📝 Examples</h3>
            ${examplesHtml}
          </div>` : ''}
        ${mnemonicHtml}
        ${breakdownHtml}
        ${patternsHtml}
        ${collocationsHtml}
        ${mistakesHtml}
        ${relatedHtml}
        ${tipsHtml}
      </div>

      <div class="entry-footer">
        <span class="entry-number">#${index + 1}</span>
        <button class="audio-btn-sm" onclick="speak('${escapeHtml(source.hanzi)}')">🔊 Play</button>
      </div>
    </article>`;
}

function generateCSS() {
  return `
  :root {
    --font-sans: 'Inter', 'Segoe UI Variable', system-ui, -apple-system, sans-serif;
    --font-cn: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    --font-serif: 'Noto Serif SC', 'STSong', serif;
    --page-width: 1200px;
    --bg: #fafaf9;
    --surface: #ffffff;
    --text: #1c1917;
    --text-secondary: #78716c;
    --text-tertiary: #a8a29e;
    --border: #e7e5e4;
    --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-lg: 0 10px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);
    --radius: 16px;
    --radius-sm: 8px;
  }

  .dark {
    --bg: #0c0a09;
    --surface: #1c1917;
    --text: #e7e5e4;
    --text-secondary: #a8a29e;
    --text-tertiary: #78716c;
    --border: #292524;
    --shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
    --shadow-lg: 0 10px 25px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.2);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { font-size: 16px; scroll-behavior: smooth; }
  body {
    font-family: var(--font-sans);
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  .book-container {
    max-width: var(--page-width);
    margin: 0 auto;
    padding: 0 24px;
  }

  /* ── Cover / Title Page ── */
  .book-cover {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 80px 24px;
    position: relative;
    overflow: hidden;
  }
  .book-cover::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 0%, var(--accent-soft) 0%, transparent 70%);
    opacity: 0.3;
  }
  .cover-badge {
    display: inline-block;
    padding: 8px 24px;
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: var(--accent);
    color: white;
    margin-bottom: 32px;
  }
  .cover-title {
    font-size: clamp(3rem, 8vw, 6rem);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.03em;
    margin-bottom: 16px;
    background: linear-gradient(135deg, var(--text) 0%, var(--text-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .cover-subtitle {
    font-size: clamp(1.25rem, 3vw, 2rem);
    color: var(--text-secondary);
    font-weight: 400;
    margin-bottom: 48px;
  }
  .cover-stats {
    display: flex;
    gap: 48px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .cover-stat {
    text-align: center;
  }
  .cover-stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent);
  }
  .cover-stat-label {
    font-size: 0.875rem;
    color: var(--text-tertiary);
    margin-top: 4px;
  }

  /* ── Navigation Bar ── */
  .nav-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(12px);
    background: color-mix(in srgb, var(--surface) 85%, transparent);
  }
  .nav-inner {
    max-width: var(--page-width);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
    gap: 12px;
  }
  .nav-title {
    font-weight: 700;
    font-size: 1rem;
    white-space: nowrap;
  }
  .nav-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .nav-btn {
    padding: 6px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text);
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .nav-btn:hover { background: var(--border); }
  .nav-btn.primary { background: var(--accent); color: white; border-color: var(--accent); }
  .nav-btn.primary:hover { opacity: 0.9; }

  /* ── Level Divider ── */
  .level-divider {
    text-align: center;
    padding: 60px 24px 40px;
    border-bottom: 2px solid var(--border);
    margin-bottom: 48px;
  }
  .level-divider h2 {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--accent);
    margin-bottom: 8px;
  }
  .level-divider p {
    color: var(--text-secondary);
    font-size: 1.05rem;
  }

  /* ── POS Section ── */
  .pos-section {
    margin-bottom: 48px;
  }
  .pos-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 24px;
    cursor: pointer;
    user-select: none;
    transition: all 0.15s ease;
  }
  .pos-header:hover { border-color: var(--accent); }
  .pos-header h3 {
    font-size: 1.15rem;
    font-weight: 600;
  }
  .pos-count {
    margin-left: auto;
    font-size: 0.875rem;
    color: var(--text-tertiary);
    background: var(--bg);
    padding: 2px 10px;
    border-radius: 999px;
  }
  .pos-toggle {
    font-size: 1.25rem;
    color: var(--text-tertiary);
    transition: transform 0.2s ease;
  }
  .pos-section.collapsed .pos-toggle { transform: rotate(-90deg); }
  .pos-section.collapsed .pos-entries { display: none; }

  /* ── Word Entry Card ── */
  .word-entry {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 32px;
    margin-bottom: 20px;
    box-shadow: var(--shadow);
    transition: box-shadow 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  .word-entry::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: var(--accent);
    border-radius: 0 2px 2px 0;
  }
  .word-entry:hover { box-shadow: var(--shadow-lg); }

  .entry-header { margin-bottom: 20px; }

  .hanzi-section {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 4px;
  }
  .hanzi {
    font-size: 2.5rem;
    font-weight: 700;
    font-family: var(--font-cn);
    line-height: 1.2;
    color: var(--text);
  }
  .traditional {
    font-size: 1.5rem;
    font-family: var(--font-cn);
    color: var(--text-tertiary);
  }

  .pinyin-section {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .pinyin {
    font-size: 1.25rem;
    color: var(--text-secondary);
    font-weight: 500;
  }
  .tone1 { color: #ef4444; }
  .tone2 { color: #f97316; }
  .tone3 { color: #22c55e; }
  .tone4 { color: #3b82f6; }

  .audio-btn {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .audio-btn:hover { transform: scale(1.1); opacity: 0.9; }
  .audio-btn:active { transform: scale(0.95); }
  .audio-btn.playing { animation: pulse-audio 1s ease-in-out infinite; }

  @keyframes pulse-audio {
    0%, 100% { box-shadow: 0 0 0 0 var(--accent); }
    50% { box-shadow: 0 0 0 8px transparent; }
  }

  .meta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
  }
  .pos-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 10px;
    border-radius: 999px;
    background: var(--bg);
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }
  .level-badge {
    font-size: 0.6875rem;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1px solid;
    margin-left: auto;
  }

  .definitions {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .definitions li {
    display: inline-block;
    padding: 4px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 0.9375rem;
    color: var(--text);
  }

  /* ── Entry Body Sections ── */
  .entry-body { margin-bottom: 16px; }
  .section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
  .section h3 {
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
    margin-bottom: 10px;
  }
  .section p, .section li {
    font-size: 0.9375rem;
    line-height: 1.7;
    color: var(--text);
  }

  /* Examples */
  .examples .example {
    padding: 12px 16px;
    border-left: 3px solid var(--border);
    margin-bottom: 12px;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    position: relative;
  }
  .example .difficulty {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 1px 8px;
    border-radius: 999px;
  }
  .difficulty.easy { background: #22c55e22; color: #22c55e; }
  .difficulty.medium { background: #f9731622; color: #f97316; }
  .difficulty.hard { background: #ef444422; color: #ef4444; }
  .ex-chinese { font-size: 1.1rem; font-family: var(--font-cn); margin-bottom: 2px; }
  .ex-pinyin { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 2px; }
  .ex-english { font-size: 0.875rem; color: var(--text-tertiary); }

  /* Mnemonic */
  .mnemonic p { font-style: italic; color: var(--text-secondary); padding: 8px 16px; background: var(--bg); border-radius: var(--radius-sm); }

  /* Breakdown */
  .breakdown p { margin-bottom: 4px; }

  /* Mistakes */
  .mistake { background: #fef2f2; border-radius: var(--radius-sm); padding: 12px 16px; border: 1px solid #fecaca; }
  .dark .mistake { background: #450a0a; border-color: #7f1d1d; }
  .mistake-note { font-size: 0.8125rem; color: var(--text-tertiary); margin-top: 4px; }

  /* Collocations */
  .collocation-chip {
    display: inline-block;
    padding: 4px 12px;
    margin: 3px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 999px;
    font-size: 0.875rem;
    font-family: var(--font-cn);
  }

  /* Related Words */
  .related-word {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 16px;
    margin: 4px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  .rw-hanzi { font-size: 1.1rem; font-family: var(--font-cn); font-weight: 500; }
  .rw-note { font-size: 0.75rem; color: var(--text-tertiary); margin-top: 2px; text-align: center; }

  /* Tips */
  .tip p { font-style: italic; }

  .entry-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    font-size: 0.8125rem;
    color: var(--text-tertiary);
  }
  .audio-btn-sm {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.8125rem;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .audio-btn-sm:hover { background: var(--accent); color: white; border-color: var(--accent); }

  /* ── Page Break Marker for Print ── */
  .page-break { page-break-before: always; }

  /* ── TOC ── */
  .toc {
    padding: 48px 0;
    max-width: 720px;
    margin: 0 auto;
  }
  .toc h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 24px; }
  .toc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }
  .toc-item {
    display: block;
    padding: 10px 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    text-decoration: none;
    color: var(--text);
    font-size: 0.875rem;
    transition: all 0.15s ease;
  }
  .toc-item:hover { border-color: var(--accent); }
  .toc-item .toc-level { font-weight: 600; font-family: var(--font-cn); }

  /* ── Dark Mode Toggle ── */
  .dark-toggle {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 50%;
    background: var(--surface);
    color: var(--text);
    font-size: 1.25rem;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
    z-index: 200;
    transition: all 0.15s ease;
  }
  .dark-toggle:hover { transform: scale(1.1); }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .word-entry { padding: 20px; }
    .hanzi { font-size: 2rem; }
    .pinyin { font-size: 1.05rem; }
    .nav-inner { flex-wrap: wrap; }
    .cover-stats { gap: 24px; }
  }

  /* ── Print ── */
  @media print {
    .nav-bar, .dark-toggle, .audio-btn, .audio-btn-sm { display: none !important; }
    .word-entry { break-inside: avoid; box-shadow: none; border: 1px solid #ddd; }
    body { background: white; color: black; }
    .word-entry::before { background: var(--accent) !important; }
    .book-cover { min-height: auto; padding: 60px 24px; }
  }
  `;
}

function generateNavBar(level, color) {
  const levels = [1,2,3,4,5,6,7];
  const levelLinks = levels.map(l =>
    `<a href="hsk-level-${l}.html" class="nav-btn" style="${l === level ? `background:${HSK_LEVEL_COLORS[l].hex};color:white;border-color:${HSK_LEVEL_COLORS[l].hex}` : ''}">HSK ${l}</a>`
  ).join('');

  return `
  <nav class="nav-bar">
    <div class="nav-inner">
      <span class="nav-title">📖 HSK Complete</span>
      <div class="nav-controls">
        ${levelLinks}
        <button class="nav-btn" onclick="toggleDarkMode()">🌓</button>
      </div>
    </div>
  </nav>`;
}

function generateBookHTML(entries, level) {
  const color = HSK_LEVEL_COLORS[level];
  const count = entries.length;

  // Group by POS and sort
  const posGroups = groupByPOS(entries);
  const sortedPOS = Object.keys(posGroups).sort((a, b) => posScore(a) - posScore(b));

  const tocItems = sortedPOS.map(pos => `
    <a href="#pos-${escapeHtml(pos)}" class="toc-item">
      <span class="toc-level">${POS_LABELS[pos] || pos}</span>
      <span style="font-size:0.75rem;color:var(--text-tertiary)">${posGroups[pos].length} words</span>
    </a>
  `).join('');

  let posSections = sortedPOS.map(pos => {
    const words = posGroups[pos];
    const entriesHtml = words.map((e, i) => generateEntryHTML(e, i)).join('\n');
    return `
      <section class="pos-section" id="pos-${escapeHtml(pos)}">
        <div class="pos-header" onclick="this.closest('.pos-section').classList.toggle('collapsed')">
          <span class="pos-toggle">▼</span>
          <h3>${POS_LABELS[pos] || pos}</h3>
          <span class="pos-count">${words.length} words</span>
        </div>
        <div class="pos-entries">${entriesHtml}</div>
      </section>`;
  }).join('\n');

  const hskLabels = { 1: 'Foundation', 2: 'Building Blocks', 3: 'Growing', 4: 'Expanding', 5: 'Advancing', 6: 'Proficiency', 7: 'Mastery' };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HSK ${level} — ${hskLabels[level]} — OpenHSK Complete Learning Guide</title>
<style>${generateCSS()}</style>
</head>
<body>
<script>
// Web Speech API TTS
let currentUtterance = null;
function speak(text) {
  if (currentUtterance) { window.speechSynthesis.cancel(); }
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 0.85;
  // Find a good Chinese voice
  const voices = window.speechSynthesis.getVoices();
  const zhVoice = voices.find(v => v.lang.startsWith('zh'));
  if (zhVoice) u.voice = zhVoice;
  currentUtterance = u;
  window.speechSynthesis.speak(u);
  // Button pulse effect
  const btn = event?.target?.closest?.('button');
  if (btn) { btn.classList.add('playing'); u.onend = () => btn.classList.remove('playing'); }
}
// Dark mode
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('hsk-book-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
}
(function() {
  if (localStorage.getItem('hsk-book-theme') === 'dark') document.documentElement.classList.add('dark');
  // Pre-load voices
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
})();
</script>

<div class="book-container" style="--accent: ${color.hex}; --accent-soft: ${color.hex}22">

  <!-- Cover Page -->
  <section class="book-cover">
    <span class="cover-badge" style="background:${color.hex}">HSK Level ${level}</span>
    <h1 class="cover-title">${hskLabels[level]}</h1>
    <p class="cover-subtitle">${count} Essential Words · Full Examples · Mnemonics · Audio</p>
    <div class="cover-stats">
      <div class="cover-stat">
        <div class="cover-stat-value" style="color:${color.hex}">${count}</div>
        <div class="cover-stat-label">Words</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-value" style="color:${color.hex}">${sortedPOS.length}</div>
        <div class="cover-stat-label">Word Classes</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-value" style="color:${color.hex}">${entries.reduce((s, e) => s + (e.examples?.length || 0), 0)}</div>
        <div class="cover-stat-label">Example Sentences</div>
      </div>
    </div>
  </section>

  <!-- Table of Contents -->
  <section class="toc">
    <h2>📑 Contents</h2>
    <div class="toc-grid">${tocItems}</div>
  </section>

  <!-- Word Entries -->
  ${posSections}

  <!-- Footer -->
  <footer style="text-align:center;padding:40px 0;color:var(--text-tertiary);font-size:0.875rem;border-top:1px solid var(--border);margin-top:48px">
    <p>Generated from <a href="https://github.com/iambiniyam/openHSK" style="color:${color.hex}">OpenHSK</a> · ${count} words · HSK ${level} ${hskLabels[level]}</p>
    <p style="margin-top:4px">Click 🔊 to hear pronunciation · 🌓 for dark mode</p>
  </footer>
</div>

<button class="dark-toggle" onclick="toggleDarkMode()" title="Toggle dark mode">🌓</button>

</body>
</html>`;
}

// ── CLI ──
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { levels: [1,2,3,4,5,6,7] };
  for (const arg of args) {
    if (arg.startsWith('--level=')) {
      opts.levels = [parseInt(arg.split('=')[1])];
    } else if (arg.startsWith('--levels=')) {
      opts.levels = arg.split('=')[1].split(',').map(Number);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const allEntries = loadData();
  const byLevel = groupByLevel(allEntries);

  mkdirSync(OUT_DIR, { recursive: true });

  for (const level of opts.levels) {
    const entries = byLevel[level];
    if (!entries) {
      console.warn(`⚠ No entries for HSK level ${level}`);
      continue;
    }
    console.log(`📖 Generating HSK ${level} book (${entries.length} words)...`);
    const html = generateBookHTML(entries, level);
    const outPath = join(OUT_DIR, `hsk-level-${level}.html`);
    writeFileSync(outPath, html, 'utf-8');
    console.log(`  ✓ Written to ${outPath}`);
  }

  // Generate index page
  const indexHtml = generateIndexHTML(opts.levels, byLevel);
  writeFileSync(join(OUT_DIR, 'index.html'), indexHtml, 'utf-8');
  console.log(`📚 Index: ${join(OUT_DIR, 'index.html')}`);
}

function generateIndexHTML(levels, byLevel) {
  const levelCards = levels.map(l => {
    const entries = byLevel[l];
    if (!entries) return '';
    const c = HSK_LEVEL_COLORS[l];
    const labels = { 1: 'Foundation', 2: 'Building Blocks', 3: 'Growing', 4: 'Expanding', 5: 'Advancing', 6: 'Proficiency', 7: 'Mastery' };
    return `
      <a href="hsk-level-${l}.html" class="level-card" style="--accent:${c.hex}">
        <span class="lc-badge" style="background:${c.hex}">HSK ${l}</span>
        <h3>${labels[l]}</h3>
        <p>${entries.length} words · ${new Set(entries.map(e => e.core.part_of_speech[0])).size} word classes</p>
        <span class="lc-arrow">→</span>
      </a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenHSK — Complete Learning Guide</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI Variable', system-ui, sans-serif;
    background: #fafaf9; color: #1c1917; line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  .container { max-width: 900px; margin: 0 auto; padding: 60px 24px; text-align: center; }
  h1 { font-size: 3rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 8px; }
  .subtitle { color: #78716c; font-size: 1.15rem; margin-bottom: 48px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; text-align: left; }
  .level-card {
    display: flex; flex-direction: column;
    padding: 24px; border: 1px solid #e7e5e4;
    border-radius: 16px; background: white;
    text-decoration: none; color: inherit;
    transition: all 0.2s ease; position: relative;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .level-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); }
  .level-card:hover .lc-arrow { transform: translateX(4px); }
  .lc-badge {
    display: inline-block; align-self: flex-start;
    padding: 4px 14px; border-radius: 999px;
    color: white; font-size: 0.75rem; font-weight: 700;
    letter-spacing: 0.03em; margin-bottom: 12px;
  }
  .level-card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 4px; }
  .level-card p { font-size: 0.875rem; color: #78716c; }
  .lc-arrow {
    position: absolute; bottom: 20px; right: 20px;
    font-size: 1.25rem; color: var(--accent);
    transition: transform 0.2s ease;
  }
  footer { margin-top: 48px; color: #a8a29e; font-size: 0.875rem; }
</style>
</head>
<body>
  <div class="container">
    <h1>📖 HSK Complete</h1>
    <p class="subtitle">${Object.values(byLevel).reduce((s, e) => s + e.length, 0)} words across ${levels.length} levels · Interactive audio · Full examples</p>
    <div class="grid">${levelCards}</div>
    <footer>Generated from <a href="https://github.com/iambiniyam/openHSK" style="color:#f97316">OpenHSK</a> dataset</footer>
  </div>
</body>
</html>`;
}

main().catch(console.error);
