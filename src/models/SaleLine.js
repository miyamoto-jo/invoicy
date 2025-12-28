/**
 * 売上明細行ドメインモデル
 * @typedef {Object} SaleLineData
 * @property {string} productId - 商品ID
 * @property {string} productName - 商品名
 * @property {number} quantity - 数量
 * @property {number} priceExclTax - 税抜単価
 * @property {number} taxRate - 税率（パーセント）
 */

/**
 * 売上明細行クラス
 */
export class SaleLine {
  /**
   * @param {SaleLineData} data - 売上明細行データ
   */
  constructor(data) {
    this.productId = data.productId
    this.productName = data.productName
    this.quantity = data.quantity
    this.priceExclTax = data.priceExclTax
    this.taxRate = data.taxRate
  }

  /**
   * 小計（税抜）の計算
   * @returns {number} 小計（税抜）
   */
  calculateSubtotalExclTax() {
    return this.quantity * this.priceExclTax
  }

  /**
   * 税額の計算（切り捨て）
   * @returns {number} 税額
   */
  calculateTaxAmount() {
    const subtotal = this.calculateSubtotalExclTax()
    return Math.trunc(subtotal * (this.taxRate / 100))
  }

  /**
   * 小計（税込）の計算
   * @returns {number} 小計（税込）
   */
  calculateSubtotalInclTax() {
    return this.calculateSubtotalExclTax() + this.calculateTaxAmount()
  }

  /**
   * 価格の表示用フォーマット（Vue側のformatNumberに合わせる）
   * @returns {string} フォーマットされた価格
   */
  formatPrice() {
    return new Intl.NumberFormat('ja-JP').format(this.priceExclTax)
  }

  /**
   * JSON形式にシリアライズ
   * @returns {SaleLineData} シリアライズされたデータ
   */
  toJSON() {
    return {
      productId: this.productId,
      productName: this.productName,
      quantity: this.quantity,
      priceExclTax: this.priceExclTax,
      taxRate: this.taxRate
    }
  }

  /**
   * データからSaleLineインスタンスを作成（ファクトリメソッド）
   * @param {SaleLineData} data - 売上明細行データ
   * @returns {SaleLine} SaleLineインスタンス
   */
  static fromData(data) {
    return new SaleLine(data)
  }
}

