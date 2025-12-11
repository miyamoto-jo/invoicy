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
/* コンポーネント固有のスタイルのみ */
.tax-form {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: var(--form-max-width-small);
  width: 100%;
}

@media (max-width: 768px) {
  .tax-form {
    margin: 1rem;
    padding: 1rem;
  }
}
</style> 