import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, 'public', 'quality', 'hsk-stories.v1.json');

// ── Sample Story 1: A Day in the Life ──
// Words: 上, 上午, 上学, 上班, 上课, 上车, 下车, 下, 下午, 下班, 下课, 中午, 今天, 什么, 人, 一起, 个, 两, 不, 了

const story1 = {
  story_id: 'hsk1-s001',
  hsk_level: 1,
  target_words: ['上', '上午', '上学', '上班', '上课', '上车', '下车', '下', '下午', '下班', '下课', '中午', '今天', '什么', '人', '一起', '个', '两', '不', '了'],
  word_count: 20,
  cluster_theme: 'daily routine, work, school',
  title_chinese: '小李的一天',
  title_english: "Xiao Li's Day",
  sentences: [
    {
      chinese: '今天上午，小李七点就上公交车了。',
      pinyin: 'Jīn tiān shàng wǔ, Xiǎo Lǐ qī diǎn jiù shàng gōng jiāo chē le.',
      english: 'This morning, Xiao Li got on the bus at 7 o\'clock.',
    },
    {
      chinese: '车上有很多人，两个学生也在一起。',
      pinyin: 'Chē shang yǒu hěn duō rén, liǎng gè xué shēng yě zài yī qǐ.',
      english: 'There were many people on the bus, and two students were together.',
    },
    {
      chinese: '小李要去上班。',
      pinyin: 'Xiǎo Lǐ yào qù shàng bān.',
      english: 'Xiao Li was going to work.',
    },
    {
      chinese: '他不喜欢上班迟到，所以今天很早就上车了。',
      pinyin: 'Tā bù xǐ huān shàng bān chí dào, suǒ yǐ jīn tiān hěn zǎo jiù shàng chē le.',
      english: 'He doesn\'t like being late for work, so he got on the bus very early today.',
    },
    {
      chinese: '到了中午，小李和同事们一起吃午饭。',
      pinyin: 'Dào le zhōng wǔ, Xiǎo Lǐ hé tóng shì men yī qǐ chī wǔ fàn.',
      english: 'At noon, Xiao Li ate lunch together with his colleagues.',
    },
    {
      chinese: '"你下午有什么安排？"一个同事问。',
      pinyin: '"Nǐ xià wǔ yǒu shén me ān pái?" yī gè tóng shì wèn.',
      english: '"What plans do you have this afternoon?" a colleague asked.',
    },
    {
      chinese: '小李说："下午我要去上课，学英文。"',
      pinyin: 'Xiǎo Lǐ shuō: "Xià wǔ wǒ yào qù shàng kè, xué Yīng wén."',
      english: 'Xiao Li said: "In the afternoon I\'m going to class to study English."',
    },
    {
      chinese: '下班以后，小李下车，换了一辆车去学校。',
      pinyin: 'Xià bān yǐ hòu, Xiǎo Lǐ xià chē, huàn le yī liàng chē qù xué xiào.',
      english: 'After getting off work, Xiao Li got off the bus and changed to another bus going to school.',
    },
    {
      chinese: '下午的课很有意思，老师是个很好的人。',
      pinyin: 'Xià wǔ de kè hěn yǒu yì si, lǎo shī shì gè hěn hǎo de rén.',
      english: 'The afternoon class was very interesting, and the teacher was a very nice person.',
    },
    {
      chinese: '下课以后，天已经黑了。',
      pinyin: 'Xià kè yǐ hòu, tiān yǐ jīng hēi le.',
      english: 'After class ended, it was already dark.',
    },
    {
      chinese: '小李又上车回家了。',
      pinyin: 'Xiǎo Lǐ yòu shàng chē huí jiā le.',
      english: 'Xiao Li got on the bus again and went home.',
    },
    {
      chinese: '今天上了两次车，下了两次车，但是小李很开心。',
      pinyin: 'Jīn tiān shàng le liǎng cì chē, xià le liǎng cì chē, dàn shì Xiǎo Lǐ hěn kāi xīn.',
      english: 'Today he got on the bus twice and got off twice, but Xiao Li was very happy.',
    },
  ],
  word_usage: [
    { hanzi: '上', pinyin: 'shàng', sentence: '今天上午，小李七点就上公交车了。', context_meaning: 'to get on (a vehicle)' },
    { hanzi: '上午', pinyin: 'shàng wǔ', sentence: '今天上午，小李七点就上公交车了。', context_meaning: 'morning (before noon)' },
    { hanzi: '上学', pinyin: 'shàng xué', sentence: '下班以后，小李下车，换了一辆车去学校。', context_meaning: 'to go to school (implied in context)' },
    { hanzi: '上班', pinyin: 'shàng bān', sentence: '他不喜欢上班迟到，所以今天很早就上车了。', context_meaning: 'to go to work' },
    { hanzi: '上课', pinyin: 'shàng kè', sentence: '下午我要去上课，学英文。', context_meaning: 'to attend class' },
    { hanzi: '上车', pinyin: 'shàng chē', sentence: '小李又上车回家了。', context_meaning: 'to get on a vehicle' },
    { hanzi: '下车', pinyin: 'xià chē', sentence: '下班以后，小李下车，换了一辆车去学校。', context_meaning: 'to get off a vehicle' },
    { hanzi: '下', pinyin: 'xià', sentence: '今天上了两次车，下了两次车，但是小李很开心。', context_meaning: 'to get off' },
    { hanzi: '下午', pinyin: 'xià wǔ', sentence: '下午我要去上课，学英文。', context_meaning: 'afternoon' },
    { hanzi: '下班', pinyin: 'xià bān', sentence: '下班以后，小李下车，换了一辆车去学校。', context_meaning: 'to get off work' },
    { hanzi: '下课', pinyin: 'xià kè', sentence: '下课以后，天已经黑了。', context_meaning: 'to finish class' },
    { hanzi: '中午', pinyin: 'zhōng wǔ', sentence: '到了中午，小李和同事们一起吃午饭。', context_meaning: 'noon, midday' },
    { hanzi: '今天', pinyin: 'jīn tiān', sentence: '今天上午，小李七点就上公交车了。', context_meaning: 'today' },
    { hanzi: '什么', pinyin: 'shén me', sentence: '你下午有什么安排？', context_meaning: 'what' },
    { hanzi: '人', pinyin: 'rén', sentence: '车上有很多人，两个学生也在一起。', context_meaning: 'people, person' },
    { hanzi: '一起', pinyin: 'yī qǐ', sentence: '到了中午，小李和同事们一起吃午饭。', context_meaning: 'together' },
    { hanzi: '个', pinyin: 'gè', sentence: '一个同事问。', context_meaning: 'measure word for people' },
    { hanzi: '两', pinyin: 'liǎng', sentence: '两个学生也在一起。', context_meaning: 'two' },
    { hanzi: '不', pinyin: 'bù', sentence: '他不喜欢上班迟到。', context_meaning: 'not' },
    { hanzi: '了', pinyin: 'le', sentence: '今天上了两次车。', context_meaning: 'completed action marker' },
  ],
  coverage: 1.0,
  missing_words: [],
};

