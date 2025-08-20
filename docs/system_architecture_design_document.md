# Invoicy システム基本設計（ベース版）

> 本設計は、提示された要件定義（最新版）を前提にした**最小構成の基本設計**です。詳細設計（画面遷移・UI・アルゴリズム詳細）は別途。バックエンドは構築せず、**オンライン前提**で Google Drive に即時保存します。

---

## 1. システム全体像

- **クライアントのみの Web アプリ（PWA／GitHub Pages 配布）**
- **外部サービス**：Google Identity Services（OAuth 2.0 + PKCE）、Google Drive API
- **データ保存**：ユーザーの Google Drive 上に**アプリ専用フォルダ**を作成し、各データを**ファイルとして即時アップロード**
- **対象機能**：顧客マスター／商品マスター／消費税マスターの CRUD、売上登録・閲覧、請求書作成（複数顧客対応、期間集計）

### 1.1 コンポーネント構成

- **UI 層**：SPA（ルーティング：`/customers`, `/products`, `/taxes`, `/sales`, `/invoices`）
- **アプリ層**：ドメインロジック（ID 採番、集計、バリデーション）
- **インフラ層**：認証（GIS）／Google Drive クライアント（CRUD, 検索, フォルダ管理）

---

## 2. 外部連携（認証・権限）

- **認証**：Google Identity Services の Authorization Code Flow（PKCE）
- **スコープ**：`openid email profile` + `https://www.googleapis.com/auth/drive.file`
  - `drive.file` により**アプリが作成・開いたファイルのみ**アクセス可能
- **トークン管理**：ブラウザ実行時は**短期トークンを必要時に再取得**（リフレッシュトークン非前提）
- **サインアウト**：アプリ側セッションを破棄し、必要時に再認証

---

## 3. データ永続化（Google Drive 構成）

### 3.1 フォルダ構成

- ルート：`/Invoicy/`（初回起動時に存在確認→なければ作成）
  - `settings.json`  … 設定（アプリ設定を1ファイルで管理）
  - `masters/`
    - `customers.json` … 顧客マスター（全顧客データを1ファイルで管理）
    - `products.json`  … 商品マスター（全商品データを1ファイルで管理）
    - `taxes.json`     … 税率マスター（全税率データを1ファイルで管理）
  - `sales/`
    - 伝票（売上）1 件 = 1 ファイル（`{YYYYMMDD}_{customerId}_{ticketId}.json`）
  - `invoices/`
    - `YYYY-MM/` … 請求書 1 件 = 1 ファイル（`{customerId}_{invoiceId}.json`）

> 単一ユーザー運用を想定し、**マスターデータは1ファイルで管理**、**伝票・請求書はレコード単位ファイル**方式を採用。マスター検索はファイル全体を取得してクライアント側でフィルタ。

### 3.2 ファイル命名・ID

- **ID 生成**：`ulid` もしくは `crypto.randomUUID()` による一意 ID
- **ファイル名**：`{entityId}.json`（拡張を避けるためシンプル運用）
- **タイムゾーン**：JST（UTC+09:00）。ISO 8601（`YYYY-MM-DDTHH:mm:ss.sss+09:00`）で記録し、UI もJST表示。

### 3.3 JSON スキーマ（最小）

**顧客マスター（masters/customers.json）**

```json
{
  "customers": [
    {
      "id": "cus_...",
      "name": "顧客名称",
      "alias": "顧客管理用名称",
      "address": "住所",
      "createdAt": "2025-08-16T12:34:56+09:00",
      "updatedAt": "2025-08-16T12:34:56+09:00"
    }
  ],
  "lastUpdated": "2025-08-16T12:34:56+09:00"
}
```

**商品マスター（masters/products.json）**

```json
{
  "products": [
    {
      "id": "prd_...",
      "name": "商品名称",
      "alias": "商品管理用名称",
      "priceExclTax": 250,   
      "usedByCustomerIds": ["cus_..."],
      "createdAt": "2025-08-16T12:34:56+09:00",
      "updatedAt": "2025-08-16T12:34:56+09:00"
    }
  ],
  "lastUpdated": "2025-08-16T12:34:56+09:00"
}
```

