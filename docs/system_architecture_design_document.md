# Invoicy システム基本設計

> 本設計は、提示された要件定義（最新版）を前提にした**最小構成の基本設計**です。詳細設計（画面遷移・UI・アルゴリズム詳細）は別途。バックエンドは構築せず、**オンライン前提**で Google Drive に即時保存します。

---

## 1. システム全体像

- **クライアントのみの Web アプリ（PWA／GitHub Pages 配布）**
- **外部サービス**：Google Identity Services（OAuth 2.0 + PKCE）、Google Drive API
- **データ保存**：ユーザーの Google Drive 上に**アプリ専用フォルダ**を作成し、各データを**ファイルとして即時アップロード**
- **対象機能**：
  - 顧客マスター／商品マスター／消費税マスターの CRUD、一括登録
  - 売上登録（ローカルメモリ保存→一括反映）・閲覧・分析
  - 請求書作成（複数顧客対応、期間集計）・閲覧・分析・PDF出力
  - データ削除機能

### 1.1 コンポーネント構成

- **UI 層**：SPA（Vue 3 + Vue Router、ハッシュルーティング）
  - ルーティング：`/dashboard`, `/customers`, `/products`, `/taxes`, `/sales`, `/invoices`, `/data-deletion`等
  - コンポーネント：フォーム、一覧、分析、PDF出力モーダル等
- **アプリ層**：
  - 状態管理：Piniaストア（auth, setting, customers, products, taxes, sales, invoices）
  - ドメインモデル：Customer, Product, Sale, Invoice等のクラス実装
  - ドメインロジック：ID 採番、集計、バリデーション、税額計算
- **インフラ層**：
  - 認証：Google Identity Services（GIS）、トークン管理・リフレッシュ
  - Google Drive クライアント：GoogleApiClientクラス（CRUD, 検索, フォルダ管理）
  - ストレージ：ローカルストレージ（キャッシュ）、セッションストレージ（トークン）

---

## 2. 外部連携（認証・権限）

- **認証**：Google Identity Services の Authorization Code Flow（PKCE）
- **スコープ**：`openid email profile` + `https://www.googleapis.com/auth/drive.file` + `https://www.googleapis.com/auth/drive.metadata.readonly`
  - `drive.file` により**アプリが作成・開いたファイルのみ**アクセス可能
  - `drive.metadata.readonly` によりファイル検索・メタデータ取得が可能
- **トークン管理**：
  - ブラウザ実行時は**短期トークンを必要時に再取得**（リフレッシュトークン非前提）
  - トークンは`sessionStorage`に保存
  - 401エラー発生時は自動的にトークンをリフレッシュして再試行（最大1回）
  - トークン有効期限情報の取得・表示機能を実装
- **サインアウト**：アプリ側セッションを破棄し、必要時に再認証

---

## 3. データ永続化（Google Drive 構成）

### 3.1 フォルダ構成

- ルート：`/Invoicy/`（初回起動時に存在確認→なければ作成）
  - `setting.json`  … 設定（事業者設定・アプリ設定を1ファイルで管理）
  - `masters/`
    - `customers.jsonl` … 顧客マスター（全顧客データを1ファイルで管理）
    - `products.jsonl`  … 商品マスター（全商品データを1ファイルで管理）
    - `taxes.json`     … 税率マスター（全税率データを1ファイルで管理）
  - `sales/` … 売上情報
    - 月次台帳（1ヶ月分の伝票） = 1 ファイル（`ledger-YYYYMM.jsonl`）
      - 1行 = 伝票情報
  - `invoices/`
    - 月次台帳（1ヶ月分の請求書） = 1 ファイル（`YYYY-MM-invoices.jsonl`）
      - 1行 = 1顧客の請求書情報
      - 例：`2025-01-invoices.jsonl`（2025年1月分の請求書）