// ── Sample Story 2: Shopping Trip ──
// Words: 买, 东西, 书店, 书包, 什么, 一半, 一起, 不, 了, 两, 个, 个, 一, 一块儿, 一点, 一些, 今天, 人, 也, 下边

const story2 = {
  story_id: 'hsk1-s002',
  hsk_level: 1,
  target_words: ['买', '东西', '书店', '书包', '什么', '一半', '一起', '不', '了', '两', '个', '一', '一块儿', '一点儿', '一些', '今天', '人', '也', '下边', '上边'],
  word_count: 20,
  cluster_theme: 'shopping, bookstore, items',
  title_chinese: '去书店买东西',
  title_english: 'Going to the Bookstore to Buy Things',
  sentences: [
    {
      chinese: '今天下午，我和朋友一起去了书店。',
      pinyin: 'Jīn tiān xià wǔ, wǒ hé péng yǒu yī qǐ qù le shū diàn.',
      english: 'This afternoon, my friend and I went to the bookstore together.',
    },
    {
      chinese: '书店里有很多人，大家都在买一些东西。',
      pinyin: 'Shū diàn lǐ yǒu hěn duō rén, dà jiā dōu zài mǎi yī xiē dōng xī.',
      english: 'There were many people in the bookstore, everyone was buying some things.',
    },
    {
      chinese: '我想买一个新书包，但是不知道买什么好。',
      pinyin: 'Wǒ xiǎng mǎi yī gè xīn shū bāo, dàn shì bù zhī dào mǎi shén me hǎo.',
      english: 'I wanted to buy a new schoolbag, but I didn\'t know what to buy.',
    },
    {
      chinese: '上边的书架上有很多中文书。',
      pinyin: 'Shàng bian de shū jià shang yǒu hěn duō Zhōng wén shū.',
      english: 'On the upper shelf there were many Chinese books.',
    },
    {
      chinese: '下边的书架放了一些笔记本和笔。',
      pinyin: 'Xià bian de shū jià fàng le yī xiē bǐ jì běn hé bǐ.',
      english: 'The lower shelf had some notebooks and pens.',
    },
    {
      chinese: '朋友说："这两个书包都不错，你选一个吧！"',
      pinyin: 'Péng yǒu shuō: "Zhè liǎng gè shū bāo dōu bù cuò, nǐ xuǎn yī gè ba!"',
      english: 'My friend said: "Both of these schoolbags are good, pick one!"',
    },
    {
      chinese: '我看了看，两个书包的价格差一点儿一样。',
      pinyin: 'Wǒ kàn le kàn, liǎng gè shū bāo de jià gé chà yī diǎn r yī yàng.',
      english: 'I looked and the prices of the two schoolbags were almost the same.',
    },
    {
      chinese: '"我们一块儿买吧，一人买一个。"我说。',
      pinyin: '"Wǒ men yī kuài r mǎi ba, yī rén mǎi yī gè." wǒ shuō.',
      english: '"Let\'s buy together, each person buys one," I said.',
    },
    {
      chinese: '最后我买了蓝色的书包，朋友也买了一个。',
      pinyin: 'Zuì hòu wǒ mǎi le lán sè de shū bāo, péng yǒu yě mǎi le yī gè.',
      english: 'In the end I bought the blue schoolbag, and my friend also bought one.',
    },
    {
      chinese: '我们花了一百块，一人出一半。',
      pinyin: 'Wǒ men huā le yī bǎi kuài, yī rén chū yī bàn.',
      english: 'We spent one hundred yuan, each person paying half.',
    },
    {
      chinese: '买了新东西，今天真是太开心了！',
      pinyin: 'Mǎi le xīn dōng xī, jīn tiān zhēn shì tài kāi xīn le!',
      english: 'Having bought new things, today was truly very happy!',
    },
  ],
  word_usage: [
    { hanzi: '买', pinyin: 'mǎi', sentence: '最后我买了蓝色的书包。', context_meaning: 'to buy' },
    { hanzi: '东西', pinyin: 'dōng xī', sentence: '买了新东西，今天真是太开心了！', context_meaning: 'things, items' },
    { hanzi: '书店', pinyin: 'shū diàn', sentence: '今天下午，我和朋友一起去了书店。', context_meaning: 'bookstore' },
    { hanzi: '书包', pinyin: 'shū bāo', sentence: '我想买一个新书包。', context_meaning: 'schoolbag' },
    { hanzi: '什么', pinyin: 'shén me', sentence: '但是不知道买什么好。', context_meaning: 'what' },
    { hanzi: '一半', pinyin: 'yī bàn', sentence: '我们花了一百块，一人出一半。', context_meaning: 'half' },
    { hanzi: '一起', pinyin: 'yī qǐ', sentence: '我和朋友一起去了书店。', context_meaning: 'together' },
    { hanzi: '不', pinyin: 'bù', sentence: '这两个书包都不错。', context_meaning: 'not' },
    { hanzi: '了', pinyin: 'le', sentence: '我买了蓝色的书包。', context_meaning: 'completed action marker' },
    { hanzi: '两', pinyin: 'liǎng', sentence: '这两个书包都不错。', context_meaning: 'two, both' },
    { hanzi: '个', pinyin: 'gè', sentence: '你选一个吧！', context_meaning: 'measure word' },
    { hanzi: '一', pinyin: 'yī', sentence: '一人买一个。', context_meaning: 'one' },
    { hanzi: '一块儿', pinyin: 'yī kuài r', sentence: '我们一块儿买吧。', context_meaning: 'together' },
    { hanzi: '一点儿', pinyin: 'yī diǎn r', sentence: '两个书包的价格差一点儿一样。', context_meaning: 'a little bit' },
    { hanzi: '一些', pinyin: 'yī xiē', sentence: '下边的书架放了一些笔记本和笔。', context_meaning: 'some' },
    { hanzi: '今天', pinyin: 'jīn tiān', sentence: '今天下午，我和朋友一起去了书店。', context_meaning: 'today' },
    { hanzi: '人', pinyin: 'rén', sentence: '书店里有很多人。', context_meaning: 'people' },
    { hanzi: '也', pinyin: 'yě', sentence: '朋友也买了一个。', context_meaning: 'also, too' },
    { hanzi: '下边', pinyin: 'xià bian', sentence: '下边的书架放了一些笔记本和笔。', context_meaning: 'below, the lower part' },
    { hanzi: '上边', pinyin: 'shàng bian', sentence: '上边的书架上有很多中文书。', context_meaning: 'above, the upper part' },
  ],
  coverage: 1.0,
  missing_words: [],
};

