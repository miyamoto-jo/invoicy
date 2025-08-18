<template>
  <div class="customer-form">
    <div class="form-header">
      <h3>{{ isEditing ? '顧客編集' : '新規顧客登録' }}</h3>
      <button @click="$emit('close')" class="btn btn-secondary">
        ✕
      </button>
    </div>
    
    <form @submit.prevent="handleSubmit" class="form">
      <div class="form-group">
        <label for="name" class="form-label">
          顧客名 <span class="required">*</span>
        </label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="form-input"
          :class="{ 'error': errors.name }"
          placeholder="顧客名を入力"
          required
        />
        <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
      </div>
      
      <div class="form-group">
        <label for="alias" class="form-label">
          管理用名称
        </label>
        <input
          id="alias"
          v-model="formData.alias"
          type="text"
          class="form-input"
          placeholder="管理用の名称を入力（任意）"
        />
      </div>
      
      <div class="form-group">
        <label for="address" class="form-label">
          住所
        </label>
        <textarea
          id="address"
          v-model="formData.address"
          class="form-textarea"
          placeholder="住所を入力（任意）"
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-actions">
        <button 
          type="button" 
          @click="$emit('close')" 
          class="btn btn-secondary"
          :disabled="isSubmitting"
        >
          キャンセル
        </button>
        <button 
          type="submit" 
          class="btn btn-primary"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting" class="spinner"></span>
          {{ isEditing ? '更新' : '登録' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  customer: {
    type: Object,
    default: null
  },
  isSubmitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'close'])

const formData = reactive({
  name: '',
  alias: '',
  address: ''
})

const errors = reactive({
  name: ''
})

const isEditing = computed(() => !!props.customer)

// 顧客データが渡された場合、フォームに設定
watch(() => props.customer, (customer) => {
  if (customer) {
    formData.name = customer.name || ''
    formData.alias = customer.alias || ''
    formData.address = customer.address || ''
  } else {
    // 新規作成時はフォームをリセット
    formData.name = ''
    formData.alias = ''
    formData.address = ''
  }
  // エラーをクリア
  errors.name = ''
}, { immediate: true })

const validateForm = () => {
  let isValid = true
  errors.name = ''
  
  if (!formData.name || formData.name.trim() === '') {
    errors.name = '顧客名は必須です'
    isValid = false
  }
  
  return isValid
}

const handleSubmit = () => {
  if (!validateForm()) {
    return
  }
  
  const customerData = {
    name: formData.name.trim(),
    alias: formData.alias.trim(),
    address: formData.address.trim()
  }
  
  emit('submit', customerData)
}
</script>

<style scoped>
.customer-form {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.form-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.required {
  color: #e74c3c;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
}

.form-input.error {
  border-color: #e74c3c;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.error-message {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 5px;
  display: block;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
  display: flex;
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

.btn-secondary {
  background-color: #f1f3f4;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e8eaed;
}

.spinner {
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