> 単一ユーザー運用を想定し、**マスターデータは1ファイルで管理**、**伝票・請求書はレコード単位ファイル**方式を採用。マスター検索はファイル全体を取得してクライアント側でフィルタ。
> 
> **JSONL形式の採用理由**：
> - 逐次処理しやすい：ダウンロードしながら行ごとにパース＆フィルタできます（メモリ節約・一覧表示が早い）
> - 追記が楽＆衝突に強い：末尾に1行追加でOK（実際は置換アップロードでも、整形がシンプル）
> - ツール親和性：jq、BigQuery、各種ログ基盤などが改行区切りJSONを前提にサポート
> - サイズ差はほぼなし：配列の [ , ] が無い代わりに改行が入るだけ

### 3.4 キャッシュ / パフォーマンス方針

- 目的：Drive API 呼び出し回数とネットワーク往復を最小化し、体感速度を向上させる。
- キャッシュ対象：事業者設定、商品/顧客/税率マスター、売上、請求書。
- キャッシュ層：
  - **インメモリ（Piniaストア）**：画面遷移中の最優先ソース。
  - **ローカルストレージ**：TTL付き（デフォルト10分）。`localStorage` に保存し、読み込み時はここを優先。
  - **セッションストレージ**：認可トークンを保存（既存方針の通り）。
- フロー：
  - 読み込み：`localStorage` → インメモリ → 不足/期限切れ時のみ Drive 取得。
  - 書き込み：インメモリ更新 → `localStorage` 更新 → Drive 同期（失敗時リトライを想定）。
- その他：
  - 税率ファイルは単一取得に集約し、二重フェッチを避ける。
  - 月次データ（sales/invoices）は月単位でキャッシュし、必要月のみ Drive にアクセス。

### 3.2 ファイル命名・ID

- **ID 生成**：`ulid` もしくは `crypto.randomUUID()` による一意 ID
- **ファイル名**：`{entityId}.json`（拡張を避けるためシンプル運用）
- **タイムゾーン**：JST（UTC+09:00）。ISO 8601（`YYYY-MM-DDTHH:mm:ss.sss+09:00`）で記録し、UI もJST表示。

### 3.3 JSON スキーマ（最小）

**設定（setting.json）**

```json
{
    "name": "事業者名",
    "number": "T1234567890123",
    "representative": "代表者名",
    "bankInfo": "振込先情報",
    "phone": "電話番号",
    "address": "住所",
    "createdAt": "2025-08-16T12:34:56+09:00",
    "updatedAt": "2025-08-16T12:34:56+09:00"
}
```

> **business**: 事業者設定情報

**顧客マスター（masters/customers.jsonl）**

```jsonl
{"id": "cus_...", "name": "顧客名称", "alias": "顧客管理用名称", "address": "住所", "closingDay": "末日", "paymentMethod": "振込", "createdAt": "2025-08-16T12:34:56+09:00", "updatedAt": "2025-08-16T12:34:56+09:00"}
{"id": "cus_...", "name": "顧客名称2", "alias": "顧客管理用名称2", "address": "住所2", "closingDay": "末日", "paymentMethod": "振込", "createdAt": "2025-08-16T12:34:56+09:00", "updatedAt": "2025-08-16T12:34:56+09:00"}
```

**商品マスター（masters/products.jsonl）**

```jsonl
{"id": "prd_...", "name": "商品名称", "alias": "商品管理用名称", "priceExclTax": 250, "usedByCustomerIds": ["cus_..."], "createdAt": "2025-08-16T12:34:56+09:00", "updatedAt": "2025-08-16T12:34:56+09:00"}
{"id": "prd_...", "name": "商品名称2", "alias": "商品管理用名称2", "priceExclTax": 300, "usedByCustomerIds": ["cus_..."], "createdAt": "2025-08-16T12:34:56+09:00", "updatedAt": "2025-08-16T12:34:56+09:00"}
```

**税率マスター（masters/taxes.json）**

