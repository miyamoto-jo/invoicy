import { ref, computed } from 'vue'

// グローバルなローディング状態
const globalLoading = ref(false)
const loadingTitle = ref('読み込み中...')
const loadingMessage = ref('')

// ローディング状態を管理するコンポーザブル
export function useLoading() {
  // ローディング状態を設定
  const setLoading = (isLoading, title = '読み込み中...', message = '') => {
    globalLoading.value = isLoading
    loadingTitle.value = title
    loadingMessage.value = message
  }

  // ローディング状態をクリア
  const clearLoading = () => {
    globalLoading.value = false
    loadingTitle.value = '読み込み中...'
    loadingMessage.value = ''
  }

  // ローディング状態を取得
  const isLoading = computed(() => globalLoading.value)
  const currentTitle = computed(() => loadingTitle.value)
  const currentMessage = computed(() => loadingMessage.value)

  return {
    setLoading,
    clearLoading,
    isLoading,
    currentTitle,
    currentMessage
  }
}

// グローバルなローディング状態をエクスポート（App.vueで使用）
export { globalLoading, loadingTitle, loadingMessage }