**税率マスター（masters/taxes.json）**

```json
{
  "taxes": [
    { "id": "tax_10", "rate": 10, "createdAt": "2025-08-16T12:34:56+09:00" },
    { "id": "tax_8", "rate": 8, "createdAt": "2025-08-16T12:34:56+09:00" }
  ],
  "lastUpdated": "2025-08-16T12:34:56+09:00"
}
```

**設定（masters/settings.json）**

```json
{ "rounding": "floor", "defaultTaxRate": 10 }
```

> **rounding**: `"floor"`=切捨て, `"ceil"`=切上げ, `"round"`=四捨五入 （JST基準の計算日付）

**伝票（sales/{YYYYMMDD}\_*****{******customerId******}\_*****{ticketId}.json）**

```json
{
  "id": "tkt_...",
  "customerId": "cus_...",
  "issuedOn": "2025-08-31",
  "lines": [ { "productId": "prd_...", "qty": 2, "unitPriceExclTax": 250, "taxRate": 10 } ],
  "note": "",
  "totals": {
    "taxByRate": { "10": 50, "8": 0 },
    "totalInclTax": 550
  },
  "isNegative": false,
  "negatesTicketId": "tkt_...", 
  "createdAt": "..."
}
```

**請求書（invoices/YYYY-MM/{invoiceId}.json）**

```json
{
  "id": "inv_...",
  "customerId": "cus_...",
  "period": { "from": "2025-08-01", "to": "2025-08-31" },
  "ticketIds": ["tkt_..."],
  "summary": {
    "subtotalExclTax": 1000,
    "taxByRate": { "10": 100, "8": 0 },
    "totalInclTax": 1100
  },
  "createdAt": "..."
}
```

---

## 4. 主要ユースケースとシーケンス

### 4.1 マスター CRUD

1. UI 入力 → バリデーション（必須、型、範囲）
2. Drive 上の対象マスターファイルを取得（なければ作成）
3. 新規：配列に追加 → ファイル全体を `files.update` で更新
4. 更新：配列内の該当レコードを更新 → ファイル全体を `files.update` で更新
5. 削除：配列から該当レコードを削除 → ファイル全体を `files.update` で更新

### 4.2 売上登録（伝票作成）

1. 顧客選択 → 商品選択＋数量入力
2. 伝票 JSON 生成 → `sales/{YYYYMMDD}_{customerId}_{ticketId}.json` を `files.create`&#x20;
3. 正常終了後、トースト表示（ファイル名・日時）

### 4.3 売上閲覧（期間・フィルタ）

1. `sales/` 直下を対象に、JSTの期間から `YYYYMM` を導出し、`q` に `name contains 'YYYYMM'` を用いて `files.list` を実行（期間が月をまたぐ場合は該当する各 `YYYYMM` で実行）
2. 取得したメタ情報からファイル名（`{YYYYMMDD}_{customerId}_{ticketId}.json`）をパースして、日付レンジ・顧客でクライアント側フィルタ → ヒットしたもののみ `files.get`（本文取得）
3. （任意の最適化）顧客で事前絞込みする場合、`q` に `name contains '_{customerId}_'` を併用して転送量を削減

### 4.4 請求書作成（期間×複数顧客）

1. 対象期間・顧客を指定
2. 対象伝票を検索・集計（顧客単位に分割）
3. 各顧客ごとに請求書 JSON 生成 → `invoices/YYYY-MM/` に `files.create`

---

## 5. 画面（概要）

- **Customers**：一覧／検索／新規／編集／削除
- **Products**：一覧／新規／編集／削除（価格＝税抜）
- **Taxes**：一覧／登録／削除（単純な率の管理）
- **Sales**：登録（伝票作成）／一覧（期間・顧客・商品フィルタ）
- **Invoices**：作成（期間×複数顧客）／一覧（期間・顧客フィルタ）

---

## 6. バリデーション（例）

