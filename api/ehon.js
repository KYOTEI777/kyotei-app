// Vercel Serverless Function — 絵本ジェネレーター
// 質問の回答を受け取り、Claude に絵本（タイトル・各ページの文章・挿絵の設計図）を
// JSON で書いてもらう。APIキーは Vercel の環境変数 ANTHROPIC_API_KEY から読む。

const MODEL = 'claude-opus-5';
// 絵本の文章は短いので effort は低めにして応答時間（Vercel の関数タイムアウト）に収める。
// 物語の質を上げたいときは 'medium' や 'high' に上げる。
const EFFORT = 'low';

// フロントエンド（ehon.html）と共有する語彙。挿絵はこの語彙をもとにブラウザ側で SVG 描画する。
const HERO_KINDS = ['child', 'cat', 'dog', 'rabbit', 'bear', 'robot', 'dragon', 'penguin', 'fox', 'owl', 'elephant'];
const CHARACTER_KINDS = [
  ...HERO_KINDS, 'bird', 'frog', 'fish', 'mouse', 'fairy', 'adult',
];
const EMOTIONS = ['happy', 'sad', 'surprised', 'sleepy', 'brave', 'thinking', 'excited'];
const POSITIONS = ['left', 'center', 'right'];
const SIZES = ['small', 'medium', 'large'];
const BACKGROUNDS = [
  'forest', 'sea', 'beach', 'space', 'town', 'castle', 'snow', 'flowers',
  'meadow', 'home', 'mountain', 'cave', 'sky', 'river', 'farm',
];
const TIMES = ['day', 'sunset', 'night'];
const PROPS = [
  'tree', 'flower', 'star', 'moon', 'sun', 'cloud', 'rainbow', 'balloon', 'boat', 'rocket',
  'car', 'train', 'cake', 'apple', 'gift', 'house', 'bridge', 'treasure', 'umbrella', 'book',
  'ball', 'kite', 'tent', 'campfire', 'mushroom', 'butterfly', 'snowman', 'lantern', 'key', 'map',
  'heart', 'music', 'bed', 'planet', 'shell', 'leaf', 'crown', 'wand', 'bicycle', 'airplane',
  'icecream', 'onigiri', 'bread', 'teddy', 'bell',
];
const THEMES = ['adventure', 'friendship', 'bedtime', 'courage', 'family', 'magic', 'food', 'vehicles'];
const AGES = ['0-2', '3-5', '6-8'];
const PAGE_COUNTS = [6, 8, 10, 12];

const LABELS = {
  hero: {
    child: '人間の子ども', cat: 'ねこ', dog: 'いぬ', rabbit: 'うさぎ', bear: 'くま', robot: 'ロボット',
    dragon: 'ドラゴン', penguin: 'ペンギン', fox: 'きつね', owl: 'ふくろう', elephant: 'ぞう',
  },
  theme: {
    adventure: 'ぼうけん', friendship: 'ともだち', bedtime: 'おやすみ前の静かなお話', courage: 'ゆうき',
    family: 'かぞく', magic: 'まほう', food: 'たべもの', vehicles: 'のりもの',
  },
  background: {
    forest: 'もり', sea: 'うみ', beach: 'すなはま', space: 'うちゅう', town: 'まち', castle: 'おしろ',
    snow: 'ゆきのくに', flowers: 'おはなばたけ', meadow: 'まきば・草原', home: 'おうち',
    mountain: 'やま', cave: 'どうくつ', sky: 'くものうえ', river: 'かわ', farm: 'のうじょう',
  },
};