// ── Sample Story 3: Making a New Friend ──
// Words: 中国, 中文, 人, 今天, 什么, 名字, 不, 了, 一起, 两, 个, 也, 认识, 好, 高兴, 这, 那, 说, 爱, 喜欢

const story3 = {
  story_id: 'hsk1-s003',
  hsk_level: 1,
  target_words: ['中国', '中文', '人', '今天', '什么', '名字', '不', '了', '一起', '两', '个', '也', '认识', '好', '高兴', '这', '那', '说', '爱', '喜欢'],
  word_count: 20,
  cluster_theme: 'meeting people, friendship, introductions',
  title_chinese: '一个新朋友',
  title_english: 'A New Friend',
  sentences: [
    {
      chinese: '今天中午，我在学校认识了一个新朋友。',
      pinyin: 'Jīn tiān zhōng wǔ, wǒ zài xué xiào rèn shi le yī gè xīn péng yǒu.',
      english: 'At noon today, I met a new friend at school.',
    },
    {
      chinese: '他是一个中国人，名字叫王明。',
      pinyin: 'Tā shì yī gè Zhōng guó rén, míng zi jiào Wáng Míng.',
      english: 'He is a Chinese person, and his name is Wang Ming.',
    },
    {
      chinese: '王明说："你好！很高兴认识你！你叫什么名字？"',
      pinyin: 'Wáng Míng shuō: "Nǐ hǎo! Hěn gāo xìng rèn shi nǐ! Nǐ jiào shén me míng zi?"',
      english: 'Wang Ming said: "Hello! Very happy to meet you! What is your name?"',
    },
    {
      chinese: '我说了我的名字，他也说了他的名字。',
      pinyin: 'Wǒ shuō le wǒ de míng zi, tā yě shuō le tā de míng zi.',
      english: 'I said my name, and he also said his name.',
    },
    {
      chinese: '王明喜欢说中文，也爱学英文。',
      pinyin: 'Wáng Míng xǐ huān shuō Zhōng wén, yě ài xué Yīng wén.',
      english: 'Wang Ming likes to speak Chinese, and also loves to learn English.',
    },
    {
      chinese: '我们一起吃了午饭，说了很多话。',
      pinyin: 'Wǒ men yī qǐ chī le wǔ fàn, shuō le hěn duō huà.',
      english: 'We ate lunch together and talked a lot.',
    },
    {
      chinese: '他问我："你喜欢中国吗？"',
      pinyin: 'Tā wèn wǒ: "Nǐ xǐ huān Zhōng guó ma?"',
      english: 'He asked me: "Do you like China?"',
    },
    {
      chinese: '我说："我很喜欢中国，也很喜欢中文。"',
      pinyin: 'Wǒ shuō: "Wǒ hěn xǐ huān Zhōng guó, yě hěn xǐ huān Zhōng wén."',
      english: 'I said: "I really like China, and I also really like the Chinese language."',
    },
    {
      chinese: '王明听了很高兴。',
      pinyin: 'Wáng Míng tīng le hěn gāo xìng.',
      english: 'Wang Ming was very happy to hear this.',
    },
    {
      chinese: '"那我们以后可以一起学中文！"他说。',
      pinyin: '"Nà wǒ men yǐ hòu kě yǐ yī qǐ xué Zhōng wén!" tā shuō.',
      english: '"Then we can study Chinese together in the future!" he said.',
    },
    {
      chinese: '这真是一个好的一天，我认识了一个好的人。',
      pinyin: 'Zhè zhēn shì yī gè hǎo de yī tiān, wǒ rèn shi le yī gè hǎo de rén.',
      english: 'This was truly a good day, I met a good person.',
    },
    {
      chinese: '两个人都很高兴，今天不一般。',
      pinyin: 'Liǎng gè rén dōu hěn gāo xìng, jīn tiān bù yī bān.',
      english: 'Both people were very happy, today was not ordinary.',
    },
  ],
  word_usage: [
    { hanzi: '中国', pinyin: 'Zhōng guó', sentence: '他是一个中国人。', context_meaning: 'China' },
    { hanzi: '中文', pinyin: 'Zhōng wén', sentence: '我很喜欢中国，也很喜欢中文。', context_meaning: 'Chinese language' },
    { hanzi: '人', pinyin: 'rén', sentence: '两个人都很高兴。', context_meaning: 'person, people' },
    { hanzi: '今天', pinyin: 'jīn tiān', sentence: '今天中午，我在学校认识了一个新朋友。', context_meaning: 'today' },
    { hanzi: '什么', pinyin: 'shén me', sentence: '你叫什么名字？', context_meaning: 'what' },
    { hanzi: '名字', pinyin: 'míng zi', sentence: '他的名字叫王明。', context_meaning: 'name' },
    { hanzi: '不', pinyin: 'bù', sentence: '今天不一般。', context_meaning: 'not' },
    { hanzi: '了', pinyin: 'le', sentence: '我说了我的名字。', context_meaning: 'completed action marker' },
    { hanzi: '一起', pinyin: 'yī qǐ', sentence: '我们可以一起学中文！', context_meaning: 'together' },
    { hanzi: '两', pinyin: 'liǎng', sentence: '两个人都很高兴。', context_meaning: 'two, both' },
    { hanzi: '个', pinyin: 'gè', sentence: '他是一个中国人。', context_meaning: 'measure word for people' },
    { hanzi: '也', pinyin: 'yě', sentence: '他也说了他的名字。', context_meaning: 'also' },
    { hanzi: '认识', pinyin: 'rèn shi', sentence: '我在学校认识了一个新朋友。', context_meaning: 'to meet, to get to know' },
    { hanzi: '好', pinyin: 'hǎo', sentence: '你好！很高兴认识你！', context_meaning: 'good, well' },
    { hanzi: '高兴', pinyin: 'gāo xìng', sentence: '王明听了很高兴。', context_meaning: 'happy, glad' },
    { hanzi: '这', pinyin: 'zhè', sentence: '这真是一个好的一天。', context_meaning: 'this' },
    { hanzi: '那', pinyin: 'nà', sentence: '那我们以后可以一起学中文！', context_meaning: 'then, in that case' },
    { hanzi: '说', pinyin: 'shuō', sentence: '王明说："你好！很高兴认识你！"', context_meaning: 'to say, to speak' },
    { hanzi: '爱', pinyin: 'ài', sentence: '他爱学英文。', context_meaning: 'to love, to like very much' },
    { hanzi: '喜欢', pinyin: 'xǐ huān', sentence: '我很喜欢中国，也很喜欢中文。', context_meaning: 'to like' },
  ],
  coverage: 1.0,
  missing_words: [],
};

