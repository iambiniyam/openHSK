import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const QUALITY_DIR = path.join(ROOT, 'public', 'quality');

const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-chat';

const VOCAB_OUTPUT = path.join(QUALITY_DIR, 'professional-vocabulary.v1.json');
const DIALOGUE_OUTPUT = path.join(QUALITY_DIR, 'professional-dialogues.v1.json');

const MAX_RETRIES = 2;
const API_DELAY_MS = 2000;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: options.signal });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function chatCompletion(messages, opts = {}) {
  if (!API_KEY) throw new Error('DEEPSEEK_API_KEY not set');
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 300000); // 5 min
  try {
    const body = {
      model: opts.model || MODEL,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.max_tokens ?? 4096,
      response_format: opts.jsonMode ? { type: 'json_object' } : undefined,
    };
    const data = await fetchJson(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return data.choices?.[0]?.message?.content;
  } finally {
    clearTimeout(timeout);
  }
}

function extractJson(text) {
  if (!text) return null;
  text = text.trim();
  const fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch { /* continue */ }
  }
  try { return JSON.parse(text); } catch { /* continue */ }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* continue */ }
  }
  return null;
}

// ── Vocabulary Generation ──────────────────────────────────────────────────

const VOCAB_CATEGORIES = [
  {
    id: 'android_aosp',
    label_en: 'Android & AOSP',
    label_zh: '安卓与开源系统',
    description: 'Terms related to Android OS, AOSP, HAL, framework, and app development',
    seedTerms: [
      'Android Operating System', 'AOSP', 'HAL (Hardware Abstraction Layer)',
      'Kernel', 'Driver', 'Firmware', 'Bootloader', 'System Partition',
      'Activity', 'Service', 'Intent', 'Lifecycle', 'Context',
      'Resource', 'Layout', 'View', 'Fragment', 'Navigation',
      'Runtime Permission', 'App Signature', 'APK', 'ProGuard',
      'ADB (Android Debug Bridge)', 'Logcat', 'Crash', 'ANR',
      'Memory Leak', 'Frame Rate', 'Compatibility Test',
    ],
  },
  {
    id: 'testing_qa',
    label_en: 'Testing & QA',
    label_zh: '测试与质量保证',
    description: 'Testing terminology, QA processes, and automation frameworks',
    seedTerms: [
      'Test Case', 'Test Plan', 'Test Report', 'Bug Report', 'Defect',
      'Regression Testing', 'Smoke Testing', 'Integration Testing',
      'Unit Testing', 'End-to-End Testing', 'Manual Testing',
      'Automated Testing', 'Test Script', 'Test Framework',
      'Code Coverage', 'Pass Rate', 'Failure Rate', 'False Positive',
      'Reproduction Steps', 'Verification', 'Regression',
      'Test Environment', 'Mock Data', 'Stub', 'Test Platform',
      'Quality Gate', 'Entry Criteria', 'Exit Criteria',
    ],
  },
  {
    id: 'automotive',
    label_en: 'Automotive & Embedded',
    label_zh: '汽车与嵌入式',
    description: 'Automotive systems, IVI, ECU, ADAS, and in-vehicle technology',
    seedTerms: [
      'In-Vehicle Infotainment', 'IVI', 'Head Unit', 'Center Console',
      'Instrument Cluster', 'CAN Bus', 'ECU', 'Domain Controller',
      'ADAS', 'Sensor Fusion', 'Radar', 'LiDAR', 'Camera Calibration',
      'OBD', 'OTA Update', 'Functional Safety', 'ISO 26262',
      'ASPICE', 'Diagnostics', 'Telematics', 'V2X',
    ],
  },
  {
    id: 'cdd_compliance',
    label_en: 'CDD & Compliance',
    label_zh: '兼容性与合规',
    description: 'CDD, CTS, GMS, and compliance certification terms',
    seedTerms: [
      'CDD (Compatibility Definition Document)', 'CTS (Compatibility Test Suite)',
      'GMS (Google Mobile Services)', 'Compatibility',
      'Certification', 'Compliance', 'Requirement',
      'Test Suite', 'Test Case', 'Pass/Fail Criteria',
      'Vendor Test Suite', 'VTS', 'GTS', 'STS',
      'Self-Certification', 'Third-Party Certification',
    ],
  },
  {
    id: 'team_comm',
    label_en: 'Team Communication',
    label_zh: '团队沟通',
    description: 'Workplace communication, meetings, and agile processes',
    seedTerms: [
      'Daily Standup', 'Sprint Planning', 'Code Review', 'Retrospective',
      'Backlog', 'Story Points', 'Estimate', 'Priority',
      'Blocker', 'Dependency', 'Risk', 'Scope',
      'Alignment', 'Sync', 'Follow-up', 'Action Item',
      'Deadline', 'Delay', 'Milestone', 'Deliverable',
      'Sign-off', 'Acceptance', 'Handover', 'Escalation',
    ],
  },
  {
    id: 'general_se',
    label_en: 'General Software Engineering',
    label_zh: '通用软件工程',
    description: 'Core software engineering concepts and practices',
    seedTerms: [
      'Version Control', 'Git', 'Branch', 'Merge', 'Pull Request',
      'Commit', 'Repository', 'Build', 'Compile', 'Deploy',
      'CI/CD', 'Pipeline', 'Container', 'Docker', 'Orchestration',
      'API', 'Interface', 'Module', 'Component', 'Library',
      'Framework', 'Architecture', 'Design Pattern', 'Refactoring',
      'Debugging', 'Logging', 'Exception', 'Stack Trace',
      'Performance Optimization', 'Scalability', 'Load Balancing',
    ],
  },
];