const AGE_GUIDE = {
  '0-2': [
    '対象は0〜2歳。1ページは1〜2文、各文はとても短く（15文字以内が目安）。',
    'ひらがなだけを使う（カタカナ・漢字は使わない）。',
    '「とん とん」「ぴょん ぴょん」のような繰り返しの擬音語・擬態語をたくさん入れる。',
    '筋書きはごく単純に。同じフレーズをページごとに繰り返すと良い。',
  ],
  '3-5': [
    '対象は3〜5歳。1ページは2〜3文、1文は25文字程度まで。',
    'ひらがなとカタカナだけを使う（漢字は使わない）。',
    '擬音語や会話文を交え、声に出して読んで楽しいリズムにする。',
    '小さなできごと（困りごと）と、それをのりこえる流れを入れる。',
  ],
  '6-8': [
    '対象は6〜8歳。1ページは3〜4文。',
    '小学1年生で習う程度の簡単な漢字は使ってよい（山・川・空・大きい など）。それ以外はひらがな。',
    '主人公の気持ちの変化がわかるように書く。',
    '起承転結のある物語にし、最後に小さな気づきや成長がある。',
  ],
};

const bookSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '絵本のタイトル（短く、ひらがな中心）' },
    heroLook: {
      type: 'string',
      description: '挿絵画像を描くための、主人公の見た目の説明（英語・1文）。種類・毛や肌の色・服装・目印を具体的に。全ページ共通で使う。',
    },
    coverScene: { type: 'string', description: '表紙の挿絵の場面説明（英語）。主人公が舞台にいて、お話の始まりを感じさせる絵。' },
    pages: {
      type: 'array',
      description: '絵本のページ。指定されたページ数ちょうど。',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'このページの本文。改行で文を区切ってよい。' },
          scene: { type: 'string', description: 'このページの挿絵画像の場面説明（英語）。' },
          illustration: {
            type: 'object',
            description: 'このページの挿絵の設計図',
            properties: {
              background: { type: 'string', enum: BACKGROUNDS },
              time: { type: 'string', enum: TIMES },
              characters: {
                type: 'array',
                description: '挿絵に描く登場人物。主人公は必ず含める。最大3体。',
                items: {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', enum: CHARACTER_KINDS },
                    emotion: { type: 'string', enum: EMOTIONS },
                    position: { type: 'string', enum: POSITIONS },
                    size: { type: 'string', enum: SIZES },
                    isHero: { type: 'boolean' },
                  },
                  required: ['kind', 'emotion', 'position', 'size', 'isHero'],
                  additionalProperties: false,
                },
              },
              props: {
                type: 'array',
                description: '挿絵に添える小物。0〜4個。',
                items: {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', enum: PROPS },
                    position: { type: 'string', enum: POSITIONS },
                  },
                  required: ['kind', 'position'],
                  additionalProperties: false,
                },
              },
            },
            required: ['background', 'time', 'characters', 'props'],
            additionalProperties: false,
          },
        },
        required: ['text', 'scene', 'illustration'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'heroLook', 'coverScene', 'pages'],
  additionalProperties: false,
};

function validateAnswers(a) {
  if (!a || typeof a !== 'object') return '回答がありません。';
  const name = typeof a.name === 'string' ? a.name.trim() : '';
  if (!name || name.length > 20) return '主人公の名前は1〜20文字で入力してください。';
  if (!HERO_KINDS.includes(a.hero)) return '主人公の種類が不正です。';
  if (!AGES.includes(a.age)) return '対象年齢が不正です。';
  if (!THEMES.includes(a.theme)) return 'テーマが不正です。';
  if (!BACKGROUNDS.includes(a.setting)) return '舞台が不正です。';
  if (!PAGE_COUNTS.includes(Number(a.pages))) return 'ページ数が不正です。';
  if (a.extras != null && (typeof a.extras !== 'string' || a.extras.length > 120)) {
    return '出したいものは120文字以内で入力してください。';
  }
  return null;
}

