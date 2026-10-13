# 🚤 BOATRACE AI PREDICTOR

競艇AIの予想・オッズ・選手分析をまとめたWebアプリです。  
Vercelで安全にホストし、一般公開できる構成になっています。

---

## ファイル構成

```
kyotei-app/
├── index.html       ← フロントエンド（アプリ本体）
├── ehon.html        ← 子ども向け絵本メーカー（/ehon でアクセス）
├── vercel.json      ← Vercel設定
├── api/
│   ├── predict.js   ← AIサーバー関数（APIキーをここで安全管理）
│   └── ehon.js      ← 絵本生成サーバー関数
└── README.md
```

---

## デプロイ手順（初回）

### Step 1｜GitHubにリポジトリを作る

1. https://github.com にアクセス → 右上「+」→「New repository」
2. Repository name: `kyotei-app`（任意）
3. Public を選択 → **「Create repository」**

### Step 2｜ファイルをアップロード

1. 作成したリポジトリページで **「Add file」→「Upload files」**
2. このフォルダの中身（index.html / vercel.json / api/predict.js）を全てドラッグ＆ドロップ
   - ⚠️ `api/predict.js` は `api` フォルダごとアップロードしてください
3. 「Commit changes」をクリック

### Step 3｜Vercelにデプロイ

1. https://vercel.com にアクセス → **「GitHubでログイン」**
2. 「Add New Project」→ 作成した `kyotei-app` リポジトリを選択
3. 設定はそのままで **「Deploy」** をクリック
4. 数分でデプロイ完了 → URLが発行される（例：`https://kyotei-app-xxx.vercel.app`）

### Step 4｜APIキーを環境変数に設定（重要）

1. Vercelダッシュボードで `kyotei-app` プロジェクトを開く
2. **「Settings」→「Environment Variables」**
3. 以下を追加：

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxx...`（あなたのAPIキー） |
| `ALLOWED_ORIGIN` | `https://kyotei-app-xxx.vercel.app`（発行されたURL） |

4. 追加後、**「Deployments」→「Redeploy」** で再デプロイ

---

## 📖 えほんメーカー（子ども向け絵本ジェネレーター）

デプロイ後、`https://<あなたのURL>/ehon` を開くと絵本メーカーが使えます。
`ANTHROPIC_API_KEY`（お話づくり）は上記と同じ環境変数を使います。
挿絵画像と読み上げの声には Alibaba Cloud Model Studio を使うので、次の環境変数も追加してください。

| Name | Value |
|------|-------|
| `DASHSCOPE_API_KEY` | Model Studio（国際版・シンガポール）のAPIキー（`sk-...`） |

未設定でも絵本は作れます（挿絵は従来のSVG、読み上げはブラウザの音声になります）。

### つかいかた

1. 「絵本をつくる」を押して、質問に答える
   - 主人公の名前 / 主人公の種類（子ども・ねこ・ロボットなど11種）
   - 対象年齢（0〜2歳 / 3〜5歳 / 6〜8歳）… 文字量やことばのむずかしさが変わります
   - テーマ（ぼうけん・ともだち・おやすみ・ゆうき など8種）
   - 舞台（もり・うみ・うちゅう・おしろ など15種）
   - お話に出したいもの（自由入力・省略可）
   - ページ数（6 / 8 / 10 / 12）
2. 数十秒待つと絵本が開き、続けて挿絵が1枚ずつ描かれていく（6ページで20秒前後）
3. できあがった絵本は
   - **よみきかせ**：AIの声で自動的にページをめくりながら読み上げ（使えないときはブラウザの音声合成）
   - **本棚にしまう**：ブラウザ内（localStorage）に保存。あとから開き直せます
   - **印刷 / PDF**：1ページ1枚で印刷（ブラウザの印刷画面で「PDFに保存」も可）
   - **同じ条件でもう一冊**：同じ回答で別のお話を生成

### しくみ

- 文章・挿絵の場面説明（英語）・主人公の見た目を Claude が JSON で生成します（`api/ehon.js`）。
- 挿絵は `api/ehon-image.js` が Qwen-Image（`qwen-image-2.1-turbo`）で1枚ずつ描きます。
  表紙を先に描き、それを見本にして各ページを3枚ずつ並行で描くので、主人公の見た目がそろいます。
  描けるまで・描けなかったときは、Claude の「挿絵の設計図」からブラウザで描く SVG を表示します。
- 読み上げは `api/ehon-voice.js` が Qwen3-TTS（`qwen3-tts-flash`、声 `Cherry`）で1ページずつ作ります。
- `api/ehon.js` の先頭にある `MODEL` / `EFFORT` を変更するとモデルや生成の丁寧さを調整できます。
- `ehon.html?demo=1` を開くと API を呼ばずにサンプル絵本で画面を確認できます（`?demo=1&ai=1` で挿絵と声だけ試せます）。

### 1冊あたりの費用の目安（1ドル150円）

| | 6ページ | 12ページ |
|---|---|---|
| お話（Claude） | 約14円 | 約21円 |
| 挿絵（表紙＋各ページ・1枚$0.016） | 約17円 | 約31円 |
| 読み上げ（1万文字$0.10・読むたび） | 約1円 | 約5円 |

本棚には挿絵も保存されます（1冊6ページで約0.8MB）。ブラウザの保存領域は5MB前後なので、6〜8冊ほどが目安です。

---

## APIキーの取得方法

1. https://console.anthropic.com にアクセス
2. 「API Keys」→「Create Key」
3. 生成されたキー（`sk-ant-...`）をコピーしてVercelの環境変数に貼り付け

---

## 更新方法

コードを修正したら、GitHubにファイルをアップロードし直すだけで  
Vercelが自動検知して再デプロイします。

---

## コスト目安

| サービス | 料金 |
|--------|------|
| Vercel | 無料（月10万リクエストまで） |
| Anthropic API | 従量課金・月数百〜数千円（利用量次第） |
| BoatraceOpenAPI | 無料（非公式） |

---

## 注意事項

- BoatraceOpenAPIは非公式の有志プロジェクトです。公式データと異なる場合があります。
- 競艇は公営ギャンブルです。適切な範囲でお楽しみください。
- APIキーは絶対にコードに直書きしないでください。必ず環境変数で管理してください。
