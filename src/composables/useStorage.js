import { STORAGE_KEYS } from '../config/api.js'

/**
 * ローカルストレージ操作用のComposable
 * アプリケーション全体で共通して使用されるローカルストレージ機能を提供
 */
export function useStorage() {
  /**
   * データをローカルストレージに保存
   * @param {string} key - 保存キー
   * @param {any} data - 保存するデータ
   */
  const saveToLocalStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
      console.log(`💾 Saved to localStorage: ${key}`)
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
      console.log('🧹 Cleared all invoicy data from localStorage')
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
      console.log(`🗑️ Removed from localStorage: ${key}`)
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
    clearAppData,
    removeFromLocalStorage,
    hasInLocalStorage,
    STORAGE_KEYS
  }
}
