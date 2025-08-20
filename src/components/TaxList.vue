<template>
  <div class="tax-list">
    <div class="list-header">
      <h3>税率一覧 ({{ taxesCount }}件)</h3>
      <button @click="$emit('add')" class="btn btn-primary">
        <span>➕</span>
        税率追加
      </button>
    </div>
    
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>読み込み中...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="$emit('retry')" class="btn btn-secondary">
        再試行
      </button>
    </div>
    
    <div v-else-if="sortedTaxes.length === 0" class="empty-state">
      <div class="empty-icon">📊</div>
      <h4>税率が登録されていません</h4>
      <p>税率を追加して、請求書の計算に使用できるようにしましょう。</p>
      <button @click="$emit('add')" class="btn btn-primary">
        最初の税率を追加
      </button>
    </div>
    
    <div v-else class="taxes-grid">
      <div
        v-for="tax in sortedTaxes"
        :key="tax.id"
        class="tax-card"
        :class="{ 'inactive': !tax.isActive }"
      >
        <div class="tax-header">
          <div class="tax-info">
            <h4 class="tax-rate">{{ tax.rate }}%</h4>
          </div>
          <div class="tax-status">
            <span
              :class="['status-badge', tax.isActive ? 'status-active' : 'status-inactive']"
            >
              {{ tax.isActive ? '有効' : '無効' }}
            </span>
          </div>
        </div>
        
        <div v-if="tax.description" class="tax-description">
          {{ tax.description }}
        </div>
        
        <div class="tax-meta">
          <small>作成日: {{ formatDate(tax.createdAt) }}</small>
          <small v-if="tax.updatedAt !== tax.createdAt">
            更新日: {{ formatDate(tax.updatedAt) }}
          </small>
        </div>
        
        <div class="tax-actions">
          <button
            @click="$emit('edit', tax)"
            class="btn btn-secondary btn-sm"
            title="編集"
          >
            ✏️ 編集
          </button>
          <button
            @click="confirmDelete(tax)"
            class="btn btn-danger btn-sm"
            title="削除"
          >
            🗑️ 削除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  taxes: {
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

const emit = defineEmits(['add', 'edit', 'delete', 'retry'])

const taxesCount = computed(() => props.taxes.length)
const sortedTaxes = computed(() => {
  return [...props.taxes].sort((a, b) => {
    // 有効な税率を先に表示
    if (a.isActive !== b.isActive) {
      return b.isActive ? 1 : -1
    }
    // 次に税率でソート
    return b.rate - a.rate
  })
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const confirmDelete = (tax) => {
  if (confirm(`税率「${tax.rate}%」を削除しますか？\nこの操作は取り消せません。`)) {
    emit('delete', tax.id)
  }
}
</script>

<style scoped>
.tax-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.list-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4285f4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 2rem;
  color: #d32f2f;
  background: #ffebee;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h4 {
  color: #333;
  margin-bottom: 0.5rem;
}

.empty-state p {
  margin-bottom: 1.5rem;
}

.taxes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.tax-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  border: 2px solid transparent;
}

.tax-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.tax-card.inactive {
  opacity: 0.7;
  background: #f8f9fa;
}

.tax-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.tax-info {
  flex: 1;
}

.tax-rate {
  font-size: 1.5rem;
  font-weight: 700;
  color: #4285f4;
  margin: 0;
}

.tax-status {
  margin-left: 1rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-inactive {
  background: #f8d7da;
  color: #721c24;
}

.tax-description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.tax-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  color: #999;
}

.tax-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn-primary {
  background: #4285f4;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3367d6;
}

.btn-secondary {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover:not(:disabled) {
  background: #e9ecef;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .taxes-grid {
    grid-template-columns: 1fr;
  }
  
  .tax-header {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .tax-status {
    margin-left: 0;
  }
  
  .tax-actions {
    flex-direction: column;
  }
}
</style> 