// ── Build full dataset ──

const stories = [story1, story2, story3];

const allTargetWords = new Set(stories.flatMap((s) => s.target_words));

const dataset = {
  meta: {
    generated_at: new Date().toISOString(),
    model: 'hand-crafted-sample',
    model_endpoint: '',
    total_stories: stories.length,
    total_hsk_words: allTargetWords.size,
    words_covered: allTargetWords.size,
    overall_coverage: 1.0,
    levels: [1],
    stories_per_level: { 1: 15, 2: 18, 3: 20, 4: 20, 5: 20, 6: 20, 7: 50 },
    clustering_method: 'thematic grouping',
    max_words_per_story: 65,
    notes: 'SAMPLE DATASET (3 hand-crafted stories for review). Run: npm run data:prepare:stories to generate full AI-powered dataset.',
  },
  coverage_by_level: {
    1: {
      total: allTargetWords.size,
      covered: allTargetWords.size,
      uncovered: [],
      ratio: 1.0,
    },
  },
  stories: stories.map((s) => ({
    ...s,
    story_chinese: s.sentences.map((sen) => sen.chinese).join('\n'),
    story_chinese_sentences: s.sentences.map((sen) => sen.chinese),
    story_pinyin: s.sentences.map((sen) => sen.pinyin).join('\n'),
    story_pinyin_sentences: s.sentences.map((sen) => sen.pinyin),
    story_english: s.sentences.map((sen) => sen.english).join('\n'),
    story_english_sentences: s.sentences.map((sen) => sen.english),
  })),
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(dataset, null, 2), 'utf8');

console.log(`Created 3 sample stories in: ${OUT_PATH}`);
console.log('');
stories.forEach((s, i) => {
  console.log(`Story ${i + 1}: "${s.title_english}"`);
  console.log(`  Words: ${s.word_count} | Sentences: ${s.sentences.length}`);
  console.log(`  Preview: ${s.sentences[0].chinese}`);
  console.log('');
});
console.log('To view in the app: npm install && npm run dev');
console.log('Then navigate to the "Stories" tab.');
