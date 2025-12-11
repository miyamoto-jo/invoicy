<template>
  <div class="customer-list">
    <!-- 検索・フィルター -->
    <div class="list-header">
      <div class="search-section">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="顧客名、管理用名称で検索..."
        />
      </div>
      <div class="header-actions">
        <div class="stats">
          <span class="stats-text">顧客登録数: {{ filteredCustomers.length }}件</span>
        </div>
      </div>
    </div>

    <!-- エラーメッセージ -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- ローディング -->
    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <p>データを読み込み中...</p>
    </div>

    <!-- 顧客一覧 -->
    <div v-else-if="filteredCustomers.length > 0" class="customers-grid">
      <div
        v-for="customer in filteredCustomers"
        :key="customer.id"
        class="customer-card"
      >
        <div class="customer-header">
          <h3 class="customer-name">{{ customer.name }}</h3>
          <div class="customer-actions">
            <button
              @click="$emit('edit', customer)"
              class="btn btn-edit"
            >
              編集
            </button>
            <button
              @click="confirmDelete(customer)"
              class="btn btn-delete"
            >
              削除
            </button>
          </div>
        </div>
        
        <div class="customer-details">
          <div v-if="customer.alias" class="customer-alias">
            <strong>管理用名称:</strong> {{ customer.alias }}
          </div>
          <div v-if="customer.address" class="customer-address">
            <strong>住所:</strong> {{ customer.address }}
          </div>
          <div class="customer-closing-day">
            <strong>締め日:</strong> {{ customer.formatClosingDay() }}
          </div>
          <div class="customer-payment-method">
            <strong>お支払い方法:</strong> {{ customer.paymentMethod }}
          </div>
          <div class="customer-dates">
            <small>作成: {{ formatDate(customer.createdAt) }}</small>
            <small>更新: {{ formatDate(customer.updatedAt) }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- 空の状態 -->
    <div v-else class="empty-state">
      <div class="empty-icon">👥</div>
      <h3>{{ searchQuery ? '検索結果がありません' : '顧客が登録されていません' }}</h3>
      <p>{{ searchQuery ? '検索条件を変更してみてください' : '新規登録ボタンから顧客を追加してください。' }}</p>
    </div>

    <!-- 削除確認モーダル -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal" @click.stop>
        <h3>顧客の削除</h3>
        <p>「{{ customerToDelete?.name }}」を削除しますか？</p>
        <p class="warning">この操作は取り消せません。</p>
        <div class="modal-actions">
          <button
            @click="cancelDelete"
            class="btn btn-secondary"
            :disabled="isLoading"
          >
            キャンセル
          </button>
          <button
            @click="deleteCustomer"
            class="btn btn-danger"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="loading-spinner"></span>
            削除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCustomersStore } from '../stores/customers'

const props = defineProps({
  customers: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select', 'edit', 'delete', 'retry'])

const customersStore = useCustomersStore()

// ローカル状態
const searchQuery = ref('')
const showDeleteModal = ref(false)
const customerToDelete = ref(null)

// 計算プロパティ
const filteredCustomers = computed(() => {
  let customers = customersStore.searchCustomers(searchQuery.value)
  
  // 更新日時の新しい順にソート
  return [...customers].sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime()
    const dateB = new Date(b.updatedAt).getTime()
    return dateB - dateA // 降順（新しい順）
  })
})

// 日付をフォーマット（日時を含む）
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 削除確認
const confirmDelete = (customer) => {
  customerToDelete.value = customer
  showDeleteModal.value = true
}

// 削除キャンセル
const cancelDelete = () => {
  showDeleteModal.value = false
  customerToDelete.value = null
}

// 顧客削除
const deleteCustomer = async () => {
  if (customerToDelete.value) {
    emit('delete', customerToDelete.value)
    cancelDelete()
  }
}
</script>

<style scoped>
.customer-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.search-section {
  flex: 1;
  max-width: 400px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stats {
  display: flex;
  align-items: center;
}

.stats-text {
  color: #666;
  font-size: 14px;
  text-align: center;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.search-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #f5c6cb;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.customers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.customer-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  transition: box-shadow 0.2s;
}

.customer-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.customer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.customer-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.customer-actions {
  display: flex;
  gap: 0.5rem;
}

.btn.btn-edit {
  background-color: #007bff;
  color: white;
  padding: 0.25rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn.btn-edit:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn.btn-delete {
  background-color: #dc3545;
  color: white;
  padding: 0.25rem 1rem;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn.btn-delete:hover:not(:disabled) {
  background-color: #c82333;
}

.customer-details {
  color: #666;
  font-size: 0.875rem;
}

.customer-details > div {
  margin-bottom: 0.375rem;
}

.customer-alias {
  font-style: italic;
}

.customer-dates {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #eee;
}

.customer-dates small {
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin-bottom: 0.5rem;
  color: #333;
}

.empty-state p {
  margin-bottom: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}

.btn-outline {
  background-color: transparent;
  color: #6c757d;
  border: 1px solid #6c757d;
}

.btn-outline:hover:not(:disabled) {
  background-color: #6c757d;
  color: white;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
}

.modal h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #333;
}

.modal p {
  margin-bottom: 1rem;
  color: #666;
}

.warning {
  color: #dc3545;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .search-section {
    max-width: none;
  }
  
  .header-actions {
    max-width: none;
  }
  
  .customers-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
</style> 