```json
{
  "taxes": [
    { "id": "tax_10", "rate": 10, "createdAt": "2025-08-16T12:34:56+09:00" },
    { "id": "tax_8", "rate": 8, "createdAt": "2025-08-16T12:34:56+09:00" }
  ],
  "rounding": "floor", // 切り捨て、切り上げ、四捨五入（切り捨てがデフォルト）
  "default_tax_id": "tax_10", // デフォルト税率ID
  "lastUpdated": "2025-08-16T12:34:56+09:00"
}
```

**月次台帳（sales/ledger-YYYYMM.jsonl）**

```jsonl
{"id": "tkt_...", "customerId": "cus_...", "issuedOn": "2025-08-31", "lines": [{"productId": "prd_...", "productName": "商品A", "alias": "商品管理用名称", "quantity": 2, "priceExclTax": 250, "taxRate": 10}], "note": "", "totals": {"taxByRate": {"10": 50, "8": 0}, "totalInclTax": 550}, "isNegative": false, "negatesTicketId": "tkt_...", "createdAt": "2025-08-16T12:34:56+09:00"}}
{"id": "tkt_...", "customerId": "cus_...", "issuedOn": "2025-08-30", "lines": [{"productId": "prd_...", "productName": "商品B", "alias": "商品管理用名称", "quantity": 1, "priceExclTax": 300, "taxRate": 10}], "note": "", "totals": {"taxByRate": {"10": 30, "8": 0}, "totalInclTax": 330}, "isNegative": false, "negatesTicketId": null, "createdAt": "2025-08-16T12:34:56+09:00"}}
```

**請求書（invoices/YYYY-MM-invoices.jsonl）**

```jsonl
{"id": "inv_...", "customerId": "cus_...", "customerName": "顧客名称", "period": "2025年8月分", "closingDay": "末日", "paymentMethod": "振込", "summary": {"subtotalExclTax": 1000, "taxByRate": {"10": 100, "8": 0}, "totalTax": 100, "totalInclTax": 1100}, "details": [{"orderDate": "2025-08-15", "productName": "商品A", "quantity": 2, "unitPriceExclTax": 250, "taxRate": 10, "subtotalExclTax": 500}], "createdAt": "2025-08-16T12:34:56+09:00"}
```

> **請求書の構造**：
> - `id`: 請求書ID（顧客IDと期間から生成される固定ID）
> - `customerId`: 顧客ID
> - `customerName`: 顧客名
> - `period`: 対象期間（例："2025年8月分"）
> - `closingDay`: 締め日（1-31または"末日"）
> - `paymentMethod`: 支払方法（"振込"または"現金"）
> - `summary`: 集計情報（税抜合計、税率別税額、税額合計、税込合計）
> - `details`: 明細配列（注文日、商品名、数量、単価、税率、小計）
> - `createdAt`: 作成日時（JST形式）

---

## 4. 主要ユースケースとシーケンス

### 4.1 事業者設定管理

1. **初回設定**
   - 初回ログイン時：`setting.json`が存在しない場合、事業者設定作成画面を表示
   - フォーム入力（事業者名、事業者番号、代表者名、振込先情報、電話番号、住所）
   - バリデーション（必須項目、事業者番号のT始まり）
   - `setting.json`を`files.create`で作成

2. **設定更新**
   - ダッシュボードから事業者設定編集画面に遷移
   - 既存の`setting.json`を取得してフォームに表示
   - 事業者情報を更新
   - バリデーション実行
   - `files.update`で保存

3. **ナビゲーション制御**
   - 認証済みユーザーがダッシュボードにアクセス時、事業者設定の存在確認
   - 設定が存在しない場合は自動的に設定画面にリダイレクト

### 4.2 マスター CRUD

#### 4.2.1 顧客マスター管理

1. **初期化**
   - `masters/customers.jsonl`ファイルの存在確認
   - ファイルが存在しない場合は空の配列で初期化
   - 既存データを読み込み、ローカル状態に設定

2. **新規作成**
   - フォーム入力（顧客名、管理用名称、住所、締切日、支払方法）
   - バリデーション（顧客名必須）
   - 顧客ID生成：`cus_{timestamp}_{random}`
   - ローカル状態に追加
   - `files.update`でファイル全体を更新

