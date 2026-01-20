<template>
  <AppLayout>
    <div class="data-deletion">
      <div class="deletion-container">
        <!-- タイトル -->
        <div class="header">
          <h2 class="title">データ削除</h2>
          <p class="subtitle">クラウドのデータを削除することができます。削除したデータは元に戻せないので注意してください。</p>
        </div>

        <!-- 削除するデータ選択 -->
        <div class="form-group">
          <label for="data-type" class="form-label">削除するデータ選択</label>
          <select
            id="data-type"
            v-model="selectedDataType"
            class="form-select"
            @change="handleDataTypeChange"
          >
            <option value="">未選択</option>
            <option value="sales">売上データ</option>
            <option value="invoices">請求書データ</option>
          </select>
        </div>

        <!-- データファイル一覧 -->
        <div v-if="files.length > 0" class="files-section">
          <!-- 全選択チェックボックス -->
          <div class="select-all-container">
            <label class="select-all-label">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleSelectAll"
                class="checkbox"
              />
              <span>すべて選択</span>
            </label>
          </div>

          <!-- ファイルカード一覧 -->
          <div class="files-list">
            <div
              v-for="file in files"
              :key="file.id"
              class="file-card"
              :class="{ 'selected': selectedFiles.includes(file.id) }"
              @click="toggleFileSelection(file.id)"
            >
              <div class="file-card-checkbox" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedFiles.includes(file.id)"
                  @change.stop="toggleFileSelection(file.id)"
                  class="checkbox"
                />
              </div>
              <div class="file-card-content">
                <div class="file-info-item">
                  <span class="file-info-value filename-value">{{ file.displayName }}</span>
                </div>
                <div class="file-info-item">
                  <span class="file-info-label">サイズ：<span class="file-info-value">{{ file.formattedSize }}</span></span>
                </div>
                <div class="file-info-item">
                  <span class="file-info-label">更新日時：<span class="file-info-value">{{ file.formattedDate }}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="selectedDataType && isLoading" class="loading-message">
          ファイル一覧を読み込み中...
        </div>

        <div v-else-if="selectedDataType && !isLoading" class="empty-message">
          ファイルが見つかりませんでした。
        </div>

        <!-- 削除ボタン -->
        <div class="actions">
          <button
            type="button"
            class="btn btn-danger"
            :disabled="selectedFiles.length === 0 || isDeleting"
            @click="showDeleteModal"
          >
            <span v-if="isDeleting" class="loading-spinner"></span>
            削除
          </button>
        </div>

        <!-- エラーメッセージ -->
        <div v-if="error" class="error-alert">
          {{ error }}
        </div>
      </div>

      <!-- トースト通知 -->
      <div v-if="toast.show" class="toast" :class="toast.type">
        <div class="toast-content">
          <span class="toast-message">{{ toast.message }}</span>
          <button @click="hideToast" class="toast-close">&times;</button>
        </div>
      </div>

      <!-- 削除確認モーダル -->
      <div v-if="showModal" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">削除確認</h3>
          </div>
          <div class="modal-body">
            <p>本当に削除しますか？削除したデータは復元できません。</p>
            <p>削除対象: {{ selectedFiles.length }}件のファイル</p>
          </div>
          <div class="modal-footer">
            <button class="modal-button cancel-button" @click="closeModal">
              キャンセル
            </button>
            <button class="modal-button confirm-button" @click="confirmDelete" :disabled="isDeleting">
              <span v-if="isDeleting" class="loading-spinner"></span>
              実行
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { googleApiClient } from '../services/googleApi.js'
import { getSubFolderStorageKey } from '../config/api.js'
import AppLayout from '../components/AppLayout.vue'

const authStore = useAuthStore()

// State
const selectedDataType = ref('')
const files = ref([])
const selectedFiles = ref([])
const isLoading = ref(false)
const isDeleting = ref(false)
const error = ref(null)
const showModal = ref(false)
const toast = ref({
  show: false,
  message: '',
  type: 'success' // 'success' or 'error'
})

// Computed
const allSelected = computed(() => {
  return files.value.length > 0 && selectedFiles.value.length === files.value.length
})

