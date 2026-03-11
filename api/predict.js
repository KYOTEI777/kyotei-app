// Vercel Serverless Function
// APIキーはここには書かない。Vercelの環境変数から安全に読み込む。

export default async function handler(req, res) {
  // CORSヘッダー（自分のVercelドメインからのみ許可）
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエスト（プリフライト）への対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'APIキーが設定されていません。Vercelの環境変数を確認してください。' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 3000) {
      return res.status(400).json({ error: '不正なリクエストです。' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `Anthropic APIエラー: ${err}` });
    }

    const data = await response.json();
    return res.status(200).json({ text: data.content?.[0]?.text || '' });

  } catch (err) {
    console.error('predict.js error:', err);
    return res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
}
