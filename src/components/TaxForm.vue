<template>
  <div class="tax-form">
    <div class="form-header">
      <h3>{{ isEditing ? '税率編集' : '税率新規作成' }}</h3>
      <button @click="$emit('close')" class="btn btn-secondary">
        ✕
      </button>
    </div>
    
    <form @submit.prevent="handleSubmit" class="form">
      <div class="form-group">
        <label for="rate">税率 (%) *</label>
        <input
          id="rate"
          v-model.number="formData.rate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          required
          placeholder="例: 10.0"
          class="form-control"
        />
      </div>
      
      <div class="form-group">
        <label for="description">説明</label>
        <textarea
          id="description"
          v-model="formData.description"
          placeholder="税率の説明（任意）"
          class="form-control"
          rows="3"
        ></textarea>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input
            v-model="formData.isActive"
            type="checkbox"
            class="checkbox"
          />
          <span class="checkmark"></span>
          有効にする
        </label>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="$emit('close')" class="btn btn-secondary">
          キャンセル
        </button>
        <button type="submit" class="btn btn-primary" :disabled="isLoading">
          {{ isLoading ? '保存中...' : (isEditing ? '更新' : '作成') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  tax: {
    type: Object,
    default: null
  },
  isLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'close'])

const formData = ref({
  rate: 0,
  description: '',
  isActive: true
})

const isEditing = computed(() => !!props.tax)

// 編集時は既存データをフォームに設定
watch(() => props.tax, (newTax) => {
  if (newTax) {
    formData.value = {
      rate: newTax.rate,
      description: newTax.description || '',
      isActive: newTax.isActive
    }
  } else {
    // 新規作成時はフォームをリセット
    formData.value = {
      rate: 0,
      description: '',
      isActive: true
    }
  }
}, { immediate: true })

const handleSubmit = () => {
  emit('submit', { ...formData.value })
}
</script>

<style scoped>
.tax-form {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.form-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.form-control {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-control:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
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

@media (max-width: 768px) {
  .tax-form {
    margin: 1rem;
    padding: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style> 