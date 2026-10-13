// Vercel Serverless Function — 絵本の挿絵を1枚描く
// Alibaba Cloud Model Studio (Qwen-Image) を使う。1ページ1リクエストにして、
// ブラウザ側で並行して呼ぶ（まとめて描くと関数のタイムアウトを超えるため）。
// APIキーは Vercel の環境変数 DASHSCOPE_API_KEY から読む。

const MODEL = 'qwen-image-2.1-turbo';
const SIZE = '1024*640'; // 表示枠（8:5）に合わせる。料金は解像度によらず1枚単位
const BASE = (process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com').replace(/\/$/, '');

// 画風はサーバー側で固定する（ブラウザから自由な文章を描かせないため）
const STYLE = [
  "Japanese children's picture book illustration",
  'soft watercolor and colored pencil, warm gentle colors, simple cute shapes',
  'a full scene with a detailed background',
  'no text, no letters, no words, no watermark',
].join(', ');

const MAX_SCENE = 600;
const MAX_LOOK = 300;
const MAX_REF = 1_500_000; // 参照画像（data URI）の上限

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '挿絵用のAPIキーが設定されていません。Vercelの環境変数 DASHSCOPE_API_KEY を確認してください。' });

  const { scene, heroLook, ref } = req.body || {};
  if (typeof scene !== 'string' || !scene.trim() || scene.length > MAX_SCENE) return res.status(400).json({ error: '場面の説明が不正です。' });
  if (typeof heroLook !== 'string' || !heroLook.trim() || heroLook.length > MAX_LOOK) return res.status(400).json({ error: '主人公の説明が不正です。' });
  if (ref != null && (typeof ref !== 'string' || ref.length > MAX_REF || !/^data:image\/(jpeg|png|webp);base64,/.test(ref))) {
    return res.status(400).json({ error: '参照画像が不正です。' });
  }

  const content = [];
  if (ref) {
    content.push({ image: ref });
    content.push({ text: `${STYLE}. Keep the exact same character design and art style as Image 1. The hero: ${heroLook}. Scene: ${scene}` });
  } else {
    content.push({ text: `${STYLE}. The hero: ${heroLook}. Scene: ${scene}` });
  }

  try {
    const r = await fetch(`${BASE}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        input: { messages: [{ role: 'user', content }] },
        parameters: { size: SIZE, n: 1, watermark: false, prompt_extend: false },
      }),
    });
    if (!r.ok) {
      console.error('ehon-image error:', r.status, (await r.text()).slice(0, 500));
      return res.status(502).json({ error: '挿絵を描けませんでした。' });
    }
    const data = await r.json();
    const url = data?.output?.choices?.[0]?.message?.content?.find((c) => c.image)?.image;
    if (!url) {
      console.error('ehon-image: no image in response', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: '挿絵を描けませんでした。' });
    }
    // 生成画像のURLは一定時間で消えるので、中身を取り込んで返す（本棚に保存できるように）
    const img = await fetch(url);
    if (!img.ok) return res.status(502).json({ error: '挿絵を受け取れませんでした。' });
    const type = img.headers.get('content-type') || 'image/png';
    const b64 = Buffer.from(await img.arrayBuffer()).toString('base64');
    return res.status(200).json({ image: `data:${type};base64,${b64}`, model: MODEL });
  } catch (err) {
    console.error('ehon-image error:', err);
    return res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
}
