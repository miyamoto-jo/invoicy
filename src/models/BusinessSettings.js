/**
 * 事業者設定ドメインモデル
 * @typedef {Object} BusinessSettingsData
 * @property {string} name - 事業者名
 * @property {string} representative - 代表者名
 * @property {string} number - 事業者番号（Tから始まる）
 * @property {string} [bankInfo] - 振込先情報（オプション）
 * @property {string} [phone] - 電話番号（オプション）
 * @property {string} [address] - 住所（オプション）
 * @property {string} createdAt - 作成日時（ISO形式）
 * @property {string} updatedAt - 更新日時（ISO形式）
 */

/**
 * 事業者設定クラス
 */
export class BusinessSettings {
  /**
   * @param {BusinessSettingsData} data - 事業者設定データ
   */
  constructor(data) {
    this.name = data.name
    this.representative = data.representative
    this.number = data.number
    this.bankInfo = data.bankInfo || ''
    this.phone = data.phone || ''
    this.address = data.address || ''
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /**
   * 事業者名のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validateName() {
    if (!this.name || typeof this.name !== 'string') {
      throw new Error('事業者名は必須です')
    }
    if (this.name.trim() === '') {
      throw new Error('事業者名は必須です')
    }
    return true
  }

  /**
   * 代表者名のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validateRepresentative() {
    if (!this.representative || typeof this.representative !== 'string') {
      throw new Error('代表者名は必須です')
    }
    if (this.representative.trim() === '') {
      throw new Error('代表者名は必須です')
    }
    return true
  }

  /**
   * 事業者番号のバリデーション
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validateNumber() {
    if (!this.number || typeof this.number !== 'string') {
      throw new Error('事業者番号は必須です')
    }
    if (this.number.trim() === '') {
      throw new Error('事業者番号は必須です')
    }
    if (!this.number.startsWith('T')) {
      throw new Error('事業者番号はTから始まる必要があります')
    }
    return true
  }

  /**
   * 全体のバリデーション（必須項目チェック）
   * @returns {boolean} バリデーション結果
   * @throws {Error} バリデーションエラー
   */
  validate() {
    this.validateName()
    this.validateRepresentative()
    this.validateNumber()
    return true
  }

  /**
   * JSON形式にシリアライズ
   * @returns {BusinessSettingsData} シリアライズされたデータ
   */
  toJSON() {
    return {
      name: this.name,
      representative: this.representative,
      number: this.number,
      bankInfo: this.bankInfo,
      phone: this.phone,
      address: this.address,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * データからBusinessSettingsインスタンスを作成（ファクトリメソッド）
   * @param {BusinessSettingsData} data - 事業者設定データ
   * @returns {BusinessSettings} BusinessSettingsインスタンス
   */
  static fromData(data) {
    return new BusinessSettings(data)
  }
}

