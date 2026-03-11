# 🚤 BOATRACE AI PREDICTOR

競艇AIの予想・オッズ・選手分析をまとめたWebアプリです。  
Vercelで安全にホストし、一般公開できる構成になっています。

---

## ファイル構成

```
kyotei-app/
├── index.html       ← フロントエンド（アプリ本体）
├── vercel.json      ← Vercel設定
├── api/
│   └── predict.js   ← AIサーバー関数（APIキーをここで安全管理）
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
