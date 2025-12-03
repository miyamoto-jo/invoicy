/**
 * 売上ドメインモデル
 * @typedef {Object} SaleData
 * @property {string} id - 売上ID（伝票ID）
 * @property {string} customerId - 顧客ID
 * @property {string} issuedOn - 発行日（YYYY-MM-DD形式）
 * @property {SaleLineData[]} lines - 明細行の配列
 * @property {string} [note] - 備考（オプション）
 * @property {SaleTotalsData} totals - 合計情報
 * @property {boolean} [isNegative] - マイナス伝票かどうか
 * @property {string|null} [negatesTicketId] - 相殺する伝票ID（オプション）
 * @property {string} createdAt - 作成日時（ISO形式）
 */

import { SaleLine } from './SaleLine.js'
import { SaleTotals } from './SaleTotals.js'

/**
 * 売上クラス
 */
export class Sale {
  /**
   * @param {SaleData} data - 売上データ
   */
  constructor(data) {
    this.id = data.id
    this.customerId = data.customerId
    this.issuedOn = data.issuedOn
    // linesをSaleLineインスタンスの配列に変換
    this.lines = (data.lines || []).map(lineData => SaleLine.fromData(lineData))
    this.note = data.note || ''
    // totalsをSaleTotalsインスタンスに変換
    this.totals = data.totals ? SaleTotals.fromData(data.totals) : null
    this.isNegative = data.isNegative || false
    this.negatesTicketId = data.negatesTicketId || null
    this.createdAt = data.createdAt
  }

  /**
   * 全体のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validate() {
    if (!this.customerId) {
      throw new Error('顧客を選択してください')
    }
    this.validateLines()
    return true
  }

  /**
   * 明細行のバリデーション（1つ以上必要）
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validateLines() {
    if (!this.lines || this.lines.length === 0) {
      throw new Error('商品を1つ以上追加してください')
    }
    return true
  }

  /**
   * 合計の再計算（linesからtotalsを再生成）
   * @returns {SaleTotals} 再計算された合計
   */
  recalculateTotals() {
    this.totals = SaleTotals.calculateFromLines(this.lines)
    return this.totals
  }

  /**
   * 発行日の表示用フォーマット
   * @returns {string} フォーマットされた発行日（例: "2025年1月15日"）
   */
  formatIssuedOn() {
    const date = new Date(this.issuedOn)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  /**
   * JSON形式にシリアライズ
   * @returns {SaleData} シリアライズされたデータ
   */
  toJSON() {
    return {
      id: this.id,
      customerId: this.customerId,
      issuedOn: this.issuedOn,
      lines: this.lines.map(line => line.toJSON()),
      note: this.note,
      totals: this.totals ? this.totals.toJSON() : null,
      isNegative: this.isNegative,
      negatesTicketId: this.negatesTicketId,
      createdAt: this.createdAt
    }
  }

  /**
   * データからSaleインスタンスを作成（ファクトリメソッド）
   * @param {SaleData} data - 売上データ
   * @returns {Sale} Saleインスタンス
   */
  static fromData(data) {
    return new Sale(data)
  }
}

