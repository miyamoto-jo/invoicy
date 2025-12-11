<template>
  <div class="customer-form">
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
      
      <div class="form-group">
        <label for="closingDay" class="form-label">
          締め日 <span class="required">*</span>
        </label>
        <select
          id="closingDay"
          v-model="formData.closingDay"
          class="form-input"
          :class="{ 'error': errors.closingDay }"
          required
        >
          <option value="">選択してください</option>
          <option v-for="day in 31" :key="day" :value="day">{{ day }}日</option>
          <option value="末日">末日</option>
        </select>
        <span v-if="errors.closingDay" class="error-message">{{ errors.closingDay }}</span>
      </div>
      
      <div class="form-group">
        <label for="paymentMethod" class="form-label">
          お支払い方法 <span class="required">*</span>
        </label>
        <select
          id="paymentMethod"
          v-model="formData.paymentMethod"
          class="form-input"
          :class="{ 'error': errors.paymentMethod }"
          required
        >
          <option value="">選択してください</option>
          <option value="振込">振込</option>
          <option value="現金">現金</option>
        </select>
        <span v-if="errors.paymentMethod" class="error-message">{{ errors.paymentMethod }}</span>
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
  address: '',
  closingDay: '末日',
  paymentMethod: '振込'
})

const errors = reactive({
  name: '',
  closingDay: '',
  paymentMethod: ''
})

const isEditing = computed(() => !!props.customer)

// 顧客データが渡された場合、フォームに設定
watch(() => props.customer, (customer) => {
  if (customer) {
    formData.name = customer.name || ''
    formData.alias = customer.alias || ''
    formData.address = customer.address || ''
    formData.closingDay = customer.closingDay || ''
    formData.paymentMethod = customer.paymentMethod || '振込'
  } else {
    // 新規作成時はフォームをリセット
    formData.name = ''
    formData.alias = ''
    formData.address = ''
    formData.closingDay = '末日'
    formData.paymentMethod = '振込'
  }
  // エラーをクリア
  errors.name = ''
  errors.closingDay = ''
  errors.paymentMethod = ''
}, { immediate: true })

const validateForm = () => {
  let isValid = true
  errors.name = ''
  errors.closingDay = ''
  errors.paymentMethod = ''
  
  if (!formData.name || formData.name.trim() === '') {
    errors.name = '顧客名は必須です'
    isValid = false
  }
  
  if (!formData.closingDay) {
    errors.closingDay = '締め日は必須です'
    isValid = false
  }
  
  if (!formData.paymentMethod) {
    errors.paymentMethod = 'お支払い方法は必須です'
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
    address: formData.address.trim(),
    closingDay: formData.closingDay === '末日' ? '末日' : parseInt(formData.closingDay),
    paymentMethod: formData.paymentMethod
  }
  
  emit('submit', customerData)
}
</script>

<style scoped>
/* コンポーネント固有のスタイル */
.customer-form {
  width: 100%;
}

.required {
  color: var(--error-color);
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