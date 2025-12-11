<template>
  <AppLayout>
    <div class="customer-create-header">
      <h1>{{ isEdit ? '顧客編集' : '顧客新規登録' }}</h1>
      <button
        @click="goBack"
        class="btn btn-secondary"
        :disabled="isSubmitting"
      >
        一覧に戻る
      </button>
    </div>
    
    <div class="customer-create-content">
      <div class="card">
        <div class="card-header">
          <h2>{{ isEdit ? '顧客編集' : '顧客登録' }}</h2>
        </div>
        
        <CustomerForm
          :customer="editingCustomer"
          :is-submitting="isSubmitting"
          @submit="handleSubmit"
          @close="goBack"
        />
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCustomersStore } from '../stores/customers'
import { useLoading } from '../composables/useLoading'
import CustomerForm from '../components/CustomerForm.vue'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()
const route = useRoute()
const customersStore = useCustomersStore()
const { setLoading, clearLoading } = useLoading()

const editingCustomer = ref(null)
const isSubmitting = ref(false)

const isEdit = computed(() => !!editingCustomer.value)

// 初期化
onMounted(async () => {
  try {
    setLoading(true, '顧客データを読み込み中...', '顧客情報を取得しています')
    await customersStore.initializeCustomers()
    
    // 編集モードの場合、顧客IDから顧客を取得
    const customerId = route.params.id
    if (customerId) {
      const customer = customersStore.getCustomerById(customerId)
      if (customer) {
        editingCustomer.value = customer
      } else {
        // 顧客が見つからない場合は一覧に戻る
        router.push('/customers')
      }
    }
  } catch (err) {
    console.error('Failed to initialize customers:', err)
  } finally {
    clearLoading()
  }
})

const goBack = () => {
  router.push('/customers')
}

const handleSubmit = async (customerData) => {
  try {
    isSubmitting.value = true
    setLoading(true, '保存中...', '顧客情報を保存しています')
    
    if (isEdit.value) {
      await customersStore.updateCustomer(editingCustomer.value.id, customerData)
    } else {
      await customersStore.createCustomer(customerData)
    }
    
    // 成功時は一覧に戻る
    goBack()
  } catch (err) {
    console.error('Failed to save customer:', err)
  } finally {
    isSubmitting.value = false
    clearLoading()
  }
}
</script>

<style scoped>
.customer-create-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.customer-create-header h1 {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.customer-create-content {
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
  .customer-create-header {
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