async function generateVocabCategory(category, attempt = 0) {
  const termsList = category.seedTerms.map((t, i) => `${i + 1}. ${t}`).join('\n');

  const systemPrompt = `You are a professional Chinese-English technical translator and language educator specializing in software engineering, Android development, automotive systems, and workplace communication.

Your task: Generate a high-quality JSON array of technical vocabulary entries. Each entry must include accurate Simplified Chinese, pinyin with tone marks, natural example sentences, and clear definitions.

Rules:
- Use Simplified Chinese (简体中文)
- Pinyin must use tone marks (ā á ǎ à), NOT numbers
- Example sentences must be natural and realistic for a Chinese tech workplace
- Include abbreviations where common (e.g., CDD, AOSP, HAL)
- HSK level estimate: approximate HSK difficulty (1-6) based on character complexity
- Definitions should be concise but technically accurate`;

  const userPrompt = `Generate ${category.seedTerms.length} technical vocabulary entries for the category: "${category.label_en}" (${category.label_zh}).

Terms to cover:
${termsList}

Return ONLY a JSON object with this exact structure:
{
  "terms": [
    {
      "id": "android_aosp_001",
      "english": "Android Operating System",
      "chinese": "安卓操作系统",
      "pinyin": "Ānzhuō cāozuò xìtǒng",
      "abbreviation": "Android OS",
      "definition_en": "The mobile operating system developed by Google, based on Linux kernel",
      "definition_zh": "由谷歌开发的基于Linux内核的移动操作系统",
      "example_zh": "这个项目需要在安卓操作系统上运行。",
      "example_pinyin": "Zhège xiàngmù xūyào zài Ānzhuō cāozuò xìtǒng shàng yùnxíng.",
      "example_en": "This project needs to run on the Android Operating System.",
      "hsk_level_estimate": 4
    }
  ]
}

Generate entries for ALL ${category.seedTerms.length} terms. Use IDs like "${category.id}_001", "${category.id}_002", etc.`;

  try {
    const response = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.3, max_tokens: 8192, jsonMode: true }
    );

    const parsed = extractJson(response);
    if (!parsed || !Array.isArray(parsed.terms)) {
      throw new Error('Invalid response format');
    }

    // Validate and enrich
    const terms = parsed.terms.map((t, i) => ({
      id: t.id || `${category.id}_${String(i + 1).padStart(3, '0')}`,
      category: category.id,
      english: t.english || '',
      chinese: t.chinese || '',
      pinyin: t.pinyin || '',
      abbreviation: t.abbreviation || undefined,
      definition_en: t.definition_en || t.definition_en || '',
      definition_zh: t.definition_zh || t.definition_zh || '',
      example_zh: t.example_zh || '',
      example_pinyin: t.example_pinyin || '',
      example_en: t.example_en || '',
      hsk_level_estimate: t.hsk_level_estimate || 4,
    }));

    return terms;
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      console.log(`  Retry ${attempt + 1} for ${category.id}: ${e.message}`);
      await sleep(API_DELAY_MS * 2);
      return generateVocabCategory(category, attempt + 1);
    }
    throw e;
  }
}

// ── Dialogue Generation ────────────────────────────────────────────────────

