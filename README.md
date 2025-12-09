# Invoicy

Google Driveを使用した請求書管理システム

## 概要

Invoicyは、Google Driveをデータストレージとして使用するクライアントサイドのみのWebアプリケーションです。Googleアカウントでの認証により、顧客・商品・税率の管理、売上伝票の作成、請求書の生成が可能です。

## 機能

### 認証・設定
- ✅ Googleアカウント認証（OAuth 2.0 + PKCE）
- ✅ 事業者設定（事業者名、事業者番号、代表者名、振込先情報、連絡先、住所）

### マスター管理
- ✅ 顧客管理
  - 顧客の登録・更新・削除・一覧表示
  - 顧客ごとの締め日・支払い方法設定
- ✅ 商品管理
  - 商品の登録・更新・削除・一覧表示
  - 顧客別の商品設定
- ✅ 税率管理
  - 税率の登録・更新・削除・一覧表示
  - デフォルト税率の設定
  - 端数計算方式の設定（切り捨て・切り上げ・四捨五入）

### 売上管理
- ✅ 売上伝票の作成
  - 顧客・商品・数量の登録
  - 税率の設定
  - 備考欄の入力
- ✅ 売上閲覧
  - 期間指定での売上一覧表示
  - 顧客・商品でのフィルタリング
  - 売上詳細の表示
  - 売上件数・合計金額・平均単価の表示
- ✅ 売上分析
  - 年間売上分析（月別グラフ表示）
  - 月間売上分析（日別グラフ表示）
  - 支払い別売上（現金・振込）
  - 顧客別売上テーブル
  - 商品別ランキング
- ✅ 売上伝票の取り消し

### 請求書管理
- ✅ 請求書作成
  - 月次請求書の自動作成（顧客の締め日に基づく期間計算）
  - 複数顧客の一括選択
  - 請求書の上書き保存
- ✅ 請求書閲覧
  - 請求書一覧表示
  - 顧客名・期間でのフィルタリング
  - 請求書詳細の表示
- ✅ 請求書のPDF出力
  - 個別・一括でのPDF出力
  - ブラウザからのダウンロード
- ✅ 請求書の削除

### データ管理
- ✅ データ削除機能
  - 売上データの削除
  - 請求書データの削除
  - Google Drive容量の確認
  - 容量不足時のアラート表示（3GB未満）

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

**デプロイ**: `main` ブランチにマージすると、GitHub Actionsが自動的にビルドとデプロイを実行します

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

