<template>
  <div class="product-list">
    <!-- 検索・フィルター -->
    <div class="list-header">
      <div class="search-section">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="商品名で検索..."
        />
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

    <!-- 商品一覧 -->
    <div v-else-if="filteredProducts.length > 0" class="products-grid">
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="product-card"
      >
        <div class="product-header">
          <h3 class="product-name">{{ product.getDisplayName() }}</h3>
          <div class="product-actions">
            <button
              @click="$emit('edit', product)"
              class="btn-icon"
              title="編集"
            >
              ✏️
            </button>
            <button
              @click="confirmDelete(product)"
              class="btn-icon"
              title="削除"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div class="product-details">
          <div v-if="product.alias" class="product-alias">
            <strong>管理用名称:</strong> {{ product.alias }}
          </div>
          <div class="product-price">
            <strong>税抜金額:</strong> ¥{{ product.formatPrice() }}
          </div>
                      <div v-if="product.usedByCustomerIds && product.usedByCustomerIds.length > 0" class="product-customer">
              <strong>使用顧客:</strong> {{ getCustomerName(product.usedByCustomerIds[0]) }}
            </div>
          <div class="product-dates">
            <small>作成: {{ formatDate(product.createdAt) }}</small>
            <small>更新: {{ formatDate(product.updatedAt) }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- 空の状態 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>商品が登録されていません</h3>
      <p>新規登録ボタンから商品を追加してください。</p>
    </div>

    <!-- 削除確認モーダル -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal" @click.stop>
        <h3>商品の削除</h3>
        <p>「{{ productToDelete?.getDisplayName() }}」を削除しますか？</p>
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
            @click="deleteProduct"
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
import { ref, computed, onMounted } from 'vue'
import { useCustomersStore } from '../stores/customers'

const props = defineProps({
  products: {
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

const emit = defineEmits(['add', 'edit', 'delete', 'bulk-create'])

const customersStore = useCustomersStore()

// ローカル状態
const searchQuery = ref('')
const showDeleteModal = ref(false)
const productToDelete = ref(null)

// 計算プロパティ
const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.products
  }
  
  const query = searchQuery.value.toLowerCase()
  return props.products.filter(product => 
    product.getDisplayName().toLowerCase().includes(query) ||
    product.alias.toLowerCase().includes(query)
  )
})

// 初期化
onMounted(async () => {
  // 顧客データを読み込み
  if (customersStore.customers.length === 0) {
    await customersStore.initializeCustomers()
  }
})

// 顧客名を取得
const getCustomerName = (customerId) => {
  const customer = customersStore.getCustomerById(customerId)
  return customer ? customer.getDisplayName() : '不明'
}

// 日付をフォーマット
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('ja-JP')
}

// 削除確認
const confirmDelete = (product) => {
  productToDelete.value = product
  showDeleteModal.value = true
}

// 削除キャンセル
const cancelDelete = () => {
  showDeleteModal.value = false
  productToDelete.value = null
}

// 商品削除
const deleteProduct = async () => {
  if (productToDelete.value) {
    emit('delete', productToDelete.value.id)
    cancelDelete()
  }
}
</script>

<style scoped>
.product-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
}

.search-section {
  flex: 1;
  max-width: 400px;
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

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.product-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  transition: box-shadow 0.2s;
}

.product-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.product-name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.product-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-icon:hover {
  background-color: #f8f9fa;
}

.product-details {
  color: #666;
}

.product-details > div {
  margin-bottom: 0.5rem;
}

.product-alias {
  font-style: italic;
}

.product-price {
  font-size: 1.1rem;
  font-weight: 600;
  color: #28a745;
}

.product-customer {
  color: #007bff;
}

.product-dates {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.product-dates small {
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
  }
  
  .search-section {
    max-width: none;
  }
  
  .products-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
</style> 