3. **更新**
   - 既存顧客データをフォームに表示
   - フォーム入力・バリデーション
   - ローカル状態の該当レコードを更新
   - `files.update`でファイル全体を更新

4. **削除**
   - 削除確認ダイアログ表示
   - ローカル状態から該当レコードを削除
   - `files.update`でファイル全体を更新

5. **一括登録**
   - CSV形式での一括入力
   - 各行のバリデーション
   - 複数レコードを一括でローカル状態に追加
   - `files.update`でファイル全体を更新

#### 4.2.2 商品マスター管理

1. **初期化**
   - `masters/products.jsonl`ファイルの存在確認
   - ファイルが存在しない場合は空の配列で初期化
   - 既存データを読み込み、ローカル状態に設定

2. **新規作成**
   - フォーム入力（商品名、管理用名称、税抜価格、使用顧客）
   - バリデーション（商品名必須、価格0以上）
   - 商品ID生成：`prd_{timestamp}_{random}`
   - ローカル状態に追加
   - `files.update`でファイル全体を更新

3. **更新**
   - 既存商品データをフォームに表示
   - フォーム入力・バリデーション
   - ローカル状態の該当レコードを更新
   - `files.update`でファイル全体を更新

4. **削除**
   - 削除確認ダイアログ表示
   - ローカル状態から該当レコードを削除
   - `files.update`でファイル全体を更新

5. **一括登録**
   - テーブル形式での一括入力
   - 各行のバリデーション
   - 複数レコードを一括でローカル状態に追加
   - `files.update`でファイル全体を更新

#### 4.2.3 税率マスター管理

1. **初期化**
   - `masters/taxes.json`ファイルの存在確認
   - ファイルが存在しない場合はデフォルト税率（10%）で初期化
   - 既存データを読み込み、ローカル状態に設定

2. **税率設定**
   - 端数計算方式の設定（切り捨て、切り上げ、四捨五入）
   - デフォルト税率の設定
   - 設定変更時に`files.update`でファイル全体を更新

3. **税率作成**
   - フォーム入力（税率、説明、有効/無効）
   - バリデーション（税率0-100の範囲）
   - 税率ID生成：`tax_{rate}`
   - ローカル状態に追加
   - `files.update`でファイル全体を更新

4. **税率更新**
   - 既存税率データをフォームに表示
   - フォーム入力・バリデーション
   - ローカル状態の該当レコードを更新
   - `files.update`でファイル全体を更新

5. **税率削除**
   - 削除確認ダイアログ表示
   - ローカル状態から該当レコードを削除
   - `files.update`でファイル全体を更新

### 4.2 売上登録（伝票作成）

1. **フォーム入力**
   - 顧客選択（必須）
   - 日付選択（デフォルト：今日）
   - 商品選択＋数量入力（カード形式、最大999個）
   - 伝票全体の税率設定（デフォルト：設定ファイルの税率）
   - 備考入力（任意）

2. **ローカルメモリ保存**
   - フォームバリデーション実行
   - 売上データをローカルメモリに保存
   - フォームクリア
   - 成功トースト表示

3. **Googleドライブ反映**
   - 「売上反映」ボタンでローカルメモリの全売上を一括反映
   - 月別に売上データをグループ化
   - 各月の月次ファイル（`ledger-YYYYMM.jsonl`）を取得または作成
   - 伝票ID生成：`tkt_{timestamp}_{random}`
   - 税額計算（切り捨て）
   - 各月次ファイルに該当する伝票を追加
   - `files.update` で月次ファイルを更新
   - ローカルメモリクリア
   - 成功トースト表示

### 4.3 売上閲覧（期間・フィルタ）

1. **月次ファイル検索**
   - `sales/` 直下の月次ファイル（`ledger-YYYYMM.jsonl`）を対象
   - 期間フィルタ：`name >= 'ledger-YYYYMM.jsonl' and name <= 'ledger-YYYYMM.jsonl'` で月次ファイルを絞り込み
   - `files.list` で該当する月次ファイルのメタ情報を取得