// ファイル名をユーザーにわかりやすい形式に変換
const formatFileName = (fileName, dataType) => {
  if (dataType === 'sales') {
    // ledger-yyyymm.jsonl → yyyy年mm月の売上データ
    const match = fileName.match(/ledger-(\d{4})(\d{2})\.jsonl/)
    if (match) {
      const year = match[1]
      const month = match[2]
      return `${year}年${month}月の売上データ`
    }
  } else if (dataType === 'invoices') {
    // yyyy-mm-invoices.jsonl → yyyy年mm月の請求書データ
    const match = fileName.match(/(\d{4})-(\d{2})-invoices\.jsonl/)
    if (match) {
      const year = match[1]
      const month = match[2]
      return `${year}年${month}月の請求書データ`
    }
  }
  return fileName
}

// ファイル名から年月を抽出してソート用の数値を作成
const getYearMonthForSort = (fileName, dataType) => {
  if (dataType === 'sales') {
    const match = fileName.match(/ledger-(\d{4})(\d{2})\.jsonl/)
    if (match) {
      return parseInt(match[1] + match[2]) // yyyymm形式の数値
    }
  } else if (dataType === 'invoices') {
    const match = fileName.match(/(\d{4})-(\d{2})-invoices\.jsonl/)
    if (match) {
      return parseInt(match[1] + match[2]) // yyyymm形式の数値
    }
  }
  return 0
}

// ファイルサイズをユーザーにわかりやすい形式に変換
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0バイト'
  const k = 1024
  const sizes = ['バイト', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2))
  return `${size}${sizes[i]}`
}

// 日時をユーザーにわかりやすい形式に変換
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}

// データタイプ変更時の処理
const handleDataTypeChange = async () => {
  selectedFiles.value = []
  files.value = []
  error.value = null

  if (!selectedDataType.value) {
    return
  }

  await loadFiles()
}

// ファイル一覧を読み込む
const loadFiles = async () => {
  if (!selectedDataType.value) {
    return
  }

  try {
    isLoading.value = true
    error.value = null

    const token = authStore.getAccessToken()
    if (!token) {
      throw new Error('認証トークンがありません')
    }

    // フォルダIDを取得
    let folderId
    if (selectedDataType.value === 'sales') {
      const salesFolder = await authStore.getSubFolderId('sales')
      folderId = salesFolder.id
    } else if (selectedDataType.value === 'invoices') {
      const invoicesFolder = await authStore.getSubFolderId('invoices')
      folderId = invoicesFolder.id
    }

    // フォルダ内のファイルを取得
    let query
    if (selectedDataType.value === 'sales') {
      query = `'${folderId}' in parents and name contains 'ledger-' and trashed=false`
    } else {
      query = `'${folderId}' in parents and name contains '-invoices.jsonl' and trashed=false`
    }

    const fields = 'files(id,name,size,modifiedTime)'
    const data = await googleApiClient.searchFiles(token, query, fields)

    if (data.files && data.files.length > 0) {
      files.value = data.files
        .map(file => ({
          id: file.id,
          name: file.name,
          displayName: formatFileName(file.name, selectedDataType.value),
          size: parseInt(file.size) || 0,
          formattedSize: formatFileSize(parseInt(file.size) || 0),
          modifiedTime: file.modifiedTime,
          formattedDate: formatDate(file.modifiedTime),
          sortKey: getYearMonthForSort(file.name, selectedDataType.value)
        }))
        .sort((a, b) => a.sortKey - b.sortKey) // 古い順にソート
    } else {
      files.value = []
    }
  } catch (err) {
    console.error('Failed to load files:', err)
    error.value = `ファイル一覧の取得に失敗しました: ${err.message}`
    files.value = []
  } finally {
    isLoading.value = false
  }
}

// ファイル選択のトグル
const toggleFileSelection = (fileId) => {
  const index = selectedFiles.value.indexOf(fileId)
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
  } else {
    selectedFiles.value.push(fileId)
  }
}

// 全選択/全解除
const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedFiles.value = []
  } else {
    selectedFiles.value = files.value.map(file => file.id)
  }
}

