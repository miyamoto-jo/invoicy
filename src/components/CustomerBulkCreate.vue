<template>
  <div class="customer-bulk-create">
    <div class="manual-input-section">
      <div class="customers-cards-container">
        <div
          v-for="(row, index) in customerRows"
          :key="index"
          class="customer-card"
        >
          <div class="card-header">
            <button
              @click="removeCustomerRow(index)"
              class="btn-close"
              title="削除"
              :disabled="customerRows.length === 1 || isLoading"
            >
              ×
            </button>
          </div>
          
          <div class="card-body">
            <div class="form-field">
              <label class="form-label">顧客名 *</label>
              <input
                v-model="row.name"
                type="text"
                class="form-input"
                :class="{ 'error': row.errors.name }"
                placeholder="顧客名"
                :disabled="isLoading"
              />
              <span v-if="row.errors.name" class="error-message">{{ row.errors.name }}</span>
            </div>
            
            <div class="form-field">
              <label class="form-label">管理用名称</label>
              <input
                v-model="row.alias"
                type="text"
                class="form-input"
                placeholder="管理用名称"
                :disabled="isLoading"
              />
            </div>
            
            <div class="form-field">
              <label class="form-label">住所</label>
              <input
                v-model="row.address"
                type="text"
                class="form-input"
                placeholder="住所"
                :disabled="isLoading"
              />
            </div>
            
            <div class="form-field">
              <label class="form-label">締め日 *</label>
              <select
                v-model="row.closingDay"
                class="form-select"
                :class="{ 'error': row.errors.closingDay }"
                :disabled="isLoading"
              >
                <option value="">選択</option>
                <option v-for="day in 31" :key="day" :value="day">{{ day }}日</option>
                <option value="末日">末日</option>
              </select>
              <span v-if="row.errors.closingDay" class="error-message">{{ row.errors.closingDay }}</span>
            </div>
            
            <div class="form-field">
              <label class="form-label">お支払い方法 *</label>
              <select
                v-model="row.paymentMethod"
                class="form-select"
                :class="{ 'error': row.errors.paymentMethod }"
                :disabled="isLoading"
              >
                <option value="">選択</option>
                <option value="振込">振込</option>
                <option value="現金">現金</option>
              </select>
              <span v-if="row.errors.paymentMethod" class="error-message">{{ row.errors.paymentMethod }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="add-customer-section">
        <button
          @click="addCustomerRow"
          class="btn-add"
          title="行を追加"
          :disabled="isLoading"
        >
          +
        </button>
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
          :disabled="isLoading || customerRows.length === 0"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          一括登録 ({{ customerRows.length }}件)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

// ローカル状態
const customerRows = ref([{ name: '', alias: '', address: '', closingDay: '末日', paymentMethod: '振込', errors: {} }])

// 手動入力の行操作
const addCustomerRow = () => {
  // 直前の行（最後の行）の情報を取得
  const lastRow = customerRows.value[customerRows.value.length - 1]
  const closingDay = lastRow?.closingDay || '末日'
  const paymentMethod = lastRow?.paymentMethod || '振込'
  
  customerRows.value.push({ 
    name: '', 
    alias: '', 
    address: '', 
    closingDay: closingDay, 
    paymentMethod: paymentMethod, 
    errors: {} 
  })
}

const removeCustomerRow = (index) => {
  if (customerRows.value.length > 1) {
    customerRows.value.splice(index, 1)
  }
}

const clearAll = () => {
  customerRows.value = [{ name: '', alias: '', address: '', closingDay: '末日', paymentMethod: '振込', errors: {} }]
}

// バリデーション
const validateCustomerRow = (row) => {
  const errors = {}
  
  if (!row.name || row.name.trim() === '') {
    errors.name = '顧客名は必須です'
  }
  
  if (!row.closingDay) {
    errors.closingDay = '締め日は必須です'
  } else if (row.closingDay !== '末日' && (row.closingDay < 1 || row.closingDay > 31)) {
    errors.closingDay = '締め日は1〜31の範囲または末日で入力してください'
  }
  
  if (!row.paymentMethod) {
    errors.paymentMethod = 'お支払い方法は必須です'
  }
  
  return errors
}

const validateAllRows = () => {
  let isValid = true
  
  customerRows.value.forEach((row, index) => {
    row.errors = validateCustomerRow(row)
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
  
  const customersData = customerRows.value.map(row => ({
    name: row.name.trim(),
    alias: row.alias.trim(),
    address: row.address.trim(),
    closingDay: row.closingDay === '末日' ? '末日' : parseInt(row.closingDay),
    paymentMethod: row.paymentMethod
  }))
  
  emit('submit', customersData)
}
</script>

<style scoped>
.customer-bulk-create {
  max-width: 1200px;
  margin: 0 auto;
}

.manual-input-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.customers-cards-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.customer-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  position: relative;
  transition: box-shadow 0.2s;
}

.customer-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  font-weight: bold;
  color: #999;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
  padding: 0;
  line-height: 1;
}

.btn-close:hover:not(:disabled) {
  background-color: #f8f9fa;
  color: #dc3545;
}

.btn-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.add-customer-section {
  display: flex;
  justify-content: center;
}

.btn-add {
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
  line-height: 1;
}

.btn-add:hover:not(:disabled) {
  background-color: #218838;
  transform: scale(1.1);
}

.btn-add:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 600;
  color: #333;
  font-size: 0.9rem;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-input.error,
.form-select.error {
  border-color: #dc3545;
}

.form-input:disabled,
.form-select:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.error-message {
  display: block;
  color: #dc3545;
  font-size: 0.85rem;
  margin-top: 0.25rem;
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
  .manual-input-section {
    padding: 1rem;
  }
  
  .customers-cards-container {
    gap: 1rem;
  }
  
  .customer-card {
    padding: 0.75rem;
  }
  
  .card-body {
    gap: 0.75rem;
  }
  
  .bulk-actions {
    flex-direction: column;
  }
}
</style> 