2. **売上データ取得・フィルタ**
   - 各月次ファイルの内容を `files.get` で取得
   - JSONL形式の内容をパースして個別の売上データに分解
   - クライアント側で日付レンジ・顧客・商品フィルタを適用
   - 日付でソートして結果を返却

### 4.4 請求書作成（期間×複数顧客）

1. **初期設定・データ準備**
   - 対象月の選択（デフォルト：現在の月、YYYY-MM形式）
   - 顧客一覧の取得（`masters/customers.jsonl`から）
   - 全顧客をデフォルトで選択済み状態にする
   - 請求書作成画面の初期化

2. **顧客選択・期間設定**
   - 対象顧客の選択（複数選択可、デフォルト全選択）
   - 対象月の確認・変更（YYYY-MM形式）
   - 選択顧客数の表示・確認

3. **締め日計算処理**
   - 各選択顧客の締め日情報を取得
   - 締め日に基づいて請求書対象期間を計算：
     - **25日締めの場合**：前月26日〜当月25日
     - **末日締めの場合**：当月1日〜当月末日（閏年考慮）
   - 各顧客の請求書対象期間を表示

4. **伝票データ取得・集計**
   - `sales/`フォルダから対象月の月次ファイル（`ledger-YYYYMM.jsonl`）を取得
   - 各顧客の締め日計算結果に基づいて伝票をフィルタリング
   - 顧客単位で伝票をグループ化
   - 対象伝票が存在しない顧客の特定

5. **請求書データ生成**
   - 各顧客ごとに請求書JSONデータを作成：
     - 請求書ID生成（`inv_{timestamp}_{random}`）
     - 対象期間（from/to）
     - 対象伝票ID一覧
     - 集計情報（税抜小計、税率別税額、税込合計）
     - 作成日時（JST形式）
   - 請求書データのバリデーション

6. **ファイル保存**
   - `invoices/`フォルダに`YYYY-MM-invoices.jsonl`ファイルを作成（例：`2025-01-invoices.jsonl`）
   - 各顧客の請求書データを1行ずつJSONL形式で保存
   - 既存ファイルがある場合は追記、ない場合は新規作成
   - `files.update`または`files.create`でファイル保存
   - 請求書IDは顧客IDと期間から固定IDを生成（`generateInvoiceId`）

7. **完了処理**
   - 成功メッセージ表示
   - 作成された請求書件数の表示
   - 請求書一覧画面への遷移オプション
   - 作成結果のサマリー表示

8. **エラーハンドリング**
   - 対象伝票が存在しない場合の処理
   - 締め日計算エラーの処理
   - ファイル保存失敗時の処理
   - ネットワークエラー時の再試行機能
   - 部分的な失敗時の処理（一部顧客のみ成功した場合）

---

## 5. 画面（概要）

- **Dashboard**：メイン画面、事業者設定編集ボタン配置、Google Drive容量情報表示
- **BusinessSettings**：事業者設定作成・編集画面
- **Customers**：一覧／検索／新規／編集／削除／一括登録（CSV）
- **Products**：一覧／新規／編集／削除（価格＝税抜）／一括登録
- **Taxes**：一覧／登録／削除（単純な率の管理）
- **Sales**：
  - 登録（伝票作成）：ローカルメモリ保存→一括反映
  - 一覧（期間・顧客・商品フィルタ）
  - 分析（売上分析画面）
- **Invoices**：
  - 作成（期間×複数顧客）
  - 一覧（期間・顧客フィルタ）
  - 分析（請求書分析画面）
- **DataDeletion**：データ削除画面（売上データ・請求書データの削除）

---

## 6. バリデーション（例）

