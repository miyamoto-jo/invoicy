/**
 * 商品ドメインモデル
 * @typedef {Object} ProductData
 * @property {string} id - 商品ID
 * @property {string} name - 商品名
 * @property {string} [alias] - 別名（オプション）
 * @property {number} priceExclTax - 税抜価格
 * @property {string[]} usedByCustomerIds - 使用可能な顧客IDの配列（空の場合は全顧客）
 * @property {string} createdAt - 作成日時（ISO形式）
 * @property {string} updatedAt - 更新日時（ISO形式）
 */

/**
 * 商品クラス
 */
export class Product {
  /**
   * @param {ProductData} data - 商品データ
   */
  constructor(data) {
    this.id = data.id
    this.name = data.name
    this.alias = data.alias || ''
    this.priceExclTax = data.priceExclTax
    this.usedByCustomerIds = data.usedByCustomerIds || []
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /**
   * 商品名のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validateName() {
    if (!this.name || typeof this.name !== 'string') {
      throw new Error('商品名は必須です')
    }
    if (this.name.trim() === '') {
      throw new Error('商品名は必須です')
    }
    return true
  }

  /**
   * 価格のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validatePrice() {
    if (this.priceExclTax === undefined || this.priceExclTax === null) {
      throw new Error('税抜金額は必須です')
    }
    if (typeof this.priceExclTax !== 'number') {
      throw new Error('税抜金額は数値で入力してください')
    }
    if (isNaN(this.priceExclTax)) {
      throw new Error('税抜金額は数値で入力してください')
    }
    if (this.priceExclTax < 0) {
      throw new Error('税抜金額は0以上の数値を入力してください')
    }
    return true
  }

  /**
   * 税込価格の計算
   * @param {number} taxRate - 税率（パーセント）
   * @returns {number} 税込価格
   */
  calculatePriceInclTax(taxRate) {
    if (taxRate < 0) {
      throw new Error('税率は0以上の数値で入力してください')
    }
    const taxAmount = Math.trunc(this.priceExclTax * (taxRate / 100))
    return this.priceExclTax + taxAmount
  }

  /**
   * 特定顧客が使用可能かチェック
   * @param {string} customerId - 顧客ID
   * @returns {boolean} 使用可能かどうか
   */
  isAvailableForCustomer(customerId) {
    // usedByCustomerIdsが空の場合は全顧客が使用可能
    if (!this.usedByCustomerIds || this.usedByCustomerIds.length === 0) {
      return true
    }
    // 指定された顧客IDが含まれているかチェック
    return this.usedByCustomerIds.includes(customerId)
  }

  /**
   * 表示名の取得
   * @returns {string} 表示名
   */
  getDisplayName() {
    return this.name
  }

  /**
   * スタッフ用の表示名の取得
   * @returns {string} スタッフ用の表示名
   */
  getDisplayNameForStaff() {
    return this.alias || this.name
  }

  /**
   * 価格の表示用フォーマット（Vue側の実装に合わせる）
   * @returns {string} フォーマットされた価格（例: "1,000"）
   */
  formatPrice() {
    return new Intl.NumberFormat('ja-JP').format(this.priceExclTax)
  }

  /**
   * 数値のフォーマット（Vue側のformatNumberに合わせる）
   * @param {number} num - フォーマットする数値
   * @returns {string} フォーマットされた数値
   */
  static formatNumber(num) {
    return new Intl.NumberFormat('ja-JP').format(num)
  }

  /**
   * JSON形式にシリアライズ
   * @returns {ProductData} シリアライズされたデータ
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      alias: this.alias,
      priceExclTax: this.priceExclTax,
      usedByCustomerIds: this.usedByCustomerIds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * データからProductインスタンスを作成（ファクトリメソッド）
   * @param {ProductData} data - 商品データ
   * @returns {Product} Productインスタンス
   */
  static fromData(data) {
    return new Product(data)
  }
}

