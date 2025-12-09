# Invoicy

Google Driveを使用した請求書管理システム

## 概要

Invoicyは、Google Driveをデータストレージとして使用するクライアントサイドのみのWebアプリケーションです。Googleアカウントでの認証により、顧客・商品・税率の管理、売上伝票の作成、請求書の生成が可能です。

## 機能

- ✅ Googleアカウント認証
- ✅ 顧客管理
- ✅ 商品管理
- ✅ 税率管理
- ✅ 売上管理
- ✅ 請求書作成

## 技術スタック

- **フロントエンド**: Vue 3 + Vite
- **状態管理**: Pinia
- **ルーティング**: Vue Router
- **認証**: Google Identity Services (OAuth 2.0 + PKCE)
- **データ保存**: Google Drive API
- **配布**: GitHub Pages (PWA対応)

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/<your-username>/invoicy.git
cd invoicy
```

> **注意**: `<your-username>` を実際のGitHubユーザー名または組織名に置き換えてください。

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. **APIとサービス** > **認証情報**に移動
4. **認証情報を作成** > **OAuth 2.0 クライアントID**を選択
5. アプリケーションの種類で**ウェブアプリケーション**を選択
6. 以下の設定を行う：
   - **承認済みのJavaScriptオリジン**:
     - `http://localhost:3000` (開発用)
     - `https://<your-username>.github.io` (本番用)
   
   > **注意**: Google Identity Servicesを使用しているため、リダイレクトURIの設定は不要です。JavaScriptオリジンのみ設定してください。

### 4. 環境変数の設定

```bash
cp env.example .env
```

`.env`ファイルを編集して、Google Cloud Consoleで取得したクライアントIDを設定：

```env
VITE_GOOGLE_CLIENT_ID=your-actual-client-id-here
VITE_APP_FOLDER_NAME=Invoicy
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000/invoicy/` にアクセスしてアプリケーションを確認できます。

> **注意**: Viteの設定で `base: '/invoicy/'` が設定されているため、開発サーバーでも `/invoicy/` パスでアクセスする必要があります。

## 認証フロー

1. ユーザーが「Googleでサインイン」ボタンをクリック
2. Google Identity ServicesがOAuth 2.0認証を実行
3. 認証成功後、アクセストークンが取得される
4. ユーザー情報が取得され、アプリケーションに表示
5. トークンはセッションストレージに保存され、Google Drive APIへのアクセスに使用

## 必要な権限

- `openid`: OpenID Connect認証
- `email`: メールアドレスの取得
- `profile`: プロフィール情報の取得
- `https://www.googleapis.com/auth/drive.file`: Google Driveファイルへのアクセス（アプリが作成したファイルのみ）

## ビルドとデプロイ

### 本番ビルド

```bash
npm run build
```

### GitHub Pagesへのデプロイ

1. GitHubリポジトリを作成（既に作成済みの場合はスキップ）
2. GitHub Pagesを有効化（Settings > Pages）
3. ソースを「GitHub Actions」に設定
4. GitHub Secretsに以下を設定（Settings > Secrets and variables > Actions）:
   - `VITE_GOOGLE_CLIENT_ID`: Google Cloud Consoleで取得したクライアントID
   - `VITE_APP_FOLDER_NAME`: アプリケーションフォルダ名（デフォルト: `Invoicy`）
5. **ブランチ保護ルールを設定**（Settings > Branches > Add rule）:
   - Branch name pattern: `main`
   - ✅ Require a pull request before merging
   - ✅ Require approvals: **1**（コードオーナーの承認が必須）
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require review from Code Owners（コードオーナーの承認を必須にする）
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
   
   > **注意**: `.github/CODEOWNERS` ファイルでコードオーナー（`@miyamoto-jo`）が設定されています。mainブランチへのプルリクエストには、コードオーナーの承認が必要です。
6. `main` ブランチへの変更はプルリクエスト経由で行い、マージされると自動的にデプロイされます
7. デプロイ後、`https://<your-username>.github.io/invoicy/` でアクセスできます

## 開発ガイド

### プロジェクト構造

```
src/
├── assets/           # 画像・リソースファイル
├── components/       # 再利用可能なコンポーネント
├── composables/     # コンポーザブル関数
├── config/          # 設定ファイル
├── models/          # ドメインモデル
├── router/         # Vue Router設定
├── services/       # APIサービス
├── stores/         # Piniaストア
├── views/          # ページコンポーネント
├── App.vue         # ルートコンポーネント
├── main.js         # エントリーポイント
└── style.css       # グローバルスタイル
```

## 注意事項

- このアプリケーションは**オンライン前提**で動作します
- データはGoogle Driveに保存されます
- 初回使用時はGoogle Driveに専用フォルダ（Invoicy）が作成されます
- 認証トークンはセッションストレージに保存されます（ブラウザを閉じると失効）
- **プライベートブラウズモード（シークレットモード）での利用は推奨しません** - セッションストレージ、ローカルストレージの制限により、認証状態が正常に保持されない場合があります

## ライセンス

MIT License

