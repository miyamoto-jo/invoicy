/**
 * 請求書集計ドメインモデル
 * @typedef {Object} InvoiceSummaryData
 * @property {number} subtotalExclTax - 税抜合計
 * @property {Record<number, number>} taxByRate - 税率ごとの税額
 * @property {number} totalTax - 税額合計
 * @property {number} totalInclTax - 税込合計
 */

import { InvoiceDetail } from './InvoiceDetail.js'

/**
 * 請求書集計クラス
 */
export class InvoiceSummary {
  /**
   * @param {InvoiceSummaryData} data - 請求書集計データ
   */
  constructor(data) {
    this.subtotalExclTax = data.subtotalExclTax
    this.taxByRate = data.taxByRate
    this.totalTax = data.totalTax
    this.totalInclTax = data.totalInclTax
  }

  /**
   * InvoiceDetail[]から集計を計算（静的メソッド）
   * @param {InvoiceDetail[]} details - 請求書明細の配列
   * @returns {InvoiceSummary} 計算された集計
   */
  static calculateFromDetails(details) {
    let subtotalExclTax = 0
    const taxByRate = {}
    
    details.forEach(detail => {
      subtotalExclTax += detail.subtotalExclTax
      
      // 税額計算（切り捨て）
      const taxAmount = detail.calculateTaxAmount()
      if (taxByRate[detail.taxRate]) {
        taxByRate[detail.taxRate] += taxAmount
      } else {
        taxByRate[detail.taxRate] = taxAmount
      }
    })
    
    const totalTax = Object.values(taxByRate).reduce((sum, tax) => sum + tax, 0)
    const totalInclTax = subtotalExclTax + totalTax
    
    return new InvoiceSummary({
      subtotalExclTax,
      taxByRate,
      totalTax,
      totalInclTax
    })
  }

  /**
   * 税抜合計の表示用フォーマット（Vue側のformatNumberに合わせる）
   * @returns {string} フォーマットされた税抜合計（例: "10,000"）
   */
  formatSubtotal() {
    return new Intl.NumberFormat('ja-JP').format(this.subtotalExclTax)
  }

  /**
   * 税額合計の表示用フォーマット（Vue側のformatNumberに合わせる）
   * @returns {string} フォーマットされた税額合計（例: "1,000"）
   */
  formatTotalTax() {
    return new Intl.NumberFormat('ja-JP').format(this.totalTax)
  }

  /**
   * 税込合計の表示用フォーマット（Vue側のformatNumberに合わせる）
   * @returns {string} フォーマットされた税込合計（例: "11,000"）
   */
  formatTotalInclTax() {
    return new Intl.NumberFormat('ja-JP').format(this.totalInclTax)
  }

  /**
   * JSON形式にシリアライズ
   * @returns {InvoiceSummaryData} シリアライズされたデータ
   */
  toJSON() {
    return {
      subtotalExclTax: this.subtotalExclTax,
      taxByRate: this.taxByRate,
      totalTax: this.totalTax,
      totalInclTax: this.totalInclTax
    }
  }

  /**
   * データからInvoiceSummaryインスタンスを作成（ファクトリメソッド）
   * @param {InvoiceSummaryData} data - 請求書集計データ
   * @returns {InvoiceSummary} InvoiceSummaryインスタンス
   */
  static fromData(data) {
    return new InvoiceSummary(data)
  }
}

