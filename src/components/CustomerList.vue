<template>
  <div class="customer-list">
    <div class="list-header">
      <div class="search-section">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="顧客名、管理用名称、住所で検索..."
        />
      </div>
      <div class="header-actions">
        <button
          @click="$emit('bulk-create')"
          class="btn btn-primary"
          :disabled="isLoading"
        >
          📋 一括登録
        </button>
        <div class="stats">
          <span class="stats-text">{{ filteredCustomers.length }}件</span>
        </div>
      </div>
    </div>
    
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>顧客データを読み込み中...</p>
    </div>
    
    <div v-else-if="error" class="error-message">
      <p>{{ error }}</p>
      <button @click="retryLoad" class="btn btn-primary">
        再試行
      </button>
    </div>
    
    <div v-else-if="filteredCustomers.length === 0" class="empty-state">
      <div class="empty-icon">👥</div>
      <h3>{{ searchQuery ? '検索結果がありません' : '顧客が登録されていません' }}</h3>
      <p v-if="!searchQuery">最初の顧客を登録してみましょう</p>
      <p v-else>検索条件を変更してみてください</p>
    </div>
    
    <div v-else class="customers-grid">
      <div
        v-for="customer in filteredCustomers"
        :key="customer.id"
        class="customer-card"
        @click="selectCustomer(customer)"
      >
        <div class="customer-header">
          <h4 class="customer-name">{{ customer.name }}</h4>
          <div class="customer-actions">
            <button
              @click.stop="editCustomer(customer)"
              class="btn-icon"
              title="編集"
            >
              ✏️
            </button>
            <button
              @click.stop="deleteCustomer(customer)"
              class="btn-icon delete"
              title="削除"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div class="customer-details">
          <div v-if="customer.alias" class="customer-alias">
            <span class="label">管理用名称:</span>
            <span>{{ customer.alias }}</span>
          </div>
          <div v-if="customer.address" class="customer-address">
            <span class="label">住所:</span>
            <span>{{ customer.address }}</span>
          </div>
        </div>
        
        <div class="customer-meta">
          <span class="created-date">
            作成日: {{ formatDate(customer.createdAt) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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
    default: null
  }
})

const emit = defineEmits(['select', 'edit', 'delete', 'retry', 'bulk-create'])

const customersStore = useCustomersStore()
const searchQuery = ref('')

const filteredCustomers = computed(() => {
  return customersStore.searchCustomers(searchQuery.value)
})

const selectCustomer = (customer) => {
  emit('select', customer)
}

const editCustomer = (customer) => {
  emit('edit', customer)
}

const deleteCustomer = async (customer) => {
  if (confirm(`「${customer.name}」を削除しますか？\nこの操作は取り消せません。`)) {
    emit('delete', customer)
  }
}

const retryLoad = () => {
  emit('retry')
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 検索クエリの変更を監視
watch(searchQuery, (newQuery) => {
  // 必要に応じて検索のデバウンス処理を追加
})
</script>

<style scoped>
.customer-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.search-section {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
}

.stats {
  display: flex;
  align-items: center;
}

.stats-text {
  color: #666;
  font-size: 14px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.loading .spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4285f4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  padding: 40px 20px;
  color: #e74c3c;
}

.error-message p {
  margin-bottom: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin-bottom: 10px;
  color: #333;
}

.empty-state p {
  margin: 0;
}

.customers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.customer-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.customer-card:hover {
  border-color: #4285f4;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.customer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.customer-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  flex: 1;
  margin-right: 10px;
}

.customer-actions {
  display: flex;
  gap: 5px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.3s;
  font-size: 16px;
}

.btn-icon:hover {
  background-color: #f1f3f4;
}

.btn-icon.delete:hover {
  background-color: #fde8e8;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #4285f4;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3367d6;
}

.customer-details {
  margin-bottom: 15px;
}

.customer-alias,
.customer-address {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.4;
}

.customer-alias .label,
.customer-address .label {
  font-weight: 500;
  color: #666;
  margin-right: 5px;
}

.customer-meta {
  border-top: 1px solid #f0f0f0;
  padding-top: 10px;
}

.created-date {
  font-size: 12px;
  color: #999;
}

@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .search-section {
    max-width: none;
  }
  
  .customers-grid {
    grid-template-columns: 1fr;
  }
}
</style> 