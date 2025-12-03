/**
 * 請求書ドメインモデル
 * @typedef {Object} InvoiceData
 * @property {string} id - 請求書ID
 * @property {string} customerId - 顧客ID
 * @property {string} customerName - 顧客名
 * @property {string} period - 対象期間（例: "2025年1月分"）
 * @property {number|string} closingDay - 締め日（1-31または'末日'）
 * @property {string} paymentMethod - 支払い方法
 * @property {InvoiceSummaryData} summary - 集計情報
 * @property {InvoiceDetailData[]} details - 明細の配列
 * @property {string} createdAt - 作成日時（ISO形式）
 */

import { InvoiceDetail } from './InvoiceDetail.js'
import { InvoiceSummary } from './InvoiceSummary.js'

/**
 * 請求書クラス
 */
export class Invoice {
  /**
   * @param {InvoiceData} data - 請求書データ
   */
  constructor(data) {
    this.id = data.id
    this.customerId = data.customerId
    this.customerName = data.customerName
    this.period = data.period
    this.closingDay = data.closingDay
    this.paymentMethod = data.paymentMethod
    // summaryをInvoiceSummaryインスタンスに変換
    this.summary = data.summary ? InvoiceSummary.fromData(data.summary) : null
    // detailsをInvoiceDetailインスタンスの配列に変換
    this.details = (data.details || []).map(detailData => InvoiceDetail.fromData(detailData))
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
    if (!this.period) {
      throw new Error('対象期間を指定してください')
    }
    this.validateDetails()
    return true
  }

  /**
   * 明細のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validateDetails() {
    if (!this.details || this.details.length === 0) {
      throw new Error('明細がありません')
    }
    return true
  }

  /**
   * 集計の再計算（detailsからsummaryを再生成）
   * @returns {InvoiceSummary} 再計算された集計
   */
  recalculateSummary() {
    this.summary = InvoiceSummary.calculateFromDetails(this.details)
    return this.summary
  }

  /**
   * 期間の表示用フォーマット
   * @returns {string} フォーマットされた期間
   */
  formatPeriod() {
    return this.period
  }

  /**
   * 作成日時の表示用フォーマット
   * @returns {string} フォーマットされた作成日時（例: "2025年1月15日 10:30"）
   */
  formatCreatedAt() {
    const date = new Date(this.createdAt)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  /**
   * JSON形式にシリアライズ
   * @returns {InvoiceData} シリアライズされたデータ
   */
  toJSON() {
    return {
      id: this.id,
      customerId: this.customerId,
      customerName: this.customerName,
      period: this.period,
      closingDay: this.closingDay,
      paymentMethod: this.paymentMethod,
      summary: this.summary ? this.summary.toJSON() : null,
      details: this.details.map(detail => detail.toJSON()),
      createdAt: this.createdAt
    }
  }

  /**
   * データからInvoiceインスタンスを作成（ファクトリメソッド）
   * @param {InvoiceData} data - 請求書データ
   * @returns {Invoice} Invoiceインスタンス
   */
  static fromData(data) {
    return new Invoice(data)
  }
}

