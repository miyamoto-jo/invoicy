<template>
  <AppLayout>
    <div class="customer-bulk-create-header">
      <h1>顧客一括登録</h1>
      <button
        @click="goBack"
        class="btn btn-secondary"
        :disabled="isSubmitting"
      >
        一覧に戻る
      </button>
    </div>
    
    <div class="customer-bulk-create-content">
      <div class="card">
        <div class="card-header">
          <h2>顧客一括登録</h2>
        </div>
        
        <CustomerBulkCreate
          :is-loading="isSubmitting"
          @submit="handleSubmit"
          @cancel="goBack"
        />
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomersStore } from '../stores/customers'
import { useLoading } from '../composables/useLoading'
import CustomerBulkCreate from '../components/CustomerBulkCreate.vue'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()
const customersStore = useCustomersStore()
const { setLoading, clearLoading } = useLoading()

const isSubmitting = ref(false)

const goBack = () => {
  router.push('/customers')
}

const handleSubmit = async (customersData) => {
  try {
    isSubmitting.value = true
    setLoading(true, '一括登録中...', `${customersData.length}件の顧客を登録しています`)
    
    await customersStore.bulkCreateCustomers(customersData)
    
    // 成功時は一覧に戻る
    goBack()
  } catch (err) {
    console.error('Failed to bulk create customers:', err)
  } finally {
    isSubmitting.value = false
    clearLoading()
  }
}
</script>

<style scoped>
.customer-bulk-create-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.customer-bulk-create-header h1 {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.customer-bulk-create-content {
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.card-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.25rem;
  font-weight: 600;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .customer-bulk-create-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
</style>

