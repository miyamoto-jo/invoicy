/**
 * 税率ドメインモデル
 * @typedef {Object} TaxData
 * @property {string} id - 税率ID
 * @property {number} rate - 税率（パーセント）
 * @property {string} description - 説明
 * @property {boolean} isActive - 有効/無効フラグ
 * @property {string} createdAt - 作成日時（ISO形式）
 * @property {string} updatedAt - 更新日時（ISO形式）
 */

/**
 * 税率クラス
 */
export class Tax {
  /**
   * @param {TaxData} data - 税率データ
   */
  constructor(data) {
    this.id = data.id
    this.rate = data.rate
    this.description = data.description || ''
    this.isActive = data.isActive !== false // デフォルトはtrue
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /**
   * 税率のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validateRate() {
    if (this.rate === undefined || this.rate === null) {
      throw new Error('税率は必須です')
    }
    if (typeof this.rate !== 'number') {
      throw new Error('税率は数値で入力してください')
    }
    if (this.rate < 0) {
      throw new Error('税率は0以上の数値で入力してください')
    }
    return true
  }

  /**
   * 税率の表示用フォーマット
   * @returns {string} フォーマットされた税率（例: "10%"）
   */
  formatRate() {
    return `${this.rate}%`
  }

  /**
   * 有効性チェック
   * @returns {boolean} 有効かどうか
   */
  isValid() {
    try {
      this.validateRate()
      return this.isActive
    } catch {
      return false
    }
  }

  /**
   * JSON形式にシリアライズ
   * @returns {TaxData} シリアライズされたデータ
   */
  toJSON() {
    return {
      id: this.id,
      rate: this.rate,
      description: this.description,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * データからTaxインスタンスを作成（ファクトリメソッド）
   * @param {TaxData} data - 税率データ
   * @returns {Tax} Taxインスタンス
   */
  static fromData(data) {
    return new Tax(data)
  }
}