const DIALOGUE_SCENARIOS = [
  {
    id: 'daily-standup',
    title_en: 'Daily Standup',
    title_zh: '每日站会',
    category: 'meeting',
    context: 'A 5-minute daily standup in a Chinese automotive Android team. The team is working on CTS testing for a new IVI system.',
    participants: ['Scrum Master / 项目经理', 'Test Engineer / 测试工程师', 'Android Developer / 安卓开发', 'QA Lead / 测试负责人'],
    turns: 10,
  },
  {
    id: 'code-review',
    title_en: 'Code Review',
    title_zh: '代码审查',
    category: 'review',
    context: 'A senior engineer is reviewing a junior developer\'s HAL integration code. They discuss error handling, logging, and CDD compliance.',
    participants: ['Senior Developer / 高级开发', 'Junior Developer / 初级开发'],
    turns: 10,
  },
  {
    id: 'bug-triage',
    title_en: 'Bug Triage Meeting',
    title_zh: 'Bug分类会议',
    category: 'meeting',
    context: 'The team is triaging bugs from the latest CTS run. They need to prioritize, assign owners, and determine if issues are blockers.',
    participants: ['Project Manager / 项目经理', 'Test Lead / 测试主管', 'Developer / 开发工程师', 'QA Engineer / 测试工程师'],
    turns: 12,
  },
  {
    id: 'sprint-planning',
    title_en: 'Sprint Planning',
    title_zh: '冲刺计划会',
    category: 'planning',
    context: 'The team is planning the next 2-week sprint. They estimate story points for CDD test case automation and IVI feature development.',
    participants: ['Product Owner / 产品经理', 'Tech Lead / 技术主管', 'Test Engineer / 测试工程师', 'Developer / 开发工程师'],
    turns: 12,
  },
  {
    id: 'cdd-discussion',
    title_en: 'CDD Compliance Discussion',
    title_zh: 'CDD合规讨论',
    category: 'technical',
    context: 'Engineers are discussing whether their device meets a specific CDD requirement about audio latency. They refer to the CDD document and CTS test results.',
    participants: ['System Architect / 系统架构师', 'Audio Engineer / 音频工程师', 'Test Engineer / 测试工程师'],
    turns: 10,
  },
  {
    id: 'test-results',
    title_en: 'Test Results Review',
    title_zh: '测试结果评审',
    category: 'review',
    context: 'The test team is presenting weekly automation test results to the development team. They show pass rates, coverage metrics, and failed test analysis.',
    participants: ['Test Lead / 测试主管', 'Automation Engineer / 自动化工程师', 'Developer / 开发工程师'],
    turns: 10,
  },
  {
    id: 'production-issue',
    title_en: 'Production Issue Response',
    title_zh: '线上问题处理',
    category: 'incident',
    context: 'A critical bug was found in the field that causes system crashes during OTA updates. The team is having an urgent call to coordinate the fix.',
    participants: ['On-Call Engineer / 值班工程师', 'Manager / 经理', 'Developer / 开发工程师', 'QA / 测试工程师'],
    turns: 10,
  },
  {
    id: 'architecture-review',
    title_en: 'Architecture Design Review',
    title_zh: '架构设计评审',
    category: 'technical',
    context: 'The team is reviewing a new architecture for the IVI middleware layer. They discuss HAL design, API contracts, and performance requirements.',
    participants: ['System Architect / 系统架构师', 'HAL Developer / HAL开发', 'Framework Engineer / 框架工程师', 'Test Architect / 测试架构师'],
    turns: 12,
  },
];