function buildPrompt(a) {
  const name = a.name.trim();
  const extras = (a.extras || '').trim();
  const pages = Number(a.pages);
  const lines = [
    `次の条件で、日本語の子ども向け絵本を1冊書いてください。`,
    ``,
    `# 条件`,
    `- 主人公: ${LABELS.hero[a.hero]}の「${name}」（名前は本文中で必ず「${name}」と書く）`,
    `- 対象年齢: ${a.age}歳`,
    `- テーマ: ${LABELS.theme[a.theme]}`,
    `- 主な舞台: ${LABELS.background[a.setting]}（物語の途中で別の場所へ行ってもよい）`,
    `- ページ数: ${pages}ページちょうど（表紙は含まない）`,
  ];
  if (extras) lines.push(`- お話に出したいもの・要素: ${extras}`);
  lines.push(
    ``,
    `# 文章のルール`,
    ...AGE_GUIDE[a.age].map((s) => `- ${s}`),
    `- 怖すぎる場面、暴力、死、いじめの描写は入れない。安心できる温かい結末にする。`,
    `- 最後のページは読み終えたあとに心が満たされる締めくくりにする。`,
    ``,
    `# 挿絵の設計図（illustration）のルール`,
    `- 主人公（kind: "${a.hero}", isHero: true）を全ページに必ず入れる。`,
    `- 主人公以外の登場人物は isHero: false。登場人物は各ページ最大3体。`,
    `- 本文で描かれている場面・時間帯・気持ちと、background / time / emotion を一致させる。`,
    `- 小物（props）は本文に出てくるものを選ぶ。本文にないものを無理に足さない。`,
    `- 表紙は自動で作られるので、pages には本文ページだけを入れる。`,
    ``,
    `# 挿絵画像の説明（heroLook / coverScene / scene）のルール`,
    `- 画像生成AIに渡すので英語で書く。絵の中に文字は入れない（看板・吹き出しも書かない）。`,
    `- heroLook: 主人公（${LABELS.hero[a.hero]}）の見た目を1文で具体的に（例: "a small orange tabby cat girl walking on two legs, big round eyes, wearing a red scarf"）。名前は入れない。`,
    `- scene: そのページの本文の場面を1〜2文で。主人公のポーズや動き（走る・すわる・ねむっている など）、表情、ほかの登場人物、場所、時間帯、天気をはっきり書く。主人公は "the hero" と呼ぶ。`,
    `- 各ページの構図に変化をつける。"close-up"（顔や手元の寄り）・"wide view"（景色の中の小さな主人公）・ふつうの構図を、本文に合わせて使い分ける。同じ構図を続けすぎない。`,
    `- 背景は毎ページ必ず描く（無地の背景にしない）。`,
  );
  return lines.join('\n');
}

const SYSTEM_PROMPT = [
  'あなたは日本の子ども向け絵本作家です。',
  '子どもが声に出して読んでもらって楽しい、やさしくリズムのよい文章を書きます。',
  '読者は幼い子どもとその保護者です。',
].join('');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません。Vercelの環境変数 ANTHROPIC_API_KEY を確認してください。' });
  }

  const answers = req.body?.answers;
  const problem = validateAnswers(answers);
  if (problem) return res.status(400).json({ error: problem });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // 安全分類器がリクエストを断った場合に、サーバー側で別モデルへ自動的に切り替える
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        fallbacks: 'default',
        system: SYSTEM_PROMPT,
        output_config: {
          effort: EFFORT,
          format: { type: 'json_schema', schema: bookSchema },
        },
        messages: [{ role: 'user', content: buildPrompt(answers) }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('ehon.js anthropic error:', response.status, err);
      return res.status(502).json({ error: '絵本の生成サービスでエラーが起きました。少し待ってからもう一度お試しください。' });
    }

    const data = await response.json();

    if (data.stop_reason === 'refusal') {
      return res.status(422).json({ error: 'この内容では絵本を作れませんでした。テーマや出したいものを変えてお試しください。' });
    }
    if (data.stop_reason === 'max_tokens') {
      return res.status(502).json({ error: 'お話が長くなりすぎました。ページ数を減らしてお試しください。' });
    }

    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    let book;
    try {
      book = JSON.parse(text);
    } catch (e) {
      console.error('ehon.js JSON parse error:', text.slice(0, 200));
      return res.status(502).json({ error: '絵本のデータを読み取れませんでした。もう一度お試しください。' });
    }
    if (!book || typeof book.title !== 'string' || !Array.isArray(book.pages) || book.pages.length === 0) {
      return res.status(502).json({ error: '絵本のデータが不完全でした。もう一度お試しください。' });
    }

    return res.status(200).json({ book, model: data.model });
  } catch (err) {
    console.error('ehon.js error:', err);
    return res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
}
