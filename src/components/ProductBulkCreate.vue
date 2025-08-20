<template>
  <div class="product-bulk-create">
    <div class="manual-input-section">
      <div class="input-header">
        <h3>商品一括登録</h3>
        <div class="input-actions">
          <button
            @click="addProductRow"
            class="btn btn-secondary"
            :disabled="isLoading"
          >
            行を追加
          </button>
          <button
            @click="clearAll"
            class="btn btn-outline"
            :disabled="isLoading || productRows.length === 0"
          >
            全クリア
          </button>
        </div>
      </div>

      <div class="products-table-container">
        <table class="products-input-table">
          <thead>
            <tr>
              <th>商品名 *</th>
              <th>管理用名称</th>
              <th>税抜金額 *</th>
              <th>使用顧客</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in productRows"
              :key="index"
              class="product-row"
            >
              <td>
                <input
                  v-model="row.name"
                  type="text"
                  class="form-input"
                  :class="{ 'error': row.errors.name }"
                  placeholder="商品名"
                />
                <span v-if="row.errors.name" class="error-message">{{ row.errors.name }}</span>
              </td>
              <td>
                <input
                  v-model="row.alias"
                  type="text"
                  class="form-input"
                  placeholder="管理用名称"
                />
              </td>
              <td>
                <input
                  v-model="row.price"
                  type="number"
                  min="0"
                  step="1"
                  class="form-input"
                  :class="{ 'error': row.errors.price }"
                  placeholder="0"
                />
                <span v-if="row.errors.price" class="error-message">{{ row.errors.price }}</span>
              </td>
              <td>
                <select
                  v-model="row.customerId"
                  class="form-select"
                >
                  <option value="">選択しない</option>
                  <option
                    v-for="customer in customers"
                    :key="customer.id"
                    :value="customer.id"
                  >
                    {{ customer.name }}
                  </option>
                </select>
              </td>
              <td>
                <button
                  @click="removeProductRow(index)"
                  class="btn-icon"
                  title="削除"
                  :disabled="productRows.length === 1"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="bulk-actions">
        <button
          @click="$emit('cancel')"
          class="btn btn-secondary"
          :disabled="isLoading"
        >
          キャンセル
        </button>
        <button
          @click="handleSubmit"
          class="btn btn-primary"
          :disabled="isLoading || productRows.length === 0"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          一括登録 ({{ productRows.length }}件)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useCustomersStore } from '../stores/customers'

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

const customersStore = useCustomersStore()

// ローカル状態
const productRows = ref([{ name: '', alias: '', price: '', customerId: '', errors: {} }])

// 計算プロパティ
const customers = computed(() => customersStore.sortedCustomers)

// 初期化
onMounted(async () => {
  if (customersStore.customers.length === 0) {
    await customersStore.initializeCustomers()
  }
})

// 手動入力の行操作
const addProductRow = () => {
  productRows.value.push({ name: '', alias: '', price: '', customerId: '', errors: {} })
}

const removeProductRow = (index) => {
  if (productRows.value.length > 1) {
    productRows.value.splice(index, 1)
  }
}

const clearAll = () => {
  productRows.value = [{ name: '', alias: '', price: '', customerId: '', errors: {} }]
}

// バリデーション
const validateProductRow = (row) => {
  const errors = {}
  
  if (!row.name || row.name.trim() === '') {
    errors.name = '商品名は必須です'
  }
  
  if (!row.price || isNaN(row.price) || Number(row.price) < 0) {
    errors.price = '税抜金額は0以上の数値を入力してください'
  }
  
  return errors
}

const validateAllRows = () => {
  let isValid = true
  
  productRows.value.forEach((row, index) => {
    row.errors = validateProductRow(row)
    if (Object.keys(row.errors).length > 0) {
      isValid = false
    }
  })
  
  return isValid
}

// 送信処理
const handleSubmit = () => {
  if (!validateAllRows()) {
    return
  }
  
  const productsData = productRows.value.map(row => ({
    name: row.name.trim(),
    alias: row.alias.trim(),
    price: Number(row.price),
    customerId: row.customerId || null
  }))
  
  emit('submit', productsData)
}
</script>

<style scoped>
.product-bulk-create {
  max-width: 1200px;
  margin: 0 auto;
}

.manual-input-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.input-header h3 {
  margin: 0;
  color: #333;
}

.input-actions {
  display: flex;
  gap: 1rem;
}

.products-table-container {
  overflow-x: auto;
  margin-bottom: 2rem;
}

.products-input-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.products-input-table th {
  background-color: #f8f9fa;
  padding: 1rem 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
}

.products-input-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
  vertical-align: top;
}

.product-row:hover {
  background-color: #f8f9fa;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-input.error {
  border-color: #dc3545;
}

.error-message {
  display: block;
  margin-top: 0.25rem;
  color: #dc3545;
  font-size: 0.8rem;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-icon:hover:not(:disabled) {
  background-color: #f8f9fa;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bulk-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
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

.btn-outline {
  background-color: transparent;
  color: #6c757d;
  border: 1px solid #6c757d;
}

.btn-outline:hover:not(:disabled) {
  background-color: #6c757d;
  color: white;
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

/* レスポンシブ */
@media (max-width: 768px) {
  .input-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .input-actions {
    justify-content: center;
  }
  
  .bulk-actions {
    flex-direction: column;
  }
}
</style> 