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
const API_DELAY_MS = 1500;

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
  const timeout = setTimeout(() => ctrl.abort(), 300000);
  try {
    const body = {
      model: opts.model || MODEL,
      messages,
      temperature: opts.temperature ?? 0.3,
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

// ── Seed Data ──────────────────────────────────────────────────────────────

const SEED_CATEGORIES = [
  { id: 'android_aosp', label_en: 'Android & AOSP', label_zh: '安卓与开源系统' },
  { id: 'testing_qa', label_en: 'Testing & QA', label_zh: '测试与质量保证' },
  { id: 'automotive', label_en: 'Automotive & Embedded', label_zh: '汽车与嵌入式' },
  { id: 'cdd_compliance', label_en: 'CDD & Compliance', label_zh: '兼容性与合规' },
  { id: 'team_comm', label_en: 'Team Communication', label_zh: '团队沟通' },
  { id: 'general_se', label_en: 'General Software Engineering', label_zh: '通用软件工程' },
  { id: 'devops', label_en: 'DevOps & Infrastructure', label_zh: '运维与基础设施' },
  { id: 'data', label_en: 'Data & Databases', label_zh: '数据与数据库' },
  { id: 'cloud', label_en: 'Cloud & Virtualization', label_zh: '云计算与虚拟化' },
  { id: 'security', label_en: 'Security', label_zh: '安全' },
];

// Each term: [english, chinese, pinyin, abbreviation?]
const SEED_TERMS = [
  // Android & AOSP (60)
  ['android_aosp', 'Operating System', '操作系统', 'cāozuò xìtǒng'],
  ['android_aosp', 'Kernel', '内核', 'nèihé'],
  ['android_aosp', 'Driver', '驱动', 'qūdòng'],
  ['android_aosp', 'Firmware', '固件', 'gùjiàn'],
  ['android_aosp', 'Bootloader', '启动加载器', 'qǐdòng jiāzài qì'],
  ['android_aosp', 'HAL', '硬件抽象层', 'yìngjiàn chōuxiàng céng', 'HAL'],
  ['android_aosp', 'Framework', '框架', 'kuàngjià'],
  ['android_aosp', 'Application Layer', '应用层', 'yìngyòng céng'],
  ['android_aosp', 'System Service', '系统服务', 'xìtǒng fúwù'],
  ['android_aosp', 'Process', '进程', 'jìnchéng'],
  ['android_aosp', 'Thread', '线程', 'xiànchéng'],
  ['android_aosp', 'Memory', '内存', 'nèicún'],
  ['android_aosp', 'Stack', '堆栈', 'duīzhàn'],
  ['android_aosp', 'Lifecycle', '生命周期', 'shēngmìng zhōuqī'],
  ['android_aosp', 'Context', '上下文', 'shàngxiàwén'],
  ['android_aosp', 'Intent', '意图', 'yìtú'],
  ['android_aosp', 'Activity', '活动', 'huódòng'],
  ['android_aosp', 'Service', '服务', 'fúwù'],
  ['android_aosp', 'Broadcast Receiver', '广播接收器', 'guǎngbō jiēshōu qì'],
  ['android_aosp', 'Content Provider', '内容提供者', 'nèiróng tígōng zhě'],
  ['android_aosp', 'Fragment', '碎片', 'suìpiàn'],
  ['android_aosp', 'View', '视图', 'shìtú'],
  ['android_aosp', 'Layout', '布局', 'bùjú'],
  ['android_aosp', 'Resource', '资源', 'zīyuán'],
  ['android_aosp', 'Adapter', '适配器', 'shìpèi qì'],
  ['android_aosp', 'Permission', '权限', 'quánxiàn'],
  ['android_aosp', 'Signature', '签名', 'qiānmíng'],
  ['android_aosp', 'Package Name', '包名', 'bāomíng'],
  ['android_aosp', 'App Store', '应用商店', 'yìngyòng shāngdiàn'],
  ['android_aosp', 'Emulator', '模拟器', 'mónǐ qì'],
  ['android_aosp', 'Real Device', '真机', 'zhēnjī'],
  ['android_aosp', 'ADB', '调试桥', 'tiáoshì qiáo', 'ADB'],
  ['android_aosp', 'Log', '日志', 'rìzhì'],
  ['android_aosp', 'Logcat', '日志抓取', 'rìzhì zhuāqǔ'],
  ['android_aosp', 'Crash', '崩溃', 'bēngkuì'],
  ['android_aosp', 'ANR', '无响应', 'wú xiǎngyìng', 'ANR'],
  ['android_aosp', 'Jank', '卡顿', 'kǎdùn'],
  ['android_aosp', 'Frame Drop', '掉帧', 'diào zhēn'],
  ['android_aosp', 'Memory Leak', '内存泄漏', 'nèicún xièlòu'],
  ['android_aosp', 'Battery', '电量', 'diànliàng'],
  ['android_aosp', 'Overheating', '发热', 'fārè'],
  ['android_aosp', 'Cold Start', '冷启动', 'lěng qǐdòng'],
  ['android_aosp', 'Hot Start', '热启动', 'rè qǐdòng'],
  ['android_aosp', 'Startup Time', '启动时间', 'qǐdòng shíjiān'],
  ['android_aosp', 'Compatibility', '兼容性', 'jiān róng xìng'],
  ['android_aosp', 'Fragmentation', '碎片化', 'suìpiàn huà'],
  ['android_aosp', 'Flash Device', '刷机', 'shuā jī'],
  ['android_aosp', 'Root Access', 'Root权限', 'Root quánxiàn'],
  ['android_aosp', 'Recovery Mode', '恢复模式', 'huīfù móshì'],
  ['android_aosp', 'Partition', '分区', 'fēnqū'],
  ['android_aosp', 'System Partition', '系统分区', 'xìtǒng fēnqū'],
  ['android_aosp', 'User Data', '用户数据', 'yònghù shùjù'],
  ['android_aosp', 'Cache Partition', '缓存分区', 'huǎncún fēnqū'],
  ['android_aosp', 'OTA Update', 'OTA升级', 'OTA shēngjí', 'OTA'],
  ['android_aosp', 'APK', '安装包', 'ānzhuāng bāo', 'APK'],
  ['android_aosp', 'AAB', 'Android App Bundle', 'Android App Bundle', 'AAB'],
  ['android_aosp', 'ProGuard', '代码混淆', 'dàimǎ hùnxiáo'],
  ['android_aosp', 'Runtime Permission', '运行时权限', 'yùnxíng shí quánxiàn'],
  ['android_aosp', 'Binder', 'Binder机制', 'Binder jīzhì', 'Binder'],
  ['android_aosp', 'Zygote', 'Zygote进程', 'Zygote jìnchéng', 'Zygote'],

  // Testing & QA (55)
  ['testing_qa', 'Test', '测试', 'cèshì'],
  ['testing_qa', 'Test Case', '测试用例', 'cèshì yònglì'],
  ['testing_qa', 'Test Plan', '测试计划', 'cèshì jìhuà'],
  ['testing_qa', 'Test Report', '测试报告', 'cèshì bàogào'],
  ['testing_qa', 'Defect', '缺陷', 'quēxiàn'],
  ['testing_qa', 'Bug', '漏洞', 'lòudòng'],
  ['testing_qa', 'File a Ticket', '提单', 'tí dān'],
  ['testing_qa', 'Bug Ticket', 'Bug单', 'Bug dān'],
  ['testing_qa', 'Reproduce', '复现', 'fùxiàn'],
  ['testing_qa', 'Verify', '验证', 'yànzhèng'],
  ['testing_qa', 'Close', '关闭', 'guānbì'],
  ['testing_qa', 'Regression', '回归', 'huíguī'],
  ['testing_qa', 'Smoke Test', '冒烟测试', 'yānmào cèshì'],
  ['testing_qa', 'Integration Test', '集成测试', 'jíchéng cèshì'],
  ['testing_qa', 'System Test', '系统测试', 'xìtǒng cèshì'],
  ['testing_qa', 'Acceptance Test', '验收测试', 'yànshōu cèshì'],
  ['testing_qa', 'Unit Test', '单元测试', 'dānyuán cèshì'],
  ['testing_qa', 'End-to-End Test', '端到端测试', 'duān dào duān cèshì'],
  ['testing_qa', 'Manual Test', '手动测试', 'shǒudòng cèshì'],
  ['testing_qa', 'Automated Test', '自动化测试', 'zìdònghuà cèshì'],
  ['testing_qa', 'Test Script', '测试脚本', 'cèshì jiǎoběn'],
  ['testing_qa', 'Test Framework', '测试框架', 'cèshì kuàngjià'],
  ['testing_qa', 'Test Platform', '测试平台', 'cèshì píngtái'],
  ['testing_qa', 'Coverage', '覆盖率', 'fùgài lǜ'],
  ['testing_qa', 'Pass Rate', '通过率', 'tōngguò lǜ'],
  ['testing_qa', 'Failure Rate', '失败率', 'shībài lǜ'],
  ['testing_qa', 'Missed Test', '漏测', 'lòu cè'],
  ['testing_qa', 'False Positive', '误报', 'wùbào'],
  ['testing_qa', 'Entry Criteria', '准入', 'zhǔnrù'],
  ['testing_qa', 'Exit Criteria', '准出', 'zhǔnchū'],
  ['testing_qa', 'Quality Gate', '质量门禁', 'zhìliàng ménjìn'],
  ['testing_qa', 'Test Data', '测试数据', 'cèshì shùjù'],
  ['testing_qa', 'Data Generation', '造数', 'zào shù'],
  ['testing_qa', 'Mock Data', 'Mock数据', 'Mock shùjù'],
  ['testing_qa', 'Stub', '桩', 'zhuāng'],
  ['testing_qa', 'Mock Object', '替身', 'tìshēn'],
  ['testing_qa', 'Benchmark', '基准', 'jīzhǔn'],
  ['testing_qa', 'Performance Test', '性能测试', 'xìngnéng cèshì'],
  ['testing_qa', 'Stress Test', '压力测试', 'yālì cèshì'],
  ['testing_qa', 'Load Test', '负载测试', 'fùzài cèshì'],
  ['testing_qa', 'Stability Test', '稳定性测试', 'wěndìngxìng cèshì'],
  ['testing_qa', 'Long Stability Test', '长稳测试', 'cháng wěn cèshì'],
  ['testing_qa', 'Reliability', '可靠性', 'kěkào xìng'],
  ['testing_qa', 'Availability', '可用性', 'kěyòng xìng'],
  ['testing_qa', 'User Experience', '用户体验', 'yònghù tǐyàn'],
  ['testing_qa', 'Usability', '易用性', 'yìyòng xìng'],
  ['testing_qa', 'Compatibility Test', '兼容性测试', 'jiān róng xìng cèshì'],
  ['testing_qa', 'UI Automator', 'UI自动化工具', 'UI zìdònghuà gōngjù'],
  ['testing_qa', 'Espresso', 'Espresso框架', 'Espresso kuàngjià', 'Espresso'],
  ['testing_qa', 'Monkey Test', 'Monkey测试', 'Monkey cèshì'],
  ['testing_qa', 'Test Environment', '测试环境', 'cèshì huánjìng'],
  ['testing_qa', 'Test Bed', '测试台', 'cèshì tái'],
  ['testing_qa', 'Sign-off', '签字确认', 'qiānzì quèrèn'],

  // Automotive (45)
  ['automotive', 'In-Vehicle', '车载', 'chēzài'],
  ['automotive', 'Head Unit', '车机', 'chē jī'],
  ['automotive', 'Cockpit', '座舱', 'zuòcāng'],
  ['automotive', 'Infotainment', '信息娱乐', 'xìnxī yúlè'],
  ['automotive', 'IVI', '车载信息娱乐系统', 'chēzài xìnxī yúlè xìtǒng', 'IVI'],
  ['automotive', 'Instrument Cluster', '仪表盘', 'yíbiǎo pán'],
  ['automotive', 'Center Screen', '中控屏', 'zhōngkòng píng'],
  ['automotive', 'Large Screen', '大屏', 'dàpíng'],
  ['automotive', 'Navigation', '导航', 'dǎoháng'],
  ['automotive', 'Voice Control', '语音控制', 'yǔyīn kòngzhì'],
  ['automotive', 'Bluetooth', '蓝牙', 'lányá'],
  ['automotive', 'CAN Bus', 'CAN总线', 'CAN zǒngxiàn', 'CAN'],
  ['automotive', 'Ethernet', '以太网', 'yǐtài wǎng'],
  ['automotive', 'ECU', '电子控制单元', 'diànzǐ kòngzhì dānyuán', 'ECU'],
  ['automotive', 'Domain Controller', '域控制器', 'yù kòngzhì qì'],
  ['automotive', 'Autonomous Driving', '自动驾驶', 'zìdòng jiàshǐ'],
  ['automotive', 'Assisted Driving', '辅助驾驶', 'fǔzhù jiàshǐ'],
  ['automotive', 'ADAS', '高级驾驶辅助系统', 'gāojí jiàshǐ fǔzhù xìtǒng', 'ADAS'],
  ['automotive', 'Sensor', '传感器', 'chuángǎnqì'],
  ['automotive', 'Radar', '雷达', 'léidá'],
  ['automotive', 'LiDAR', '激光雷达', 'jīguāng léidá', 'LiDAR'],
  ['automotive', 'Camera', '摄像头', 'shèxiàngtóu'],
  ['automotive', 'Sensor Fusion', '传感器融合', 'chuángǎnqì rónghé'],
  ['automotive', 'Perception', '感知', 'gǎnzhī'],
  ['automotive', 'Decision Making', '决策', 'juécè'],
  ['automotive', 'Control', '控制', 'kòngzhì'],
  ['automotive', 'Planning', '规划', 'guīhuà'],
  ['automotive', 'Calibration', '标定', 'biāodìng'],
  ['automotive', 'Diagnostics', '诊断', 'zhěnduàn'],
  ['automotive', 'OBD', '车载诊断接口', 'chēzài zhěnduàn jiēkǒu', 'OBD'],
  ['automotive', 'Flash', '刷新', 'shuāxīn'],
  ['automotive', 'OTA', '远程升级', 'yuǎnchéng shēngjí', 'OTA'],
  ['automotive', 'Remote', '远程', 'yuǎnchéng'],
  ['automotive', 'Functional Safety', '功能安全', 'gōngnéng ānquán'],
  ['automotive', 'SOTIF', '预期功能安全', 'yùqī gōngnéng ānquán', 'SOTIF'],
  ['automotive', 'Cybersecurity', '网络安全', 'wǎngluò ānquán'],
  ['automotive', 'Information Security', '信息安全', 'xìnxī ānquán'],
  ['automotive', 'Telematics', '远程信息处理', 'yuǎnchéng xìnxī chǔlǐ'],
  ['automotive', 'V2X', '车联网', 'chē liánwǎng', 'V2X'],
  ['automotive', 'Digital Key', '数字钥匙', 'shùzì yàoshi'],
  ['automotive', 'Face Recognition', '人脸识别', 'rénliǎn shíbié'],
  ['automotive', 'Gesture Control', '手势控制', 'shǒushì kòngzhì'],
  ['automotive', 'HMI', '人机交互界面', 'rénjī jiāohù jièmiàn', 'HMI'],
  ['automotive', 'ISO 26262', 'ISO 26262', 'ISO 26262'],
  ['automotive', 'ASPICE', 'ASPICE', 'ASPICE'],

  // CDD & Compliance (30)
  ['cdd_compliance', 'CDD', '兼容性定义文档', 'jiān róng xìng dìng yì wén dàng', 'CDD'],
  ['cdd_compliance', 'CTS', '兼容性测试套件', 'jiān róng xìng cèshì tào jiàn', 'CTS'],
  ['cdd_compliance', 'GMS', '谷歌移动服务', 'Gǔgē yídòng fúwù', 'GMS'],
  ['cdd_compliance', 'VTS', '供应商测试套件', 'gōngyìngshāng cèshì tào jiàn', 'VTS'],
  ['cdd_compliance', 'GTS', '谷歌测试套件', 'Gǔgē cèshì tào jiàn', 'GTS'],
  ['cdd_compliance', 'STS', '安全测试套件', 'ānquán cèshì tào jiàn', 'STS'],
  ['cdd_compliance', 'Certification', '认证', 'rènzhèng'],
  ['cdd_compliance', 'Compliance', '合规', 'hégūi'],
  ['cdd_compliance', 'Requirement', '要求', 'yāoqiú'],
  ['cdd_compliance', 'Specification', '规范', 'guīfàn'],
  ['cdd_compliance', 'Standard', '标准', 'biāozhǔn'],
  ['cdd_compliance', 'Pass Criteria', '通过标准', 'tōngguò biāozhǔn'],
  ['cdd_compliance', 'Fail Criteria', '失败标准', 'shībài biāozhǔn'],
  ['cdd_compliance', 'Self-Check', '自检', 'zìjiǎn'],
  ['cdd_compliance', 'Third-Party Certification', '第三方认证', 'dì sān fāng rènzhèng'],
  ['cdd_compliance', 'Self-Certification', '自我认证', 'zìwǒ rènzhèng'],
  ['cdd_compliance', 'Certification Body', '认证机构', 'rènzhèng jīgòu'],
  ['cdd_compliance', 'Test Lab', '测试实验室', 'cèshì shíyàn shì'],
  ['cdd_compliance', 'Audit', '审核', 'shěnhé'],
  ['cdd_compliance', 'Spot Check', '抽查', 'chōuchá'],
  ['cdd_compliance', 'Exemption', '豁免', 'huòmiǎn'],
  ['cdd_compliance', 'Waiver', '弃权', 'qìquán'],
  ['cdd_compliance', 'Clause', '条款', 'tiáokuǎn'],
  ['cdd_compliance', 'MUST', '必须', 'bìxū'],
  ['cdd_compliance', 'SHOULD', '应该', 'yīnggāi'],
  ['cdd_compliance', 'MAY', '可以', 'kěyǐ'],
  ['cdd_compliance', 'Conformance', '一致性', 'yīzhì xìng'],
  ['cdd_compliance', 'Non-Conformance', '不一致', 'bù yīzhì'],
  ['cdd_compliance', 'Deviation', '偏差', 'piānchā'],
  ['cdd_compliance', 'Remediation', '整改', 'zhěnggǎi'],

  // Team Communication (50)
  ['team_comm', 'Standup', '站会', 'zhàn huì'],
  ['team_comm', 'Morning Meeting', '晨会', 'chén huì'],
  ['team_comm', 'Regular Meeting', '例会', 'lìhuì'],
  ['team_comm', 'Review Meeting', '评审会', 'píngshěn huì'],
  ['team_comm', 'Retrospective', '回顾会', 'huígù huì'],
  ['team_comm', 'Planning Meeting', '计划会', 'jìhuà huì'],
  ['team_comm', 'Scheduling', '排期', 'pái qī'],
  ['team_comm', 'Estimation', '估点', 'gū diǎn'],
  ['team_comm', 'Story Points', '故事点', 'gùshì diǎn'],
  ['team_comm', 'Iteration', '迭代', 'diédài'],
  ['team_comm', 'Sprint', '冲刺', 'chōngcì'],
  ['team_comm', 'Backlog', '待办列表', 'dàibàn lièbiǎo'],
  ['team_comm', 'Requirement Pool', '需求池', 'xūqiú chí'],
  ['team_comm', 'Priority', '优先级', 'yōuxiān jí'],
  ['team_comm', 'Blocker', '阻塞', 'zǔsè'],
  ['team_comm', 'Risk', '风险', 'fēngxiǎn'],
  ['team_comm', 'Dependency', '依赖', 'yīlài'],
  ['team_comm', 'Communication', '沟通', 'gōutōng'],
  ['team_comm', 'Coordination', '协调', 'xiétiáo'],
  ['team_comm', 'Sync', '同步', 'tóngbù'],
  ['team_comm', 'Alignment', '对齐', 'duìqí'],
  ['team_comm', 'Confirm', '确认', 'quèrèn'],
  ['team_comm', 'Feedback', '反馈', 'fǎnkuì'],
  ['team_comm', 'Suggestion', '建议', 'jiànyì'],
  ['team_comm', 'Opinion', '意见', 'yìjiàn'],
  ['team_comm', 'Discussion', '讨论', 'tǎolùn'],
  ['team_comm', 'Decision', '决策', 'juécè'],
  ['team_comm', 'Conclusion', '结论', 'jiélùn'],
  ['team_comm', 'Action Item', '行动项', 'xíngdòng xiàng'],
  ['team_comm', 'Owner', '负责人', 'fùzé rén'],
  ['team_comm', 'Deadline', '截止日期', 'jiézhǐ rìqī'],
  ['team_comm', 'Follow Up', '跟进', 'gēnjìn'],
  ['team_comm', 'Push', '催促', 'cuīcù'],
  ['team_comm', 'Delay', '延期', 'yánqī'],
  ['team_comm', 'Change', '变更', 'biàngēng'],
  ['team_comm', 'Scope', '范围', 'fànwéi'],
  ['team_comm', 'Resource', '资源', 'zīyuán'],
  ['team_comm', 'Manpower', '人力', 'rénlì'],
  ['team_comm', 'Go Live', '上线', 'shàngxiàn'],
  ['team_comm', 'Release', '发版', 'fā bǎn'],
  ['team_comm', 'Acceptance', '验收', 'yànshōu'],
  ['team_comm', 'Sign Off', '签字', 'qiānzì'],
  ['team_comm', 'Archive', '归档', 'guīdàng'],
  ['team_comm', 'Onboarding', '入职培训', 'rùzhí péixùn'],
  ['team_comm', 'Handover', '交接', 'jiāojiē'],
  ['team_comm', 'Escalation', '升级', 'shēngjí'],
  ['team_comm', 'Root Cause', '根因', 'gēn yīn'],
  ['team_comm', 'Post-Mortem', '复盘', 'fùpán'],
  ['team_comm', 'Lesson Learned', '经验教训', 'jīngyàn jiàoxùn'],
  ['team_comm', 'Best Practice', '最佳实践', 'zuìjiā shíjiàn'],

  // General SE (80)
  ['general_se', 'Code', '代码', 'dàimǎ'],
  ['general_se', 'Development', '开发', 'kāifā'],
  ['general_se', 'Programming', '编程', 'biānchéng'],
  ['general_se', 'Programmer', '程序员', 'chéngxù yuán'],
  ['general_se', 'Engineer', '工程师', 'gōngchéngshī'],
  ['general_se', 'Architect', '架构师', 'jiàgòushī'],
  ['general_se', 'Tech Lead', '技术主管', 'jìshù zhǔguǎn'],
  ['general_se', 'Product Manager', '产品经理', 'chǎnpǐn jīnglǐ'],
  ['general_se', 'Project Manager', '项目经理', 'xiàngmù jīnglǐ'],
  ['general_se', 'Version Control', '版本控制', 'bǎnběn kòngzhì'],
  ['general_se', 'Code Repository', '代码库', 'dàimǎ kù'],
  ['general_se', 'Repository', '仓库', 'cāngkù'],
  ['general_se', 'Branch', '分支', 'fēnzhī'],
  ['general_se', 'Main Branch', '主干', 'zhǔgàn'],
  ['general_se', 'Merge', '合并', 'hébìng'],
  ['general_se', 'Conflict', '冲突', 'chōngtū'],
  ['general_se', 'Commit', '提交', 'tíjiāo'],
  ['general_se', 'Push', '推送', 'tuīsòng'],
  ['general_se', 'Pull', '拉取', 'lāqǔ'],
  ['general_se', 'Clone', '克隆', 'kèlóng'],
  ['general_se', 'Fork', '分叉', 'fēnchā'],
  ['general_se', 'Pull Request', '拉取请求', 'lāqǔ qǐngqiú'],
  ['general_se', 'Code Review', '代码审查', 'dàimǎ shěnchá'],
  ['general_se', 'Review', '评审', 'píngshěn'],
  ['general_se', 'Compile', '编译', 'biānyì'],
  ['general_se', 'Build', '构建', 'gòujiàn'],
  ['general_se', 'Package', '打包', 'dǎbāo'],
  ['general_se', 'Deploy', '部署', 'bùshǔ'],
  ['general_se', 'Release', '发布', 'fābù'],
  ['general_se', 'Rollback', '回滚', 'huígǔn'],
  ['general_se', 'CI', '持续集成', 'chíxù jíchéng', 'CI'],
  ['general_se', 'CD', '持续交付', 'chíxù jiāofù', 'CD'],
  ['general_se', 'Pipeline', '流水线', 'liúshuǐxiàn'],
  ['general_se', 'Container', '容器', 'róngqì'],
  ['general_se', 'Image', '镜像', 'jìngxiàng'],
  ['general_se', 'Orchestration', '编排', 'biān pái'],
  ['general_se', 'Microservices', '微服务', 'wēi fúwù'],
  ['general_se', 'API', '接口', 'jiēkǒu', 'API'],
  ['general_se', 'Protocol', '协议', 'xiéyì'],
  ['general_se', 'Endpoint', '端点', 'duāndiǎn'],
  ['general_se', 'Request', '请求', 'qǐngqiú'],
  ['general_se', 'Response', '响应', 'xiǎngyìng'],
  ['general_se', 'Callback', '回调', 'huídiào'],
  ['general_se', 'Async', '异步', 'yìbù'],
  ['general_se', 'Sync', '同步', 'tóngbù'],
  ['general_se', 'Blocking', '阻塞', 'zǔsè'],
  ['general_se', 'Non-Blocking', '非阻塞', 'fēi zǔsè'],
  ['general_se', 'Concurrency', '并发', 'bìngfā'],
  ['general_se', 'Parallelism', '并行', 'bìngxíng'],
  ['general_se', 'Distributed', '分布式', 'fēnbù shì'],
  ['general_se', 'Cluster', '集群', 'jíqún'],
  ['general_se', 'Node', '节点', 'jiédiǎn'],
  ['general_se', 'Service', '服务', 'fúwù'],
  ['general_se', 'Gateway', '网关', 'wǎngguān'],
  ['general_se', 'Proxy', '代理', 'dàilǐ'],
  ['general_se', 'Routing', '路由', 'lùyóu'],
  ['general_se', 'Load Balancing', '负载均衡', 'fùzài jūnhéng'],
  ['general_se', 'High Availability', '高可用', 'gāo kěyòng'],
  ['general_se', 'Fault Tolerance', '容错', 'róngcuò'],
  ['general_se', 'Degradation', '降级', 'jiàngjí'],
  ['general_se', 'Rate Limiting', '限流', 'xiànliú'],
  ['general_se', 'Circuit Breaker', '熔断', 'róngduàn'],
  ['general_se', 'Monitoring', '监控', 'jiānkòng'],
  ['general_se', 'Alert', '告警', 'gàojǐng'],
  ['general_se', 'Metric', '指标', 'zhǐbiāo'],
  ['general_se', 'Tracing', '追踪', 'zhuīzōng'],
  ['general_se', 'Log Aggregation', '日志聚合', 'rìzhì jùhé'],
  ['general_se', 'Event Tracking', '埋点', 'mái diǎn'],
  ['general_se', 'Canary', '灰度', 'huīdù'],
  ['general_se', 'Blue-Green Deploy', '蓝绿部署', 'lán lǜ bùshǔ'],
  ['general_se', 'Canary Release', '金丝雀发布', 'jīnsīquè fābù'],
  ['general_se', 'AB Test', 'AB测试', 'AB cèshì'],
  ['general_se', 'Feature Flag', '功能开关', 'gōngnéng kāiguān'],
  ['general_se', 'Design Pattern', '设计模式', 'shèjì móshì'],
  ['general_se', 'Refactoring', '重构', 'chónggòu'],
  ['general_se', 'Optimization', '优化', 'yōuhuà'],
  ['general_se', 'Debugging', '调试', 'tiáoshì'],
  ['general_se', 'Breakpoint', '断点', 'duàn diǎn'],
  ['general_se', 'Step Through', '单步执行', 'dānbù zhíxíng'],
  ['general_se', 'Stack Trace', '堆栈跟踪', 'duīzhàn gēnzōng'],
  ['general_se', 'Exception', '异常', 'yìcháng'],
  ['general_se', 'Error', '错误', 'cuòwù'],
  ['general_se', 'Warning', '警告', 'jǐnggào'],
  ['general_se', 'Info', '信息', 'xìnxī'],
  ['general_se', 'Performance', '性能', 'xìngnéng'],
  ['general_se', 'Bottleneck', '瓶颈', 'píngjǐng'],
  ['general_se', 'Throughput', '吞吐量', 'tūn tǔ liàng'],
  ['general_se', 'Latency', '延迟', 'yánchí'],
  ['general_se', 'Response Time', '响应时间', 'xiǎngyìng shíjiān'],
  ['general_se', 'Scalability', '可扩展性', 'kě kuòzhǎn xìng'],

  // DevOps (20)
  ['devops', 'Operations', '运维', 'yùnwéi'],
  ['devops', 'Infrastructure', '基础设施', 'jīchǔ shèshī'],
  ['devops', 'Platform', '平台', 'píngtái'],
  ['devops', 'Toolchain', '工具链', 'gōngjù liàn'],
  ['devops', 'Configuration', '配置', 'pèizhì'],
  ['devops', 'Environment Variable', '环境变量', 'huánjìng biànliàng'],
  ['devops', 'Secret Key', '密钥', 'mìyuè'],
  ['devops', 'Certificate', '证书', 'zhèngshū'],
  ['devops', 'Domain Name', '域名', 'yùmíng'],
  ['devops', 'Server', '服务器', 'fúwùqì'],
  ['devops', 'Virtual Machine', '虚拟机', 'xūnǐ jī'],
  ['devops', 'Docker', 'Docker', 'Docker'],
  ['devops', 'Kubernetes', 'Kubernetes', 'Kubernetes'],
  ['devops', 'Jenkins', 'Jenkins', 'Jenkins'],
  ['devops', 'GitLab CI', 'GitLab CI', 'GitLab CI'],
  ['devops', 'GitHub Actions', 'GitHub Actions', 'GitHub Actions'],
  ['devops', 'Ansible', 'Ansible', 'Ansible'],
  ['devops', 'Terraform', 'Terraform', 'Terraform'],
  ['devops', 'Nginx', 'Nginx', 'Nginx'],
  ['devops', 'Redis', 'Redis', 'Redis'],

  // Data (20)
  ['data', 'Database', '数据库', 'shùjùkù'],
  ['data', 'Table', '表', 'biǎo'],
  ['data', 'Column', '字段', 'zìduàn'],
  ['data', 'Row', '记录', 'jìlù'],
  ['data', 'Index', '索引', 'suǒyǐn'],
  ['data', 'Query', '查询', 'cháxún'],
  ['data', 'Transaction', '事务', 'shìwù'],
  ['data', 'Lock', '锁', 'suǒ'],
  ['data', 'Deadlock', '死锁', 'sǐsuǒ'],
  ['data', 'Backup', '备份', 'bèifèn'],
  ['data', 'Restore', '恢复', 'huīfù'],
  ['data', 'Migration', '迁移', 'qiānyí'],
  ['data', 'Modeling', '建模', 'jiànmó'],
  ['data', 'Normal Form', '范式', 'fànshì'],
  ['data', 'Primary Key', '主键', 'zhǔ jiàn'],
  ['data', 'Foreign Key', '外键', 'wài jiàn'],
  ['data', 'Join', '连接', 'liánjiē'],
  ['data', 'Aggregation', '聚合', 'jùhé'],
  ['data', 'Sharding', '分片', 'fēn piàn'],
  ['data', 'Replication', '复制', 'fùzhì'],

  // Cloud (20)
  ['cloud', 'Cloud', '云', 'yún'],
  ['cloud', 'Cloud Computing', '云计算', 'yún jìsuàn'],
  ['cloud', 'Virtualization', '虚拟化', 'xūnǐ huà'],
  ['cloud', 'Instance', '实例', 'shílì'],
  ['cloud', 'Elasticity', '弹性', 'tánxìng'],
  ['cloud', 'Auto Scaling', '自动伸缩', 'zìdòng shēnsuō'],
  ['cloud', 'Storage', '存储', 'cúnchǔ'],
  ['cloud', 'Object Storage', '对象存储', 'duìxiàng cúnchǔ'],
  ['cloud', 'Block Storage', '块存储', 'kuài cúnchǔ'],
  ['cloud', 'Network', '网络', 'wǎngluò'],
  ['cloud', 'Subnet', '子网', 'zǐwǎng'],
  ['cloud', 'Firewall', '防火墙', 'fánghuǒqiáng'],
  ['cloud', 'Security Group', '安全组', 'ānquán zǔ'],
  ['cloud', 'VPC', '虚拟私有云', 'xūnǐ sīyǒu yún', 'VPC'],
  ['cloud', 'CDN', '内容分发网络', 'nèiróng fēnfā wǎngluò', 'CDN'],
  ['cloud', 'DNS', '域名系统', 'yùmíng xìtǒng', 'DNS'],
  ['cloud', 'SLA', '服务等级协议', 'fúwù děngjí xiéyì', 'SLA'],
  ['cloud', 'IaaS', '基础设施即服务', 'jīchǔ shèshī jí fúwù', 'IaaS'],
  ['cloud', 'PaaS', '平台即服务', 'píngtái jí fúwù', 'PaaS'],
  ['cloud', 'SaaS', '软件即服务', 'ruǎnjiàn jí fúwù', 'SaaS'],

  // Security (20)
  ['security', 'Security', '安全', 'ānquán'],
  ['security', 'Authentication', '认证', 'rènzhèng'],
  ['security', 'Authorization', '授权', 'shòuquán'],
  ['security', 'Encryption', '加密', 'jiāmì'],
  ['security', 'Decryption', '解密', 'jiěmì'],
  ['security', 'Hash', '哈希', 'hāxī'],
  ['security', 'Digital Signature', '数字签名', 'shùzì qiānmíng'],
  ['security', 'Token', '令牌', 'lìngpái'],
  ['security', 'Session', '会话', 'huìhuà'],
  ['security', 'Cookie', 'Cookie', 'Cookie'],
  ['security', 'XSS', '跨站脚本攻击', 'kuà zhàn jiǎoběn gōngjí', 'XSS'],
  ['security', 'CSRF', '跨站请求伪造', 'kuà zhàn qǐngqiú wěizào', 'CSRF'],
  ['security', 'SQL Injection', 'SQL注入', 'SQL zhùrù'],
  ['security', 'Penetration Test', '渗透测试', 'shèntòu cèshì'],
  ['security', 'Vulnerability', '漏洞', 'lòudòng'],
  ['security', 'Patch', '补丁', 'bǔdīng'],
  ['security', 'Zero Day', '零日漏洞', 'líng rì lòudòng'],
  ['security', 'DDoS', '分布式拒绝服务', 'fēnbù shì jùjué fúwù', 'DDoS'],
  ['security', 'MFA', '多因素认证', 'duō yīnsù rènzhèng', 'MFA'],
  ['security', 'SSO', '单点登录', 'dān diǎn dēnglù', 'SSO'],
];

// ── Expanded Dialogue Scenarios ────────────────────────────────────────────

const DIALOGUE_SCENARIOS = [
  {
    id: 'weekly-review',
    title_en: 'Weekly Team Review',
    title_zh: '周会回顾',
    category: 'meeting',
    context: 'Weekly team review meeting. The team discusses completed tasks, upcoming deliverables, and blockers for the IVI project.',
    participants: ['Tech Lead / 技术主管', 'Test Engineer / 测试工程师', 'Developer / 开发工程师', 'Product Manager / 产品经理'],
    turns: 12,
  },
  {
    id: 'asking-help',
    title_en: 'Asking for Technical Help',
    title_zh: '请教技术问题',
    category: 'technical',
    context: 'A junior test engineer is asking a senior developer for help understanding a HAL layer issue that is causing CTS failures.',
    participants: ['Junior Engineer / 初级工程师', 'Senior Engineer / 高级工程师'],
    turns: 10,
  },
  {
    id: 'quarterly-planning',
    title_en: 'Quarterly Planning',
    title_zh: '季度规划',
    category: 'planning',
    context: 'The team is planning the next quarter\'s goals for the automotive Android platform, including CDD compliance milestones.',
    participants: ['Director / 总监', 'Tech Lead / 技术主管', 'Project Manager / 项目经理', 'Test Lead / 测试主管'],
    turns: 12,
  },
  {
    id: 'onboarding',
    title_en: 'Onboarding a New Team Member',
    title_zh: '新人入职',
    category: 'meeting',
    context: 'A senior engineer is onboarding a new foreign team member, explaining the project structure, tools, and team processes.',
    participants: ['Mentor / 导师', 'New Hire / 新人'],
    turns: 12,
  },
  {
    id: 'performance-review',
    title_en: 'One-on-One Performance Review',
    title_zh: '一对一绩效沟通',
    category: 'meeting',
    context: 'A manager is having a quarterly one-on-one with a team member to discuss performance, growth, and goals.',
    participants: ['Manager / 经理', 'Engineer / 工程师'],
    turns: 10,
  },
  {
    id: 'cross-team',
    title_en: 'Cross-Team Collaboration',
    title_zh: '跨团队协作',
    category: 'meeting',
    context: 'The Android framework team is meeting with the automotive hardware team to align on HAL interface changes.',
    participants: ['Framework Lead / 框架负责人', 'HAL Engineer / HAL工程师', 'Test Architect / 测试架构师', 'PM / 项目经理'],
    turns: 12,
  },
  {
    id: 'lunch-chat',
    title_en: 'Lunch Room Chat',
    title_zh: '午餐闲聊',
    category: 'meeting',
    context: 'Casual lunch conversation among colleagues discussing tech news, work-life balance, and weekend plans.',
    participants: ['Colleague A / 同事A', 'Colleague B / 同事B', 'Colleague C / 同事C'],
    turns: 10,
  },
  {
    id: 'post-mortem',
    title_en: 'Production Incident Post-Mortem',
    title_zh: '线上事故复盘',
    category: 'incident',
    context: 'The team is conducting a post-mortem for a production incident where an OTA update bricked some devices.',
    participants: ['Incident Commander / 事故指挥官', 'Developer / 开发工程师', 'Test Lead / 测试主管', 'Manager / 经理'],
    turns: 12,
  },
  {
    id: 'tech-interview',
    title_en: 'Technical Interview',
    title_zh: '技术面试',
    category: 'review',
    context: 'A senior engineer is interviewing a candidate for an Android test automation position.',
    participants: ['Interviewer / 面试官', 'Candidate / 候选人'],
    turns: 12,
  },
  {
    id: 'merge-conflict',
    title_en: 'Resolving a Merge Conflict',
    title_zh: '解决代码冲突',
    category: 'technical',
    context: 'Two developers are discussing how to resolve a complex merge conflict in the HAL layer code.',
    participants: ['Developer A / 开发A', 'Developer B / 开发B'],
    turns: 10,
  },
  {
    id: 'requirement-clarification',
    title_en: 'Requirement Clarification',
    title_zh: '需求澄清',
    category: 'planning',
    context: 'Developers and testers are asking the product manager to clarify ambiguous requirements for a new IVI feature.',
    participants: ['Product Manager / 产品经理', 'Developer / 开发工程师', 'Test Engineer / 测试工程师'],
    turns: 10,
  },
  {
    id: 'email-report',
    title_en: 'Writing a Test Report Email',
    title_zh: '撰写测试报告邮件',
    category: 'review',
    context: 'A test lead is dictating an email to report weekly test results to stakeholders, including pass rates and critical issues.',
    participants: ['Test Lead / 测试主管', 'Assistant / 助理'],
    turns: 10,
  },
];

// ── Generation Functions ───────────────────────────────────────────────────

async function generateVocabBatch(terms, attempt = 0) {
  const termList = terms.map((t, i) => `${i + 1}. ${t[1]} (${t[2]}, ${t[3]})`).join('\n');

  const systemPrompt = `You are a professional Chinese-English technical translator. Generate concise, accurate JSON vocabulary entries for software engineers working in Chinese tech companies.

Rules:
- Simplified Chinese only
- Pinyin must use tone marks (ā á ǎ à)
- Definitions should be 1 sentence, technically accurate
- Example sentences must be natural Chinese tech workplace dialogue
- Keep examples realistic and practical`;

  const userPrompt = `Generate ${terms.length} vocabulary entries:

${termList}

Return JSON:
{
  "terms": [
    {
      "english": "Operating System",
      "chinese": "操作系统",
      "pinyin": "cāozuò xìtǒng",
      "definition_en": "Software that manages computer hardware and software resources",
      "definition_zh": "管理计算机硬件和软件资源的系统软件",
      "example_zh": "我们需要升级操作系统版本。",
      "example_pinyin": "Wǒmen xūyào shēngjí cāozuò xìtǒng bǎnběn.",
      "example_en": "We need to upgrade the operating system version.",
      "hsk_level_estimate": 4
    }
  ]
}`;

  try {
    const response = await chatCompletion(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { temperature: 0.3, max_tokens: 4096, jsonMode: true }
    );
    const parsed = extractJson(response);
    if (!parsed || !Array.isArray(parsed.terms)) throw new Error('Invalid format');
    return parsed.terms;
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      console.log(`  Retry ${attempt + 1}: ${e.message}`);
      await sleep(API_DELAY_MS * 2);
      return generateVocabBatch(terms, attempt + 1);
    }
    throw e;
  }
}

async function generateDialogue(scenario, attempt = 0) {
  const systemPrompt = `You are a professional dialogue writer for Chinese language learners in tech workplaces. Write realistic, natural Chinese workplace conversations.

Rules:
- Simplified Chinese
- Pinyin with tone marks
- Natural and authentic for Chinese tech companies
- Include technical terms naturally in context
- Each line 1-2 sentences`;

  const userPrompt = `Write a dialogue for: ${scenario.title_en} (${scenario.title_zh})
Context: ${scenario.context}
Participants: ${scenario.participants.join(', ')}
Turns: ${scenario.turns}

Return JSON:
{
  "lines": [{"speaker":"...","role":"...","chinese":"...","pinyin":"...","english":"..."}],
  "key_vocabulary": [{"chinese":"...","pinyin":"...","english":"...","context":"..."}]
}`;

  try {
    const response = await chatCompletion(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      { temperature: 0.5, max_tokens: 4096, jsonMode: true }
    );
    const parsed = extractJson(response);
    if (!parsed || !Array.isArray(parsed.lines)) throw new Error('Invalid format');
    return {
      id: scenario.id,
      title_en: scenario.title_en,
      title_zh: scenario.title_zh,
      category: scenario.category,
      description_en: scenario.context,
      description_zh: '',
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
      console.log(`  Retry ${attempt + 1} for ${scenario.id}: ${e.message}`);
      await sleep(API_DELAY_MS * 2);
      return generateDialogue(scenario, attempt + 1);
    }
    throw e;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  OpenHSK Professional Dataset Expander   ║');
  console.log('║  Target: 350+ terms, 20+ dialogues       ║');
  console.log('╚══════════════════════════════════════════╝');

  if (!API_KEY) {
    console.error('Error: DEEPSEEK_API_KEY environment variable is required');
    process.exit(1);
  }

  fs.mkdirSync(QUALITY_DIR, { recursive: true });

  // ── Vocabulary ───────────────────────────────────────────────────────────
  console.log(`\n━━━ Generating ${SEED_TERMS.length} Vocabulary Terms ━━━`);
  const allTerms = [];
  const BATCH_SIZE = 25;

  for (let i = 0; i < SEED_TERMS.length; i += BATCH_SIZE) {
    const batch = SEED_TERMS.slice(i, i + BATCH_SIZE);
    const catId = batch[0][0];
    process.stdout.write(`  [${i + 1}-${Math.min(i + BATCH_SIZE, SEED_TERMS.length)}] ${catId}... `);

    try {
      const generated = await generateVocabBatch(batch);
      for (let j = 0; j < batch.length; j++) {
        const seed = batch[j];
        const gen = generated[j] || {};
        allTerms.push({
          id: `${seed[0]}_${String(allTerms.filter((t) => t.category === seed[0]).length + 1).padStart(3, '0')}`,
          category: seed[0],
          english: seed[1],
          chinese: seed[2],
          pinyin: seed[3],
          abbreviation: seed[4] || undefined,
          definition_en: gen.definition_en || `${seed[1]} - technical term`,
          definition_zh: gen.definition_zh || `${seed[2]} - 技术术语`,
          example_zh: gen.example_zh || `请检查${seed[2]}的配置。`,
          example_pinyin: gen.example_pinyin || `Qǐng jiǎnchá ${seed[3]} de pèizhì.`,
          example_en: gen.example_en || `Please check the ${seed[1]} configuration.`,
          hsk_level_estimate: gen.hsk_level_estimate || 4,
        });
      }
      console.log(`✓ ${generated.length}`);
      await sleep(API_DELAY_MS);
    } catch (e) {
      console.log(`✗ ${e.message}`);
      // Fallback: add terms without examples
      for (const seed of batch) {
        allTerms.push({
          id: `${seed[0]}_${String(allTerms.filter((t) => t.category === seed[0]).length + 1).padStart(3, '0')}`,
          category: seed[0],
          english: seed[1],
          chinese: seed[2],
          pinyin: seed[3],
          abbreviation: seed[4] || undefined,
          definition_en: `${seed[1]} - technical term`,
          definition_zh: `${seed[2]} - 技术术语`,
          example_zh: `请检查${seed[2]}的配置。`,
          example_pinyin: `Qǐng jiǎnchá ${seed[3]} de pèizhì.`,
          example_en: `Please check the ${seed[1]} configuration.`,
          hsk_level_estimate: 4,
        });
      }
    }
  }

  // Build categories from actual terms
  const categoryMap = new Map();
  for (const cat of SEED_CATEGORIES) {
    categoryMap.set(cat.id, { ...cat, term_count: 0 });
  }
  for (const term of allTerms) {
    const cat = categoryMap.get(term.category);
    if (cat) cat.term_count++;
  }

  const vocabDataset = {
    meta: {
      generated_at: new Date().toISOString(),
      model: MODEL,
      total_terms: allTerms.length,
      categories: [...categoryMap.values()].filter((c) => c.term_count > 0),
    },
    terms: allTerms,
  };

  fs.writeFileSync(VOCAB_OUTPUT, JSON.stringify(vocabDataset, null, 2), 'utf8');
  console.log(`\n  💾 Vocabulary: ${allTerms.length} terms → ${VOCAB_OUTPUT}`);

  // ── Dialogues ────────────────────────────────────────────────────────────
  console.log(`\n━━━ Generating ${DIALOGUE_SCENARIOS.length} Dialogue Scenarios ━━━`);
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

  // Load existing dialogues and merge
  let existingDialogues = [];
  try {
    const existing = JSON.parse(fs.readFileSync(DIALOGUE_OUTPUT, 'utf8'));
    existingDialogues = existing.scenarios || [];
  } catch { /* no existing */ }

  // Merge: keep existing + new (avoid duplicates by id)
  const existingIds = new Set(existingDialogues.map((d) => d.id));
  const mergedDialogues = [...existingDialogues];
  for (const d of allDialogues) {
    if (!existingIds.has(d.id)) {
      mergedDialogues.push(d);
      existingIds.add(d.id);
    }
  }

  const dialogueDataset = {
    meta: {
      generated_at: new Date().toISOString(),
      model: MODEL,
      total_scenarios: mergedDialogues.length,
      categories: [...new Set(mergedDialogues.map((s) => s.category))],
    },
    scenarios: mergedDialogues,
  };

  fs.writeFileSync(DIALOGUE_OUTPUT, JSON.stringify(dialogueDataset, null, 2), 'utf8');
  console.log(`\n  💾 Dialogues: ${mergedDialogues.length} scenarios → ${DIALOGUE_OUTPUT}`);

  // Summary
  const vocabMb = (fs.statSync(VOCAB_OUTPUT).size / 1024 / 1024).toFixed(2);
  const dialogueMb = (fs.statSync(DIALOGUE_OUTPUT).size / 1024 / 1024).toFixed(2);
  console.log('\n━━━ Complete ━━━');
  console.log(`  Terms: ${allTerms.length} (${vocabMb} MB)`);
  console.log(`  Dialogues: ${mergedDialogues.length} (${dialogueMb} MB)`);
}

try {
  await main();
} catch (error) {
  console.error('\nFatal error:', error);
  process.exitCode = 1;
}
