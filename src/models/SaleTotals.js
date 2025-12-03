/**
 * 売上合計ドメインモデル
 * @typedef {Object} SaleTotalsData
 * @property {number} subtotalExclTax - 税抜合計
 * @property {Record<number, number>} taxByRate - 税率ごとの税額
 * @property {number} totalTax - 税額合計
 * @property {number} totalInclTax - 税込合計
 */

import { SaleLine } from './SaleLine.js'

/**
 * 売上合計クラス
 */
export class SaleTotals {
  /**
   * @param {SaleTotalsData} data - 売上合計データ
   */
  constructor(data) {
    this.subtotalExclTax = data.subtotalExclTax
    this.taxByRate = data.taxByRate
    this.totalTax = data.totalTax
    this.totalInclTax = data.totalInclTax
  }

  /**
   * SaleLine[]から合計を計算（静的メソッド）
   * @param {SaleLine[]} lines - 売上明細行の配列
   * @returns {SaleTotals} 計算された合計
   */
  static calculateFromLines(lines) {
    let subtotalExclTax = 0
    const taxByRate = {}
    
    lines.forEach(line => {
      const lineTotal = line.calculateSubtotalExclTax()
      subtotalExclTax += lineTotal
      
      // 税額計算（切り捨て）
      const taxAmount = line.calculateTaxAmount()
      if (taxByRate[line.taxRate]) {
        taxByRate[line.taxRate] += taxAmount
      } else {
        taxByRate[line.taxRate] = taxAmount
      }
    })
    
    const totalTax = Object.values(taxByRate).reduce((sum, tax) => sum + tax, 0)
    const totalInclTax = subtotalExclTax + totalTax
    
    return new SaleTotals({
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
   * @returns {SaleTotalsData} シリアライズされたデータ
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
   * データからSaleTotalsインスタンスを作成（ファクトリメソッド）
   * @param {SaleTotalsData} data - 売上合計データ
   * @returns {SaleTotals} SaleTotalsインスタンス
   */
  static fromData(data) {
    return new SaleTotals(data)
  }
}