- 事業者設定：`name` 必須、`number` 必須かつT始まり、`representative` 必須、その他は任意
- 顧客：`name` 必須、`alias` 任意、`address` 任意、`closingDay` 1〜31の範囲または末日（必須）、`paymentMethod` 振込または現金（必須）
- 商品：`name` 必須、`priceExclTax >= 0`、`usedByCustomerIds` は配列/空可
- 税率：整数（例：8 または 10）
- 伝票：`lines.length >= 1`、各 `qty > 0`、`unitPriceExclTax >= 0`、`taxRate` は登録済みのみ
- 請求書：`period.from <= period.to`、`ticketIds` が 1 件以上

---

## 7. エラーハンドリング

- **ネットワーク**：失敗時はエラー表示＋**再試行**ボタン。オフライン時は**保存不可**のメッセージを明示。
- **認可**：
  - トークン失効時（401エラー）は自動的にトークンをリフレッシュして再試行（最大1回）
  - リフレッシュに失敗した場合は再ログイン誘導
- **Drive**：`403/404/429/5xx` に応じてリトライ（指数バックオフ上限 3 回）。
- **トークン管理**：
  - トークン有効期限情報の取得・表示機能を実装
  - トークン検証機能により、セッション開始時に有効性を確認

---

## 8. 非機能（最小）

- 対応ブラウザ：iOS Safari（最新）、Android Chrome（最新）、デスクトップ最新版（動作確認用）
- セキュリティ：
  - HTTPS（GitHub Pages）必須
  - OAuth は PKCE
  - トークンは**sessionStorage**で短期保持
  - ローカルストレージにフォルダIDやキャッシュデータを保存（機密情報は含まない）
- パフォーマンス：
  - 一覧は**必要ページのみページング**
  - Drive への API はバックオフ制御
  - 請求書データは年単位でキャッシュ（`invoicesByYear`）
  - ローカルストレージにマスターデータや設定をキャッシュ
- ルーティング：**ハッシュルーティング**（`createWebHashHistory`）で 404 回避（`/#/customers` など）
- PWA：
  - Service Worker は**最小（App Shell 程度）**
  - API レスポンスはキャッシュしない（オンライン前提）
  - `manifest.webmanifest`でPWA設定を定義
  - アイコンは192px/512pxを用意
- 監査：操作ログ（クライアント内のメモリ/コンソール）— 個人利用のため外部送信なし

---

## 9. リポジトリと設定（参考）

- `README` に前提（オンライン必須、Drive 保存、PWA配布）を明記
- `.env`（ビルド時埋め込み）：
  - `VITE_GOOGLE_CLIENT_ID`：Google OAuth クライアントID
  - `VITE_APP_FOLDER_NAME=Invoicy`：アプリフォルダ名（デフォルト）
  - `VITE_GOOGLE_API_BASE`：Google API ベースURL（デフォルト：`https://www.googleapis.com`）
- **Vite設定**：
  - `base: '/invoicy/'`：GitHub Pages用のベースパス
  - `createWebHashHistory`：ハッシュルーティングを使用
- **GitHub Pages**：`main` → Pages（ビルド出力を `/dist` に配置）
- **ルーティング**：\*\*ハッシュルーティング（#/）\*\*を使用（Pages は SPA のパス直叩きで 404 になるため）
- **OAuth 設定**：
  - Authorized JavaScript origins：`https://<your-username>.github.io`
  - Authorized redirect URIs：`https://<your-username>.github.io/invoicy/auth/callback`
- ビルド/配布：静的ホスティング（GitHub Pages / Actions で自動デプロイ）
- **依存関係**：
  - Vue 3.4.0
  - Vue Router 4.2.5
  - Pinia 2.1.7（状態管理）
  - Chart.js 4.5.1 / vue-chartjs 5.3.3（分析画面用）
  - jsPDF 3.0.3 / html2canvas 1.4.1（PDF出力用）

---

## 10. 受け入れの観点（要件トレース）

受け入れの観点（要件トレース）

