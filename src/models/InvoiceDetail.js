/**
 * 請求書明細ドメインモデル
 * @typedef {Object} InvoiceDetailData
 * @property {string} orderDate - 注文日（YYYY-MM-DD形式）
 * @property {string} productName - 商品名
 * @property {number} quantity - 数量
 * @property {number} unitPriceExclTax - 税抜単価
 * @property {number} taxRate - 税率（パーセント）
 * @property {number} subtotalExclTax - 小計（税抜）
 */

/**
 * 請求書明細クラス
 */
export class InvoiceDetail {
  /**
   * @param {InvoiceDetailData} data - 請求書明細データ
   */
  constructor(data) {
    this.orderDate = data.orderDate
    this.productName = data.productName
    this.quantity = data.quantity
    this.unitPriceExclTax = data.unitPriceExclTax
    this.taxRate = data.taxRate
    this.subtotalExclTax = data.subtotalExclTax
  }

  /**
   * 小計（税抜）の計算
   * @returns {number} 小計（税抜）
   */
  calculateSubtotalExclTax() {
    return this.quantity * this.unitPriceExclTax
  }

  /**
   * 税額の計算
   * @returns {number} 税額
   */
  calculateTaxAmount() {
    return Math.floor(this.subtotalExclTax * (this.taxRate / 100))
  }

  /**
   * 注文日の表示用フォーマット
   * @returns {string} フォーマットされた注文日（例: "2025/01/15"）
   */
  formatOrderDate() {
    const date = new Date(this.orderDate)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  /**
   * 価格の表示用フォーマット（Vue側のformatNumberに合わせる）
   * @returns {string} フォーマットされた価格
   */
  formatPrice() {
    return new Intl.NumberFormat('ja-JP').format(this.unitPriceExclTax)
  }

  /**
   * 小計の表示用フォーマット（Vue側のformatNumberに合わせる）
   * @returns {string} フォーマットされた小計
   */
  formatSubtotal() {
    return new Intl.NumberFormat('ja-JP').format(this.subtotalExclTax)
  }

  /**
   * JSON形式にシリアライズ
   * @returns {InvoiceDetailData} シリアライズされたデータ
   */
  toJSON() {
    return {
      orderDate: this.orderDate,
      productName: this.productName,
      quantity: this.quantity,
      unitPriceExclTax: this.unitPriceExclTax,
      taxRate: this.taxRate,
      subtotalExclTax: this.subtotalExclTax
    }
  }

  /**
   * データからInvoiceDetailインスタンスを作成（ファクトリメソッド）
   * @param {InvoiceDetailData} data - 請求書明細データ
   * @returns {InvoiceDetail} InvoiceDetailインスタンス
   */
  static fromData(data) {
    return new InvoiceDetail(data)
  }
}

