import { STORAGE_KEYS } from '../config/api.js'

/**
 * ローカルストレージ操作用のComposable
 * アプリケーション全体で共通して使用されるローカルストレージ機能を提供
 */
export function useStorage() {
  /**
   * TTL付きでデータを保存
   * @param {string} key - 保存キー
   * @param {any} data - 保存するデータ
   */
  const saveWithTimestamp = (key, data) => {
    const payload = {
      data,
      timestamp: Date.now()
    }
    saveToLocalStorage(key, payload)
  }

  /**
   * TTL付きでデータを取得
   * @param {string} key - 読み込みキー
   * @param {number} ttlMs - ミリ秒単位のTTL
   * @returns {any|null} TTL内のデータ、またはnull
   */
  const loadWithTTL = (key, ttlMs) => {
    const cached = loadFromLocalStorage(key)
    if (!cached) return null

    // 旧形式（timestampなし）との後方互換
    if (cached.timestamp === undefined) {
      return cached
    }

    const { data, timestamp } = cached
    if (timestamp && ttlMs && Date.now() - timestamp <= ttlMs) {
      return data
    }
    return null
  }

  /**
   * データをローカルストレージに保存
   * @param {string} key - 保存キー
   * @param {any} data - 保存するデータ
   */
  const saveToLocalStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (err) {
      console.error(`Failed to save to localStorage: ${key}`, err)
    }
  }

  /**
   * ローカルストレージからデータを読み込み
   * @param {string} key - 読み込みキー
   * @returns {any|null} 読み込んだデータ、またはnull
   */
  const loadFromLocalStorage = (key) => {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (err) {
      console.error(`Failed to load from localStorage: ${key}`, err)
      return null
    }
  }

  /**
   * アプリケーション関連のデータをローカルストレージから削除
   */
  const clearAppData = () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
    } catch (err) {
      console.error('Failed to clear localStorage', err)
    }
  }

  /**
   * 特定のキーのデータをローカルストレージから削除
   * @param {string} key - 削除するキー
   */
  const removeFromLocalStorage = (key) => {
    try {
      localStorage.removeItem(key)
    } catch (err) {
      console.error(`Failed to remove from localStorage: ${key}`, err)
    }
  }

  /**
   * ローカルストレージにキーが存在するかチェック
   * @param {string} key - チェックするキー
   * @returns {boolean} キーが存在するかどうか
   */
  const hasInLocalStorage = (key) => {
    try {
      return localStorage.getItem(key) !== null
    } catch (err) {
      console.error(`Failed to check localStorage key: ${key}`, err)
      return false
    }
  }

  return {
    saveToLocalStorage,
    loadFromLocalStorage,
    saveWithTimestamp,
    loadWithTTL,
    clearAppData,
    removeFromLocalStorage,
    hasInLocalStorage,
    STORAGE_KEYS
  }
}