- 初回ログイン時に事業者設定作成画面が表示され、設定が Drive 上で保存される
- ダッシュボードから事業者設定編集画面に遷移できる
- ダッシュボードにGoogle Drive容量情報が表示される
- 顧客/商品/税率マスターの CRUD が Drive 上で反映される
- 顧客/商品マスターの一括登録機能が動作する
- 売上登録がローカルメモリに保存され、一括反映で Drive に月次ファイルとして保存される
- 売上閲覧で期間・顧客・商品フィルタが機能する
- 売上分析画面で売上データの分析が可能
- 請求書作成で、期間×複数顧客に対し請求書ファイル（`YYYY-MM-invoices.jsonl`）が作成される
- 請求書閲覧で期間・顧客フィルタが機能する
- 請求書分析画面で請求書データの分析が可能
- データ削除画面で売上データ・請求書データの削除が可能

---

## 11. PWA 公開・配布（GitHub Pages）

### 11.1 必須ファイル

- `public/manifest.webmanifest`
  - `name: "Invoicy"`, `short_name: "Invoicy"`, `start_url: "/invoicy/"`, `scope: "/invoicy/"`
  - `display: "standalone"`, `theme_color: "#4285f4"`, `background_color: "#ffffff"`
  - `orientation: "portrait-primary"`
  - `icons`: 192/512px（`purpose: "any maskable"` を含む）
- `public/service-worker.js`
  - 役割：**App Shell（HTML/CSS/JS）だけ**を `install` 時にキャッシュ
  - 取得戦略：**cache-first**（キャッシュがあれば使用、なければネットワーク）
  - API レスポンスはキャッシュしない（オンライン前提）
- `index.html`
  - `<link rel="manifest" href="/invoicy/manifest.webmanifest">`
  - iOS 向け `<meta name="apple-mobile-web-app-capable" content="yes">`、`apple-touch-icon`
  - Google Identity Services のスクリプト読み込み

### 11.2 デプロイ手順（例）

1. GitHub リポジトリ `invoicy` を作成し、Pages を有効化
2. `vite build`（出力を `/dist`）→ Actions で `gh-pages` にデプロイ
3. OAuth の **Authorized origins / redirect URIs** を Pages の URL に合わせて登録
4. 実機でインストール：Safari/Chrome → 共有メニュー → **ホーム画面に追加**

### 11.3 ルーティング

- GitHub Pages の性質上、**ハッシュルーティング推奨**（`/#/path`）。
- ヒストリーAPIを使う場合は `404.html` → `index.html` 転送のカスタム実装が必要。

---

## 付記：実装済み機能

### 追加実装された機能

1. **データ削除機能**
   - 売上データ・請求書データの削除画面を実装
   - 月次ファイル単位での削除が可能
   - 削除前に確認ダイアログを表示

2. **分析機能**
   - 売上分析画面：売上データの集計・グラフ表示
   - 請求書分析画面：請求書データの集計・グラフ表示
   - Chart.jsを使用した可視化

3. **PDF出力機能**
   - 請求書のPDF出力機能（jsPDF + html2canvas）
   - PDFエクスポートモーダルを実装

4. **ローカルストレージキャッシュ**
   - マスターデータ（顧客・商品・税率）のキャッシュ
   - 事業者設定のキャッシュ
   - ユーザー情報のキャッシュ
   - フォルダIDのキャッシュ

5. **トークン管理の強化**
   - トークン有効期限情報の取得・表示
   - 自動トークンリフレッシュ機能
   - 401エラー時の自動再試行

6. **Google Drive容量情報表示**
   - ダッシュボードに容量情報を表示
   - 使用率の可視化
   - 容量不足警告

### 技術的な実装詳細

- **状態管理**：Piniaを使用したストアパターン
- **ドメインモデル**：各エンティティ（Customer, Product, Sale, Invoice等）をクラスとして実装
- **API クライアント**：GoogleApiClientクラスでAPI呼び出しを抽象化
- **エラーハンドリング**：トークン期限切れ時の自動リフレッシュ、再試行ロジック
- **ファイル管理**：月次ファイル単位での管理、JSONL形式での保存

## 付記：未確定事項

- 請求書の表現形式（JSON のみ / 将来的に HTML/PDF を追加するか）→ **実装済み（PDF出力機能）**