// 削除モーダルを表示
const showDeleteModal = () => {
  if (selectedFiles.value.length === 0) {
    return
  }
  showModal.value = true
}

// モーダルを閉じる
const closeModal = () => {
  showModal.value = false
}

// 削除を実行
const confirmDelete = async () => {
  if (selectedFiles.value.length === 0) {
    return
  }

  try {
    isDeleting.value = true
    error.value = null

    const token = authStore.getAccessToken()
    if (!token) {
      throw new Error('認証トークンがありません')
    }

    // 選択されたファイルを削除
    for (const fileId of selectedFiles.value) {
      try {
        await googleApiClient.deleteFile(token, fileId)
      } catch (err) {
        console.error(`Failed to delete file ${fileId}:`, err)
        throw new Error(`ファイルの削除に失敗しました: ${err.message}`)
      }
    }

    // 削除成功
    closeModal()
    selectedFiles.value = []
    
    // ファイル一覧を再読み込み
    await loadFiles()

    // 成功メッセージを表示
    showToast('ファイルを削除しました。', 'success')
  } catch (err) {
    console.error('Failed to delete files:', err)
    error.value = err.message
    showToast(`ファイルの削除に失敗しました: ${err.message}`, 'error')
    // モーダルは開いたまま
  } finally {
    isDeleting.value = false
  }
}

// トーストメッセージを表示
const showToast = (message, type = 'success') => {
  toast.value = {
    show: true,
    message,
    type
  }
  
  // 3秒後に自動で非表示
  setTimeout(() => {
    hideToast()
  }, 3000)
}

// トーストメッセージを非表示
const hideToast = () => {
  toast.value.show = false
}
</script>

<style scoped>
.data-deletion {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 1rem;
}

.deletion-container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header {
  margin-bottom: 2rem;
  text-align: center;
}

.title {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.subtitle {
  color: #666;
  font-size: 0.9rem;
}

.form-group {
  margin-bottom: 2rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: #333;
  margin-bottom: 0.5rem;
}

.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  background-color: white;
  cursor: pointer;
}

.form-select:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
}

.files-section {
  margin-bottom: 2rem;
}

/* 全選択コンテナ */
.select-all-container {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: #333;
}

/* ファイルリスト */
.files-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ファイルカード */
.file-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.file-card:hover {
  background-color: #f8f9fa;
  border-color: #4285f4;
}

.file-card.selected {
  background-color: #e8f0fe;
  border-color: #4285f4;
}

.file-card-checkbox {
  display: flex;
  align-items: flex-start;
  padding-top: 0.25rem;
  flex-shrink: 0;
}

.file-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-info-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
}

.file-info-value {
  font-size: 1rem;
  color: #333;
  word-break: break-word;
}

.filename-value {
  font-weight: 500;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
}

.loading-message,
.empty-message {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-alert {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

/* モーダルスタイル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.25s ease-out;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideIn 0.25s ease-out;
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0;
  font-size: 1rem;
  color: #333;
  line-height: 1.5;
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.modal-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #666;
}

.cancel-button:hover:not(:disabled) {
  background-color: #e0e0e0;
  color: #333;
}

.confirm-button {
  background-color: #dc3545;
  color: white;
}

.confirm-button:hover:not(:disabled) {
  background-color: #c82333;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* トースト通知 */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 3000;
  min-width: 300px;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast.success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.toast.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.toast-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
}

.toast-message {
  flex: 1;
  font-weight: 500;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0;
  margin-left: 1rem;
  line-height: 1;
}

.toast-close:hover {
  opacity: 1;
}

@media (max-width: 768px) {
  .deletion-container {
    margin: 0;
    padding: 1rem;
  }

  .file-card {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .file-card-content {
    gap: 0.5rem;
  }

  .file-info-label {
    font-size: 0.8rem;
  }

  .file-info-value {
    font-size: 0.9rem;
  }

  .select-all-container {
    padding: 0.5rem;
  }

  .actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .modal-content {
    width: 95%;
    margin: 1rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-button {
    width: 100%;
  }

  .toast {
    left: 20px;
    right: 20px;
    min-width: auto;
  }
}
</style>

