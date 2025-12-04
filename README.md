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
git clone <repository-url>
cd invoicy
```

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
   - **承認済みのリダイレクトURI**:
     - `http://localhost:3000/invoicy/` (開発用)
     - `https://<your-username>.github.io/invoicy/` (本番用)

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

ブラウザで `http://localhost:3000` にアクセスしてアプリケーションを確認できます。

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

1. GitHubリポジトリを作成
2. GitHub Pagesを有効化（Settings > Pages）
3. ソースを「GitHub Actions」に設定
4. コードをプッシュすると自動的にデプロイされます

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

