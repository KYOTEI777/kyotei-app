// Vercel Serverless Function — 絵本の1ページを声で読む
// Alibaba Cloud Model Studio (Qwen3-TTS) で音声を作り、音声ファイルのURLを返す。
// URLは一定時間で消えるので保存はせず、読み聞かせのたびに作る（1冊数円未満）。

const MODEL = 'qwen3-tts-flash';
const VOICE = 'Cherry';
const BASE = (process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com').replace(/\/$/, '');
const MAX_TEXT = 600;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '読み上げ用のAPIキーが設定されていません。' });

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > MAX_TEXT) return res.status(400).json({ error: '読み上げる文章が不正です。' });

  try {
    const r = await fetch(`${BASE}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, input: { text, voice: VOICE, language_type: 'Japanese' } }),
    });
    if (!r.ok) {
      console.error('ehon-voice error:', r.status, (await r.text()).slice(0, 500));
      return res.status(502).json({ error: '読み上げの音声を作れませんでした。' });
    }
    const data = await r.json();
    const url = data?.output?.audio?.url;
    if (!url) return res.status(502).json({ error: '読み上げの音声を作れませんでした。' });
    // http で返ってくるので、https のページから再生できるように https に直す
    return res.status(200).json({ url: url.replace(/^http:\/\//, 'https://') });
  } catch (err) {
    console.error('ehon-voice error:', err);
    return res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
}
