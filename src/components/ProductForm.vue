<template>
  <div class="product-form">
    <form @submit.prevent="handleSubmit" class="form">
      <div class="form-group">
        <label for="name" class="form-label">商品名 *</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="form-input"
          :class="{ 'error': errors.name }"
          placeholder="商品の正式名称を入力"
          required
        />
        <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
      </div>

      <div class="form-group">
        <label for="alias" class="form-label">商品管理用名称</label>
        <input
          id="alias"
          v-model="formData.alias"
          type="text"
          class="form-input"
          placeholder="商品管理用の略称・通称"
        />
      </div>

      <div class="form-group">
        <label for="price" class="form-label">税抜金額 *</label>
        <input
          id="price"
          v-model="formData.price"
          type="number"
          min="0"
          step="1"
          class="form-input"
          :class="{ 'error': errors.price }"
          placeholder="0"
          required
        />
        <span v-if="errors.price" class="error-message">{{ errors.price }}</span>
      </div>

      <div class="form-group">
        <label for="customerId" class="form-label">使用顧客</label>
        <select
          id="customerId"
          v-model="formData.customerId"
          class="form-select"
        >
          <option value="">選択しない</option>
          <option
            v-for="customer in customers"
            :key="customer.id"
            :value="customer.id"
          >
            {{ customer.getDisplayName() }}
          </option>
        </select>
        <small class="form-help">この商品を使用する顧客を選択できます（任意）</small>
      </div>

      <div class="form-actions">
        <button
          type="button"
          @click="$emit('cancel')"
          class="btn btn-secondary"
          :disabled="isLoading"
        >
          キャンセル
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          {{ isEdit ? '更新' : '登録' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useCustomersStore } from '../stores/customers'

const props = defineProps({
  product: {
    type: Object,
    default: null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

const customersStore = useCustomersStore()

// フォームデータ
const formData = reactive({
  name: '',
  alias: '',
  price: '',
  customerId: ''
})

// エラー管理
const errors = reactive({
  name: '',
  price: ''
})

// 計算プロパティ
const isEdit = computed(() => !!props.product)
const customers = computed(() => customersStore.sortedCustomers)

// 初期化
onMounted(async () => {
  // 顧客データを読み込み
  if (customersStore.customers.length === 0) {
    await customersStore.initializeCustomers()
  }
  
  // 編集モードの場合、フォームに既存データを設定
  if (props.product) {
    formData.name = props.product.name || ''
    formData.alias = props.product.alias || ''
    formData.price = props.product.priceExclTax?.toString() || ''
    formData.customerId = props.product.usedByCustomerIds?.[0] || ''
  }
})

// バリデーション
const validateForm = () => {
  let isValid = true
  
  // エラーをリセット
  errors.name = ''
  errors.price = ''
  
  // 商品名のバリデーション
  if (!formData.name || formData.name.trim() === '') {
    errors.name = '商品名は必須です'
    isValid = false
  }
  
  // 税抜金額のバリデーション
  if (!formData.price || isNaN(formData.price) || Number(formData.price) < 0) {
    errors.price = '税抜金額は0以上の数値を入力してください'
    isValid = false
  }
  
  return isValid
}

// フォーム送信
const handleSubmit = () => {
  if (!validateForm()) {
    return
  }
  
  const submitData = {
    name: formData.name.trim(),
    alias: formData.alias.trim(),
    price: Number(formData.price),
    customerId: formData.customerId || null
  }
  
  emit('submit', submitData)
}

// フォームデータの変更を監視してエラーをクリア
watch(() => formData.name, () => {
  if (errors.name) errors.name = ''
})

watch(() => formData.price, () => {
  if (errors.price) errors.price = ''
})
</script>

<style scoped>
.product-form {
  max-width: 600px;
  margin: 0 auto;
}

.form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
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
  font-size: 0.875rem;
}

.form-help {
  display: block;
  margin-top: 0.25rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.form-actions {
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
  display: flex;
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
</style> 