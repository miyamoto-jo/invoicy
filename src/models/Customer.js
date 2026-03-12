/**
 * 顧客ドメインモデル
 * @typedef {Object} CustomerData
 * @property {string} id - 顧客ID
 * @property {string} name - 顧客名
 * @property {number|string} closingDay - 締め日（1-31または'末日'）
 * @property {string} paymentMethod - 支払い方法
 * @property {string} [alias] - 別名（オプション）
 * @property {string} [address] - 住所（オプション）
 * @property {string} createdAt - 作成日時（ISO形式）
 * @property {string} updatedAt - 更新日時（ISO形式）
 */

/**
 * 顧客クラス
 */
export class Customer {
  /**
   * @param {CustomerData} data - 顧客データ
   */
  constructor(data) {
    this.id = data.id
    this.name = data.name
    this.closingDay = data.closingDay
    this.paymentMethod = data.paymentMethod
    this.alias = data.alias || ''
    this.address = data.address || ''
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /**
   * 締め日のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validateClosingDay() {
    if (this.closingDay === '末日') {
      return true
    }
    const day = Number(this.closingDay)
    if (isNaN(day)) {
      throw new Error('締め日は数値または「末日」で入力してください')
    }
    if (day < 1 || day > 31) {
      throw new Error('締め日は1〜31の範囲または「末日」で入力してください')
    }
    return true
  }

  /**
   * 顧客名のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validateName() {
    if (!this.name || typeof this.name !== 'string') {
      throw new Error('顧客名は必須です')
    }
    if (this.name.trim() === '') {
      throw new Error('顧客名は必須です')
    }
    return true
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
   * 締め日の表示用フォーマット
   * @returns {string} フォーマットされた締め日
   */
  formatClosingDay() {
    if (this.closingDay === '末日') {
      return '末日'
    }
    return `${this.closingDay}日`
  }

  /**
   * JSON形式にシリアライズ
   * @returns {CustomerData} シリアライズされたデータ
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      closingDay: this.closingDay,
      paymentMethod: this.paymentMethod,
      alias: this.alias,
      address: this.address,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * データからCustomerインスタンスを作成（ファクトリメソッド）
   * @param {CustomerData} data - 顧客データ
   * @returns {Customer} Customerインスタンス
   */
  static fromData(data) {
    return new Customer(data)
  }
}