- 顧客：`name` 必須、`alias` 任意、`address` 任意
- 商品：`name` 必須、`priceExclTax >= 0`、`usedByCustomerIds` は配列/空可
- 税率：整数（例：8 または 10）
- 伝票：`lines.length >= 1`、各 `qty > 0`、`unitPriceExclTax >= 0`、`taxRate` は登録済みのみ
- 請求書：`period.from <= period.to`、`ticketIds` が 1 件以上

---

## 7. エラーハンドリング

- **ネットワーク**：失敗時はエラー表示＋**再試行**ボタン。オフライン時は**保存不可**のメッセージを明示。
- **認可**：トークン失効時は再ログイン誘導（モーダル）。
- **Drive**：`403/404/429/5xx` に応じてリトライ（指数バックオフ上限 3 回）。

---

## 8. 非機能（最小）

- 対応ブラウザ：iOS Safari（最新）、Android Chrome（最新）、デスクトップ最新版（動作確認用）
- セキュリティ：HTTPS（GitHub Pages）必須、OAuth は PKCE、トークンは**メモリ or sessionStorage**で短期保持
- パフォーマンス：一覧は**必要ページのみページング**、Drive への API はバックオフ制御
- ルーティング：**ハッシュルーティング**で 404 回避（`/#/customers` など）
- PWA：Service Worker は**最小（App Shell 程度）**。API レスポンスはキャッシュしない（オンライン前提）。
- 監査：操作ログ（クライアント内のメモリ/コンソール）— 個人利用のため外部送信なし

---

## 9. リポジトリと設定（参考）

- `README` に前提（オンライン必須、Drive 保存、PWA配布）を明記
- `.env`（ビルド時埋め込み）：`GOOGLE_CLIENT_ID`、`APP_FOLDER_NAME=Invoicy`
- **GitHub Pages**：`main` → Pages（ビルド出力を `/dist` に配置）
- **ルーティング**：\*\*ハッシュルーティング（#/）\*\*を推奨（Pages は SPA のパス直叩きで 404 になるため）
- **OAuth 設定**：
  - Authorized JavaScript origins：`https://<your-username>.github.io`
  - Authorized redirect URIs：`https://<your-username>.github.io/invoicy/auth/callback`
- ビルド/配布：静的ホスティング（GitHub Pages / Actions で自動デプロイ）

---

## 10. 受け入れの観点（要件トレース）

受け入れの観点（要件トレース）

- 顧客/商品/税率マスターの CRUD が Drive 上で反映される
- 売上登録が Drive に 1 伝票 = 1 ファイルとして保存される
- 売上閲覧で期間・顧客・商品フィルタが機能する
- 請求書作成で、期間×複数顧客に対し請求書ファイルが作成される

---

## 11. PWA 公開・配布（GitHub Pages）

### 11.1 必須ファイル

- `public/manifest.webmanifest`
  - `name: "Invoicy"`, `short_name: "Invoicy"`, `start_url: "/invoicy/"`, `scope: "/invoicy/"`
  - `display: "standalone"`, `theme_color`, `background_color`
  - `icons`: 192/512px（`purpose: "any maskable"` を含む）
- `public/service-worker.js`
  - 役割：**App Shell（HTML/CSS/JS）だけ**を `install` 時にキャッシュ
  - 取得戦略：**network-first**（API は常にネット経由）
- `index.html`
  - `<link rel="manifest" href="/invoicy/manifest.webmanifest">`
  - iOS 向け `<meta name="apple-mobile-web-app-capable" content="yes">`、`apple-touch-icon`

### 11.2 デプロイ手順（例）

1. GitHub リポジトリ `invoicy` を作成し、Pages を有効化
2. `vite build`（出力を `/dist`）→ Actions で `gh-pages` にデプロイ
3. OAuth の **Authorized origins / redirect URIs** を Pages の URL に合わせて登録
4. 実機でインストール：Safari/Chrome → 共有メニュー → **ホーム画面に追加**

### 11.3 ルーティング

- GitHub Pages の性質上、**ハッシュルーティング推奨**（`/#/path`）。
- ヒストリーAPIを使う場合は `404.html` → `index.html` 転送のカスタム実装が必要。

---

## 付記：未確定事項

- 請求書の表現形式（JSON のみ / 将来的に HTML/PDF を追加するか）