async function generateDialogue(scenario, attempt = 0) {
  const systemPrompt = `You are a professional dialogue writer for Chinese language learners in tech workplaces. You write realistic, natural Chinese workplace conversations.

Rules:
- Use Simplified Chinese (简体中文)
- Pinyin must use tone marks (ā á ǎ à), NOT numbers
- Conversations must be natural and authentic for Chinese tech companies
- Include technical terms naturally in context
- Each line should be 1-2 sentences, realistic speaking pace
- The conversation should feel like a real meeting, not a textbook`;

  const userPrompt = `Write a realistic workplace dialogue for this scenario:

Title: ${scenario.title_en} (${scenario.title_zh})
Context: ${scenario.context}
Participants: ${scenario.participants.join(', ')}
Number of dialogue turns: ${scenario.turns}

Return ONLY a JSON object with this exact structure:
{
  "lines": [
    {
      "speaker": "项目经理",
      "role": "Project Manager",
      "chinese": "大家早上好，我们先看一下昨天的进展。",
      "pinyin": "Dàjiā zǎoshang hǎo, wǒmen xiān kàn yīxià zuótiān de jìnzhǎn.",
      "english": "Good morning everyone, let's first look at yesterday's progress."
    }
  ],
  "key_vocabulary": [
    {
      "chinese": "进展",
      "pinyin": "jìnzhǎn",
      "english": "progress",
      "context": "used when discussing project status"
    }
  ]
}

Generate exactly ${scenario.turns} dialogue lines. Include 5-8 key vocabulary items that appear in the dialogue.`;

  try {
    const response = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.5, max_tokens: 4096, jsonMode: true }
    );

    const parsed = extractJson(response);
    if (!parsed || !Array.isArray(parsed.lines)) {
      throw new Error('Invalid response format');
    }

    return {
      id: scenario.id,
      title_en: scenario.title_en,
      title_zh: scenario.title_zh,
      category: scenario.category,
      description_en: scenario.context,
      description_zh: '', // Could generate separately if needed
      lines: parsed.lines.map((l) => ({
        speaker: l.speaker || '',
        role: l.role || '',
        chinese: l.chinese || '',
        pinyin: l.pinyin || '',
        english: l.english || '',
      })),
      key_vocabulary: (parsed.key_vocabulary || []).map((v) => ({
        chinese: v.chinese || '',
        pinyin: v.pinyin || '',
        english: v.english || '',
        context: v.context || '',
      })),
    };
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      console.log(`  Retry ${attempt + 1} for dialogue ${scenario.id}: ${e.message}`);
      await sleep(API_DELAY_MS * 2);
      return generateDialogue(scenario, attempt + 1);
    }
    throw e;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  OpenHSK Professional Dataset Builder    ║');
  console.log('║  DeepSeek API                            ║');
  console.log('╚══════════════════════════════════════════╝');

  if (!API_KEY) {
    console.error('Error: DEEPSEEK_API_KEY environment variable is required');
    process.exit(1);
  }

  fs.mkdirSync(QUALITY_DIR, { recursive: true });

  // ── Generate Vocabulary ──────────────────────────────────────────────────
  console.log('\n━━━ Generating Technical Vocabulary ━━━');
  const allTerms = [];
  for (const cat of VOCAB_CATEGORIES) {
    process.stdout.write(`  ${cat.label_en} (${cat.seedTerms.length} terms)... `);
    try {
      const terms = await generateVocabCategory(cat);
      allTerms.push(...terms);
      console.log(`✓ ${terms.length} terms`);
      await sleep(API_DELAY_MS);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }

  const vocabDataset = {
    meta: {
      generated_at: new Date().toISOString(),
      model: MODEL,
      total_terms: allTerms.length,
      categories: VOCAB_CATEGORIES.map((c) => ({
        id: c.id,
        label_en: c.label_en,
        label_zh: c.label_zh,
        description: c.description,
        term_count: allTerms.filter((t) => t.category === c.id).length,
      })),
    },
    terms: allTerms,
  };

  fs.writeFileSync(VOCAB_OUTPUT, JSON.stringify(vocabDataset, null, 2), 'utf8');
  console.log(`\n  💾 Vocabulary saved: ${allTerms.length} terms → ${VOCAB_OUTPUT}`);

  // ── Generate Dialogues ───────────────────────────────────────────────────
  console.log('\n━━━ Generating Workplace Dialogues ━━━');
  const allDialogues = [];
  for (const scenario of DIALOGUE_SCENARIOS) {
    process.stdout.write(`  ${scenario.title_en}... `);
    try {
      const dialogue = await generateDialogue(scenario);
      allDialogues.push(dialogue);
      console.log(`✓ ${dialogue.lines.length} lines`);
      await sleep(API_DELAY_MS);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }

  const dialogueDataset = {
    meta: {
      generated_at: new Date().toISOString(),
      model: MODEL,
      total_scenarios: allDialogues.length,
      categories: [...new Set(DIALOGUE_SCENARIOS.map((s) => s.category))],
    },
    scenarios: allDialogues,
  };

  fs.writeFileSync(DIALOGUE_OUTPUT, JSON.stringify(dialogueDataset, null, 2), 'utf8');
  console.log(`\n  💾 Dialogues saved: ${allDialogues.length} scenarios → ${DIALOGUE_OUTPUT}`);

  // Summary
  const vocabMb = (fs.statSync(VOCAB_OUTPUT).size / 1024 / 1024).toFixed(2);
  const dialogueMb = (fs.statSync(DIALOGUE_OUTPUT).size / 1024 / 1024).toFixed(2);
  console.log('\n━━━ Complete ━━━');
  console.log(`  Terms: ${allTerms.length} (${vocabMb} MB)`);
  console.log(`  Dialogues: ${allDialogues.length} scenarios (${dialogueMb} MB)`);
}

try {
  await main();
} catch (error) {
  console.error('\nFatal error:', error);
  process.exitCode = 1;
}
