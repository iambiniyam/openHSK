import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DIALOGUE_OUTPUT = path.join(ROOT, 'public', 'quality', 'professional-dialogues.v1.json');

const dataset = JSON.parse(fs.readFileSync(DIALOGUE_OUTPUT, 'utf8'));

const existingIds = new Set(dataset.scenarios.map((s) => s.id));

const newDialogues = [
  {
    id: 'post-mortem',
    title_en: 'Production Incident Post-Mortem',
    title_zh: '线上事故复盘',
    category: 'incident',
    description_en: 'The team is conducting a post-mortem for a production incident where an OTA update bricked some IVI devices in the field.',
    description_zh: '',
    lines: [
      {
        speaker: '事故指挥官',
        role: 'Incident Commander',
        chinese: '感谢大家来参加这次复盘会议。我们先回顾一下上周OTA升级导致设备变砖的问题。',
        pinyin: 'Gǎnxiè dàjiā lái cānjiā zhè cì fùpán huìyì. Wǒmen xiān huígù yīxià shàng zhōu OTA shēngjí dǎozhì shèbèi biàn zhuān de wèntí.',
        english: 'Thank you all for attending this post-mortem meeting. Let\'s first review the OTA upgrade issue that bricked devices last week.',
      },
      {
        speaker: '安卓开发',
        role: 'Android Developer',
        chinese: '根因已经定位清楚了。是OTA脚本在检查分区表时逻辑有漏洞，导致某些旧版本设备的bootloader被覆盖。',
        pinyin: 'Gēn yīn yǐjīng dìngwèi qīngchu le. Shì OTA jiǎoběn zài jiǎnchá fēnqū biǎo shí luójí yǒu lòudòng, dǎozhì mǒu xiē jiù bǎnběn shèbèi de bootloader bèi fùgài.',
        english: 'The root cause has been identified. The OTA script had a logic flaw when checking the partition table, causing the bootloader to be overwritten on some older devices.',
      },
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '那为什么测试环境没有发现？我们的OTA测试用例覆盖了所有设备版本吗？',
        pinyin: 'Nà wèishénme cèshì huánjìng méiyǒu fāxiàn? Wǒmen de OTA cèshì yònglì fùgài le suǒyǒu shèbèi bǎnběn ma?',
        english: 'Then why wasn\'t this caught in the test environment? Do our OTA test cases cover all device versions?',
      },
      {
        speaker: '测试工程师',
        role: 'Test Engineer',
        chinese: '没有，我们只在最新版本上做了OTA测试，旧版本缺少回归测试。这是我的疏忽。',
        pinyin: 'Méiyǒu, wǒmen zhǐ zài zuìxīn bǎnběn shàng zuò le OTA cèshì, jiù bǎnběn quēshǎo huíguī cèshì. Zhè shì wǒ de shūhu.',
        english: 'No, we only performed OTA testing on the latest version. Older versions lacked regression testing. This was my oversight.',
      },
      {
        speaker: '技术主管',
        role: 'Tech Lead',
        chinese: '这不是一个人的责任。我们的测试策略需要改进，OTA升级必须在所有支持的版本上验证。',
        pinyin: 'Zhè bù shì yī gè rén de zérèn. Wǒmen de cèshì cèlüè xūyào gǎijìn, OTA shēngjí bìxū zài suǒyǒu zhīchí de bǎnběn shàng yànzhèng.',
        english: 'This isn\'t one person\'s responsibility. Our testing strategy needs improvement — OTA upgrades must be verified on all supported versions.',
      },
      {
        speaker: '经理',
        role: 'Manager',
        chinese: '影响范围有多大？有多少客户的设备受到了影响？',
        pinyin: 'Yǐngxiǎng fànwéi yǒu duō dà? Yǒu duōshǎo kèhù de shèbèi shòudào le yǐngxiǎng?',
        english: 'How large was the impact? How many customers\' devices were affected?',
      },
      {
        speaker: '安卓开发',
        role: 'Android Developer',
        chinese: '大约三百台设备，主要是去年生产的车型。我们已经发布了修复固件，通过远程升级恢复了大部分设备。',
        pinyin: 'Dàyuē sānbǎi tái shèbèi, zhǔyào shì qùnián shēngchǎn de chēxíng. Wǒmen yǐjīng fābù le xiūfù gùjiàn, tōngguò yuǎnchéng shēngjí huīfù le dà bùfèn shèbèi.',
        english: 'About three hundred devices, mainly from last year\'s production models. We\'ve released a fix firmware and restored most devices via remote upgrade.',
      },
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '经验教训是什么？我们怎么防止再次发生？',
        pinyin: 'Jīngyàn jiàoxùn shì shénme? Wǒmen zěnme fángzhǐ zài cì fāshēng?',
        english: 'What are the lessons learned? How do we prevent this from happening again?',
      },
      {
        speaker: '技术主管',
        role: 'Tech Lead',
        chinese: '第一，OTA测试必须覆盖所有支持的分区表版本。第二，发布前增加灰度发布环节，只推送给1%的设备观察24小时。',
        pinyin: 'Dì yī, OTA cèshì bìxū fùgài suǒyǒu zhīchí de fēnqū biǎo bǎnběn. Dì èr, fābù qián zēngjiā huīdù fābù huánjié, zhǐ tuīsòng gěi 1% de shèbèi guānchá 24 xiǎoshí.',
        english: 'First, OTA testing must cover all supported partition table versions. Second, add a canary release step before full rollout, pushing to only 1% of devices for 24 hours of observation.',
      },
      {
        speaker: '经理',
        role: 'Manager',
        chinese: '好，技术主管负责更新OTA测试规范，测试主管负责补充回归测试用例。本周五前完成。',
        pinyin: 'Hǎo, jìshù zhǔguǎn fùzé gēngxīn OTA cèshì guīfàn, cèshì zhǔguǎn fùzé bǔchōng huíguī cèshì yònglì. Běn zhōu wǔ qián wánchéng.',
        english: 'Good, the tech lead will update the OTA testing specification, and the test lead will supplement the regression test cases. Complete by this Friday.',
      },
      {
        speaker: '事故指挥官',
        role: 'Incident Commander',
        chinese: '还有别的补充吗？没有的话，今天的复盘就到这里。会议纪要我会发给所有人。',
        pinyin: 'Hái yǒu bié de bǔchōng ma? Méiyǒu de huà, jīntiān de fùpán jiù dào zhèlǐ. Huìyì jìyào wǒ huì fā gěi suǒyǒu rén.',
        english: 'Any other additions? If not, today\'s post-mortem ends here. I\'ll send the meeting minutes to everyone.',
      },
      {
        speaker: '全体',
        role: 'All',
        chinese: '没有了，谢谢。',
        pinyin: 'Méiyǒu le, xièxie.',
        english: 'Nothing else, thanks.',
      },
    ],
    key_vocabulary: [
      { chinese: '复盘', pinyin: 'fùpán', english: 'post-mortem', context: 'reviewing an incident to learn lessons' },
      { chinese: '变砖', pinyin: 'biàn zhuān', english: 'to brick (a device)', context: 'device becomes unusable' },
      { chinese: '根因', pinyin: 'gēn yīn', english: 'root cause', context: 'underlying cause of a problem' },
      { chinese: '定位', pinyin: 'dìngwèi', english: 'to locate/debug', context: 'finding the root cause' },
      { chinese: '疏忽', pinyin: 'shūhu', english: 'oversight', context: 'a mistake due to carelessness' },
      { chinese: '灰度发布', pinyin: 'huīdù fābù', english: 'canary release', context: 'gradual rollout to a small user group' },
      { chinese: '经验教训', pinyin: 'jīngyàn jiàoxùn', english: 'lessons learned', context: 'insights gained from a past event' },
      { chinese: '会议纪要', pinyin: 'huìyì jìyào', english: 'meeting minutes', context: 'written record of a meeting' },
    ],
  },
  {
    id: 'tech-interview',
    title_en: 'Technical Interview',
    title_zh: '技术面试',
    category: 'review',
    description_en: 'A senior engineer is interviewing a candidate for an Android test automation position at an automotive company.',
    description_zh: '',
    lines: [
      {
        speaker: '面试官',
        role: 'Interviewer',
        chinese: '你好，请先简单介绍一下自己，重点说说你在Android测试方面的经验。',
        pinyin: 'Nǐ hǎo, qǐng xiān jiǎndān jièshào yīxià zìjǐ, zhòngdiǎn shuōshuo nǐ zài Android cèshì fāngmiàn de jīngyàn.',
        english: 'Hello, please briefly introduce yourself, focusing on your experience in Android testing.',
      },
      {
        speaker: '候选人',
        role: 'Candidate',
        chinese: '您好，我有五年软件测试经验，其中三年专注Android自动化测试。熟悉CTS、UI Automator和Espresso框架。',
        pinyin: 'Nín hǎo, wǒ yǒu wǔ nián ruǎnjiàn cèshì jīngyàn, qízhōng sān nián zhuānzhù Android zìdònghuà cèshì. Shúxī CTS, UI Automator hé Espresso kuàngjià.',
        english: 'Hello, I have five years of software testing experience, including three years focused on Android automated testing. I\'m familiar with CTS, UI Automator, and the Espresso framework.',
      },
      {
        speaker: '面试官',
        role: 'Interviewer',
        chinese: '很好。你提到CTS，能具体说一下CTS测试的流程吗？从环境搭建到报告输出。',
        pinyin: 'Hěn hǎo. Nǐ tí dào CTS, néng jùtǐ shuō yīxià CTS cèshì de liúchéng ma? Cóng huánjìng dājiàn dào bàogào shūchū.',
        english: 'Very good. You mentioned CTS — can you specifically describe the CTS testing workflow? From environment setup to report output.',
      },
      {
        speaker: '候选人',
        role: 'Candidate',
        chinese: '首先搭建Linux测试环境，安装ADB和CTS工具包。然后连接被测设备，执行run cts命令。测试完成后会生成XML结果文件和详细的日志。',
        pinyin: 'Shǒuxiān dājiàn Linux cèshì huánjìng, ānzhuāng ADB hé CTS gōngjù bāo. Ránhòu liánjiē bèi cè shèbèi, zhíxíng run cts mìnglìng. Cèshì wánchéng hòu huì shēngchéng XML jiéguǒ wénjiàn hé xiángxì de rìzhì.',
        english: 'First set up the Linux test environment, install ADB and the CTS toolkit. Then connect the device under test and execute the run cts command. After testing completes, it generates XML result files and detailed logs.',
      },
      {
        speaker: '面试官',
        role: 'Interviewer',
        chinese: '如果CTS测试失败了，你会怎么排查？举个例子。',
        pinyin: 'Rúguǒ CTS cèshì shībài le, nǐ huì zěnme páichá? Jǔ gè lìzi.',
        english: 'If a CTS test fails, how would you troubleshoot? Give an example.',
      },
      {
        speaker: '候选人',
        role: 'Candidate',
        chinese: '我会先看失败用例的日志，定位是环境问题还是代码问题。比如之前遇到过摄像头CTS失败，是因为HAL层没有正确实现接口。',
        pinyin: 'Wǒ huì xiān kàn shībài yònglì de rìzhì, dìngwèi shì huánjìng wèntí háishì dàimǎ wèntí. Bǐrú zhīqián yù dào guò shèxiàngtóu CTS shībài, shì yīnwèi HAL céng méiyǒu zhèngquè shíxiàn jiēkǒu.',
        english: 'I would first look at the failed test case logs to determine if it\'s an environment issue or code issue. For example, I once encountered a camera CTS failure because the HAL layer hadn\'t correctly implemented the interface.',
      },
      {
        speaker: '面试官',
        role: 'Interviewer',
        chinese: '不错。那如果让你设计一个车载系统的自动化测试框架，你会怎么设计？',
        pinyin: 'Bùcuò. Nà rúguǒ ràng nǐ shèjì yī gè chēzài xìtǒng de zìdònghuà cèshì kuàngjià, nǐ huì zěnme shèjì?',
        english: 'Good. If you were to design an automated testing framework for an in-vehicle system, how would you design it?',
      },
      {
        speaker: '候选人',
        role: 'Candidate',
        chinese: '我会分层设计。底层是设备连接和通信层，中间是测试用例管理层，上层是报告和CI集成层。支持并行执行多个设备的测试。',
        pinyin: 'Wǒ huì fēn céng shèjì. Dǐcéng shì shèbèi liánjiē hé tōngxìn céng, zhōngjiān shì cèshì yònglì guǎnlǐ céng, shàngcéng shì bàogào hé CI jíchéng céng. Zhīchí bìngxíng zhíxíng duō gè shèbèi de cèshì.',
        english: 'I would design it in layers. The bottom layer is device connection and communication, the middle is test case management, and the top is reporting and CI integration. It would support parallel execution of tests on multiple devices.',
      },
      {
        speaker: '面试官',
        role: 'Interviewer',
        chinese: '你的期望薪资是多少？最快什么时候可以入职？',
        pinyin: 'Nǐ de qīwàng xīn zī shì duōshǎo? Zuìkuài shénme shíhou kěyǐ rùzhí?',
        english: 'What is your expected salary? When is the earliest you can start?',
      },
      {
        speaker: '候选人',
        role: 'Candidate',
        chinese: '期望年薪四十到五十万，一个月内可以入职。如果贵公司平台好，我也可以适当调整。',
        pinyin: 'Qīwàng nián xīn sìshí dào wǔshí wàn, yī gè yuè nèi kěyǐ rùzhí. Rúguǒ guì gōngsī píngtái hǎo, wǒ yě kěyǐ shìdàng tiáozhěng.',
        english: 'Expected annual salary is 400-500K RMB, can start within one month. If your company has a good platform, I can be flexible.',
      },
      {
        speaker: '面试官',
        role: 'Interviewer',
        chinese: '好的，今天的面试就到这里。我们会在一周内给你反馈，无论结果如何都会通知你。谢谢你的时间。',
        pinyin: 'Hǎo de, jīntiān de miànshì jiù dào zhèlǐ. Wǒmen huì zài yī zhōu nèi gěi nǐ fǎnkuì, wúlùn jiéguǒ rúhé dōu huì tōngzhī nǐ. Xièxie nǐ de shíjiān.',
        english: 'Okay, that\'s all for today\'s interview. We\'ll give you feedback within a week and will notify you regardless of the outcome. Thank you for your time.',
      },
      {
        speaker: '候选人',
        role: 'Candidate',
        chinese: '谢谢您给我这次机会，期待能加入团队。再见。',
        pinyin: 'Xièxie nín gěi wǒ zhè cì jīhuì, qīdài néng jiārù tuánduì. Zàijiàn.',
        english: 'Thank you for this opportunity, I look forward to joining the team. Goodbye.',
      },
    ],
    key_vocabulary: [
      { chinese: '自我介绍', pinyin: 'zìwǒ jièshào', english: 'self-introduction', context: 'introducing oneself in an interview' },
      { chinese: '自动化测试', pinyin: 'zìdònghuà cèshì', english: 'automated testing', context: 'testing using scripts and tools' },
      { chinese: '环境搭建', pinyin: 'huánjìng dājiàn', english: 'environment setup', context: 'configuring test environments' },
      { chinese: '排查', pinyin: 'páichá', english: 'troubleshoot', context: 'investigating and resolving issues' },
      { chinese: '分层设计', pinyin: 'fēn céng shèjì', english: 'layered design', context: 'architectural design with separate layers' },
      { chinese: '并行执行', pinyin: 'bìngxíng zhíxíng', english: 'parallel execution', context: 'running multiple tests simultaneously' },
      { chinese: '期望薪资', pinyin: 'qīwàng xīn zī', english: 'expected salary', context: 'salary expectation in job negotiation' },
      { chinese: '入职', pinyin: 'rùzhí', english: 'onboarding/start date', context: 'starting a new job' },
    ],
  },
  {
    id: 'merge-conflict',
    title_en: 'Resolving a Merge Conflict',
    title_zh: '解决代码冲突',
    category: 'technical',
    description_en: 'Two developers are discussing how to resolve a complex merge conflict in the HAL layer code after a long-running feature branch.',
    description_zh: '',
    lines: [
      {
        speaker: '开发A',
        role: 'Developer A',
        chinese: '你那个feature分支合并到主干的时候冲突了，主要是在audio HAL这里，你有空一起看看吗？',
        pinyin: 'Nǐ nàgè feature fēnzhī hébìng dào zhǔgàn de shíhou chōngtū le, zhǔyào shì zài audio HAL zhèlǐ, nǐ yǒu kòng yīqǐ kànkan ma?',
        english: 'Your feature branch had conflicts when merging into main, mainly in the audio HAL. Do you have time to look at it together?',
      },
      {
        speaker: '开发B',
        role: 'Developer B',
        chinese: '好的，我看看。哦，是因为我改了接口定义，你那边同时改了实现逻辑，所以冲突了。',
        pinyin: 'Hǎo de, wǒ kànkan. Ó, shì yīnwèi wǒ gǎi le jiēkǒu dìngyì, nǐ nàbiān tóngshí gǎi le shíxiàn luójí, suǒyǐ chōngtū le.',
        english: 'Okay, let me see. Oh, it\'s because I changed the interface definition while you changed the implementation logic at the same time, so there was a conflict.',
      },
      {
        speaker: '开发A',
        role: 'Developer A',
        chinese: '对，你的新接口参数多了个callback，但我的实现还是按老版本写的。你打算怎么处理？',
        pinyin: 'Duì, nǐ de xīn jiēkǒu cānshù duō le gè callback, dàn wǒ de shíxiàn háishì àn lǎo bǎnběn xiě de. Nǐ dǎsuàn zěnme chǔlǐ?',
        english: 'Right, your new interface added a callback parameter, but my implementation was still written for the old version. How do you plan to handle this?',
      },
      {
        speaker: '开发B',
        role: 'Developer B',
        chinese: '我的建议是保留新接口，你在实现里加上callback的处理。如果为空就按原来的逻辑走，这样兼容性好。',
        pinyin: 'Wǒ de jiànyì shì bǎoliú xīn jiēkǒu, nǐ zài shíxiàn lǐ jiā shàng callback de chǔlǐ. Rúguǒ wéi kōng jiù àn yuánlái de luójí zǒu, zhèyàng jiān róng xìng hǎo.',
        english: 'My suggestion is to keep the new interface, and you add callback handling in the implementation. If it\'s null, follow the original logic — this provides better compatibility.',
      },
      {
        speaker: '开发A',
        role: 'Developer A',
        chinese: '可以，但我需要改的地方比较多，估计要半天时间。会影响今天的版本发布吗？',
        pinyin: 'Kěyǐ, dàn wǒ xūyào gǎi de dìfāng bǐjiào duō, gūjì yào bàn tiān shíjiān. Huì yǐngxiǎng jīntiān de bǎnběn fābù ma?',
        english: 'Okay, but I need to change quite a few places, probably half a day. Will it affect today\'s version release?',
      },
      {
        speaker: '开发B',
        role: 'Developer B',
        chinese: '那这样吧，我先回退我的接口修改，你用原来的版本先合进去。等发布完了我再提交新的接口。',
        pinyin: 'Nà zhèyàng ba, wǒ xiān huítuì wǒ de jiēkǒu xiūgǎi, nǐ yòng yuánlái de bǎnběn xiān hé jìnqù. Děng fābù wán le wǒ zài tíjiāo xīn de jiēkǒu.',
        english: 'How about this: I\'ll first revert my interface changes, and you merge with the original version first. After the release is done, I\'ll submit the new interface.',
      },
      {
        speaker: '开发A',
        role: 'Developer A',
        chinese: '这样最稳妥。不过你回退的时候要小心，别把别的改动也回退了。',
        pinyin: 'Zhèyàng zuì wěntuǒ. Búguò nǐ huítuì de shíhou yào xiǎoxīn, bié bǎ bié de gǎidòng yě huítuì le.',
        english: 'That\'s the safest way. But be careful when reverting — don\'t revert other changes too.',
      },
      {
        speaker: '开发B',
        role: 'Developer B',
        chinese: '放心，我只回退audio HAL那个commit。回退完我拉你一起review一下。',
        pinyin: 'Fàngxīn, wǒ zhǐ huítuì audio HAL nàgè commit. Huítuì wán wǒ lā nǐ yīqǐ review yīxià.',
        english: 'Don\'t worry, I\'ll only revert that audio HAL commit. After reverting, I\'ll pull you in to review together.',
      },
      {
        speaker: '开发A',
        role: 'Developer A',
        chinese: '好，合进去之后记得跑一遍冒烟测试，确认HAL层没有回归问题。',
        pinyin: 'Hǎo, hé jìnqù zhīhòu jìde pǎo yī biàn yānmào cèshì, quèrèn HAL céng méiyǒu huíguī wèntí.',
        english: 'Good, remember to run a smoke test after merging to confirm there are no HAL layer regression issues.',
      },
      {
        speaker: '开发B',
        role: 'Developer B',
        chinese: '没问题，我这就去处理。一会儿在群里@你。',
        pinyin: 'Méi wèntí, wǒ zhè jiù qù chǔlǐ. Yīhuìr zài qún lǐ @ nǐ.',
        english: 'No problem, I\'ll handle it right now. I\'ll @ you in the group chat in a bit.',
      },
    ],
    key_vocabulary: [
      { chinese: '冲突', pinyin: 'chōngtū', english: 'conflict', context: 'code merge conflict' },
      { chinese: '接口定义', pinyin: 'jiēkǒu dìngyì', english: 'interface definition', context: 'defining API contracts' },
      { chinese: '实现逻辑', pinyin: 'shíxiàn luójí', english: 'implementation logic', context: 'the logic inside code implementation' },
      { chinese: '回调', pinyin: 'huídiào', english: 'callback', context: 'asynchronous function call pattern' },
      { chinese: '兼容性', pinyin: 'jiān róng xìng', english: 'compatibility', context: 'backward compatibility in code' },
      { chinese: '回退', pinyin: 'huítuì', english: 'revert', context: 'undoing a code change' },
      { chinese: '冒烟测试', pinyin: 'yānmào cèshì', english: 'smoke test', context: 'quick verification after changes' },
      { chinese: '回归问题', pinyin: 'huíguī wèntí', english: 'regression issue', context: 'previously working feature now broken' },
    ],
  },
  {
    id: 'requirement-clarification',
    title_en: 'Requirement Clarification',
    title_zh: '需求澄清',
    category: 'planning',
    description_en: 'Developers and testers are asking the product manager to clarify ambiguous requirements for a new IVI voice control feature.',
    description_zh: '',
    lines: [
      {
        speaker: '开发工程师',
        role: 'Developer',
        chinese: '产品经理，关于这个语音控制的需求文档，有几个地方不太清楚，能澄清一下吗？',
        pinyin: 'Chǎnpǐn jīnglǐ, guānyú zhège yǔyīn kòngzhì de xūqiú wéndàng, yǒu jǐ gè dìfāng bù tài qīngchu, néng chéngqīng yīxià ma?',
        english: 'Product manager, regarding the voice control requirements document, there are a few things that aren\'t very clear. Can you clarify?',
      },
      {
        speaker: '产品经理',
        role: 'Product Manager',
        chinese: '当然可以，哪些地方不清楚？',
        pinyin: 'Dāngrán kěyǐ, nǎxiē dìfāng bù qīngchu?',
        english: 'Of course, which parts are unclear?',
      },
      {
        speaker: '测试工程师',
        role: 'Test Engineer',
        chinese: '文档里说"支持自然语言交互"，这个范围太广了。具体要支持哪些指令？打开导航、调节温度，还有别的吗？',
        pinyin: 'Wéndàng lǐ shuō "zhīchí zìrán yǔyán jiāohù", zhège fànwéi tài guǎng le. Jùtǐ yào zhīchí nǎxiē zhǐlìng? Dǎkāi dǎoháng, tiáojié wēndù, hái yǒu bié de ma?',
        english: 'The document says "supports natural language interaction," but that scope is too broad. Which commands specifically need to be supported? Open navigation, adjust temperature, and what else?',
      },
      {
        speaker: '产品经理',
        role: 'Product Manager',
        chinese: '第一期只做导航、音乐、空调这三个模块的语音控制。打电话和车窗控制放到第二期。',
        pinyin: 'Dì yī qī zhǐ zuò dǎoháng, yīnyuè, kōngtiáo zhè sān gè mókuài de yǔyīn kòngzhì. Dǎ diànhuà hé chēchuāng kòngzhì fàng dào dì èr qī.',
        english: 'Phase one only covers voice control for navigation, music, and AC. Phone calls and window control are for phase two.',
      },
      {
        speaker: '开发工程师',
        role: 'Developer',
        chinese: '那如果用户说的是方言，比如四川话，我们需要支持吗？',
        pinyin: 'Nà rúguǒ yònghù shuō de shì fāngyán, bǐrú Sìchuān huà, wǒmen xūyào zhīchí ma?',
        english: 'What if the user speaks a dialect, like Sichuanese? Do we need to support that?',
      },
      {
        speaker: '产品经理',
        role: 'Product Manager',
        chinese: '第一期只支持普通话，方言支持后续再评估。但设计上要预留扩展接口。',
        pinyin: 'Dì yī qī zhǐ zhīchí Pǔtōnghuà, fāngyán zhīchí hòuxù zài pínggū. Dàn shèjì shàng yào yùliú kuòzhǎn jiēkǒu.',
        english: 'Phase one only supports Mandarin. Dialect support will be evaluated later. But the design should预留 extension interfaces.',
      },
      {
        speaker: '测试工程师',
        role: 'Test Engineer',
        chinese: '还有一个问题，响应时间的指标是多少？文档里没写。用户说完指令后，系统要在几秒内响应？',
        pinyin: 'Hái yǒu yī gè wèntí, xiǎngyìng shíjiān de zhǐbiāo shì duōshǎo? Wéndàng lǐ méi xiě. Yònghù shuō wán zhǐlìng hòu, xìtǒng yào zài jǐ miǎo nèi xiǎngyìng?',
        english: 'One more question — what\'s the response time target? It\'s not written in the document. After the user gives a command, how many seconds should the system respond within?',
      },
      {
        speaker: '产品经理',
        role: 'Product Manager',
        chinese: '好问题。要求是1.5秒内给出语音反馈，3秒内完成操作。这个我会更新到文档里。',
        pinyin: 'Hǎo wèntí. Yāoqiú shì 1.5 miǎo nèi gěi chū yǔyīn fǎnkuì, 3 miǎo nèi wánchéng cāozuò. Zhège wǒ huì gēngxīn dào wéndàng lǐ.',
        english: 'Good question. The requirement is to provide voice feedback within 1.5 seconds and complete the operation within 3 seconds. I\'ll update this in the document.',
      },
      {
        speaker: '开发工程师',
        role: 'Developer',
        chinese: '清楚了。那交互流程呢？用户说完指令后，系统要不要重复确认？还是直接执行？',
        pinyin: 'Qīngchu le. Nà jiāohù liúchéng ne? Yònghù shuō wán zhǐlìng hòu, xìtǒng yào bu yào chóngfù quèrèn? Háishì zhíjiē zhíxíng?',
        english: 'Clear. What about the interaction flow? After the user gives a command, should the system repeat for confirmation, or execute directly?',
      },
      {
        speaker: '产品经理',
        role: 'Product Manager',
        chinese: '安全相关的指令，比如导航，需要语音确认一次。音乐和空调可以直接执行。这个规则我写进PRD里。',
        pinyin: 'Ānquán xiāngguān de zhǐlìng, bǐrú dǎoháng, xūyào yǔyīn quèrèn yī cì. Yīnyuè hé kōngtiáo kěyǐ zhíjiē zhíxíng. Zhège guīzé wǒ xiě jìn PRD lǐ.',
        english: 'For safety-related commands like navigation, voice confirmation is needed once. Music and AC can execute directly. I\'ll write this rule into the PRD.',
      },
      {
        speaker: '测试工程师',
        role: 'Test Engineer',
        chinese: '好的，那我们等文档更新后开始写测试用例。谢谢！',
        pinyin: 'Hǎo de, nà wǒmen děng wéndàng gēngxīn hòu kāishǐ xiě cèshì yònglì. Xièxie!',
        english: 'Okay, we\'ll start writing test cases after the document is updated. Thanks!',
      },
    ],
    key_vocabulary: [
      { chinese: '需求澄清', pinyin: 'xūqiú chéngqīng', english: 'requirement clarification', context: 'making requirements clear and specific' },
      { chinese: '自然语言', pinyin: 'zìrán yǔyán', english: 'natural language', context: 'human spoken language vs. commands' },
      { chinese: '指令', pinyin: 'zhǐlìng', english: 'command/instruction', context: 'voice commands given to the system' },
      { chinese: '方言', pinyin: 'fāngyán', english: 'dialect', context: 'regional variations of Chinese' },
      { chinese: '预留接口', pinyin: 'yùliú jiēkǒu', english: 'reserve interface', context: 'designing for future extensibility' },
      { chinese: '响应时间', pinyin: 'xiǎngyìng shíjiān', english: 'response time', english: 'time taken to respond to a request' },
      { chinese: '语音反馈', pinyin: 'yǔyīn fǎnkuì', english: 'voice feedback', context: 'system speaking back to the user' },
      { chinese: '测试用例', pinyin: 'cèshì yònglì', english: 'test case', context: 'specific scenario to test' },
    ],
  },
  {
    id: 'email-report',
    title_en: 'Writing a Test Report Email',
    title_zh: '撰写测试报告邮件',
    category: 'review',
    description_en: 'A test lead is dictating an email to report weekly test results to stakeholders, including pass rates, critical issues, and next week\'s plan.',
    description_zh: '',
    lines: [
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '帮我写个邮件，汇报这周的测试进展。收件人是项目总监和开发负责人。',
        pinyin: 'Bāng wǒ xiě gè yóujiàn, huìbào zhè zhōu de cèshì jìnzhǎn. Shōujiàn rén shì xiàngmù zǒngjiān hé kāifā fùzé rén.',
        english: 'Help me write an email reporting this week\'s testing progress. Recipients are the project director and development lead.',
      },
      {
        speaker: '助理',
        role: 'Assistant',
        chinese: '好的，请说。',
        pinyin: 'Hǎo de, qǐng shuō.',
        english: 'Okay, please go ahead.',
      },
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '主题写：IVI项目第12周测试报告。开头写：各位好，以下是本周测试进展汇报。',
        pinyin: 'Zhǔtí xiě: IVI xiàngmù dì 12 zhōu cèshì bàogào. Kāitóu xiě: Gèwèi hǎo, yǐxià shì běn zhōu cèshì jìnzhǎn huìbào.',
        english: 'Subject: IVI Project Week 12 Test Report. Opening: Hello everyone, below is the weekly testing progress report.',
      },
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '正文第一段：本周共执行CTS用例3847条，通过率94.2%，比上周提升1.5个百分点。',
        pinyin: 'Zhèngwén dì yī duàn: Běn zhōu gòng zhíxíng CTS yònglì 3847 tiáo, tōngguò lǜ 94.2%, bǐ shàng zhōu tíshēng 1.5 gè bǎifēn diǎn.',
        english: 'Body paragraph 1: This week we executed 3,847 CTS test cases with a 94.2% pass rate, up 1.5 percentage points from last week.',
      },
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '第二段：遗留高风险问题2个。一是蓝牙配对后在某些车型上自动断开，二是OTA升级进度条显示不准确。',
        pinyin: 'Dì èr duàn: Yíliú gāo fēngxiǎn wèntí 2 gè. Yī shì lányá pèiduì hòu zài mǒu xiē chēxíng shàng zìdòng duàn kāi, èr shì OTA shēngjí jìndù tiáo xiǎnshì bù zhǔnquè.',
        english: 'Paragraph 2: Two high-risk issues remain. First, Bluetooth auto-disconnects on some models after pairing. Second, the OTA upgrade progress bar display is inaccurate.',
      },
      {
        speaker: '助理',
        role: 'Assistant',
        chinese: '需要写预计修复时间吗？',
        pinyin: 'Xūyào xiě yùjì xiūfù shíjiān ma?',
        english: 'Do we need to include estimated fix times?',
      },
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '加一句：蓝牙问题开发已定位根因，预计下周三修复。OTA问题正在排查，预计下周五前给出方案。',
        pinyin: 'Jiā yī jù: Lányá wèntí kāifā yǐ dìngwèi gēn yīn, yùjì xià zhōu sān xiūfù. OTA wèntí zhèngzài páichá, yùjì xià zhōu wǔ qián gěi chū fāng\'àn.',
        english: 'Add: The Bluetooth issue root cause has been identified by development, estimated fix next Wednesday. The OTA issue is under investigation, with a solution expected by next Friday.',
      },
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '第三段写下周计划：下周重点验证蓝牙修复和OTA问题，同时开始多媒体模块的兼容性测试。',
        pinyin: 'Dì sān duàn xiě xià zhōu jìhuà: Xià zhōu zhòngdiǎn yànzhèng lányá xiūfù hé OTA wèntí, tóngshí kāishǐ duōméitǐ mókuài de jiān róng xìng cèshì.',
        english: 'Paragraph 3 on next week\'s plan: Next week\'s focus is verifying the Bluetooth fix and OTA issue, while starting compatibility testing for the multimedia module.',
      },
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '结尾写：如有疑问请随时联系。附件是详细的测试报告。谢谢！',
        pinyin: 'Jiéwěi xiě: Rú yǒu yíwèn qǐng suíshí liánxì. Fùjiàn shì xiángxì de cèshì bàogào. Xièxie!',
        english: 'Closing: Please feel free to reach out if you have any questions. Attached is the detailed test report. Thanks!',
      },
      {
        speaker: '助理',
        role: 'Assistant',
        chinese: '写好了，您看看。需要抄送测试团队吗？',
        pinyin: 'Xiě hǎo le, nín kànkan. Xūyào chāosòng cèshì tuánduì ma?',
        english: 'Done, please take a look. Should we CC the test team?',
      },
      {
        speaker: '测试主管',
        role: 'Test Lead',
        chinese: '抄送整个测试团队，还有产品经理。可以发了。',
        pinyin: 'Chāosòng zhěnggè cèshì tuánduì, hái yǒu chǎnpǐn jīnglǐ. Kěyǐ fā le.',
        english: 'CC the entire test team and the product manager. You can send it.',
      },
    ],
    key_vocabulary: [
      { chinese: '汇报', pinyin: 'huìbào', english: 'report', context: 'presenting progress to stakeholders' },
      { chinese: '通过率', pinyin: 'tōngguò lǜ', english: 'pass rate', context: 'percentage of passed tests' },
      { chinese: '遗留问题', pinyin: 'yíliú wèntí', english: 'outstanding issue', context: 'issues not yet resolved' },
      { chinese: '排查', pinyin: 'páichá', english: 'troubleshoot', context: 'investigating problems' },
      { chinese: '根因', pinyin: 'gēn yīn', english: 'root cause', context: 'underlying cause' },
      { chinese: '预计', pinyin: 'yùjì', english: 'estimate/expected', context: 'projected timeline' },
      { chinese: '验证', pinyin: 'yànzhèng', english: 'verify', context: 'confirming fixes work' },
      { chinese: '抄送', pinyin: 'chāosòng', english: 'CC (carbon copy)', context: 'sending a copy to additional recipients' },
    ],
  },
];

let added = 0;
for (const dialogue of newDialogues) {
  if (!existingIds.has(dialogue.id)) {
    dataset.scenarios.push(dialogue);
    existingIds.add(dialogue.id);
    added++;
  }
}

dataset.meta.total_scenarios = dataset.scenarios.length;
dataset.meta.categories = [...new Set(dataset.scenarios.map((s) => s.category))];
dataset.meta.generated_at = new Date().toISOString();
dataset.meta.note = `${added} manually curated dialogues added`;

fs.writeFileSync(DIALOGUE_OUTPUT, JSON.stringify(dataset, null, 2), 'utf8');

console.log(`Added ${added} new dialogues`);
console.log(`Total dialogues: ${dataset.scenarios.length}`);
console.log(`Categories: ${dataset.meta.categories.join(', ')}`);
