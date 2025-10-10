<template>
  <AppLayout>
    <div class="customers-header">
      <h1>顧客管理</h1>
      <div class="header-actions">
        <button
          @click="showCreateForm"
          class="btn btn-primary"
          :disabled="customersStore.isLoading"
        >
          新規登録
        </button>
        <button
          @click="showBulkCreateForm"
          class="btn btn-outline"
          :disabled="customersStore.isLoading"
        >
          一括登録
        </button>
      </div>
    </div>
    
    <div class="content-wrapper">
      <!-- 顧客一覧 -->
      <div class="list-section">
            <CustomerList
              :customers="customersStore.customers"
              :is-loading="customersStore.isLoading"
              :error="customersStore.error"
              @select="selectCustomer"
              @edit="editCustomer"
              @delete="deleteCustomer"
              @retry="retryLoad"
              @bulk-create="showBulkCreateForm"
            />
          </div>
          
          <!-- 顧客詳細・フォーム・一括登録 -->
          <div v-if="showForm || selectedCustomer || showBulkCreate" class="detail-section">
            <div v-if="showBulkCreate" class="form-container">
              <CustomerBulkCreate
                :is-loading="isSubmitting"
                @submit="handleBulkSubmit"
                @cancel="closeBulkCreateForm"
              />
            </div>
            
            <div v-else-if="showForm" class="form-container">
              <CustomerForm
                :customer="editingCustomer"
                :is-submitting="isSubmitting"
                @submit="handleFormSubmit"
                @close="closeForm"
              />
            </div>
            
            <div v-else-if="selectedCustomer" class="customer-detail">
              <div class="detail-header">
                <h3>顧客詳細</h3>
                <button @click="closeDetail" class="btn btn-secondary">
                  ✕
                </button>
              </div>
              
              <div class="detail-content">
                <div class="detail-item">
                  <span class="label">顧客名:</span>
                  <span class="value">{{ selectedCustomer.name }}</span>
                </div>
                
                <div v-if="selectedCustomer.alias" class="detail-item">
                  <span class="label">管理用名称:</span>
                  <span class="value">{{ selectedCustomer.alias }}</span>
                </div>
                
                <div v-if="selectedCustomer.address" class="detail-item">
                  <span class="label">住所:</span>
                  <span class="value">{{ selectedCustomer.address }}</span>
                </div>
                
                <div class="detail-item">
                  <span class="label">作成日:</span>
                  <span class="value">{{ formatDate(selectedCustomer.createdAt) }}</span>
                </div>
                
                <div class="detail-item">
                  <span class="label">更新日:</span>
                  <span class="value">{{ formatDate(selectedCustomer.updatedAt) }}</span>
                </div>
              </div>
              
              <div class="detail-actions">
                <button @click="editSelectedCustomer" class="btn btn-primary">
                  編集
                </button>
                <button @click="deleteSelectedCustomer" class="btn btn-secondary">
                  削除
                </button>
              </div>
            </div>
      </div>
    </div>
  </AppLayout>
    
    <!-- 成功メッセージ -->
    <div v-if="successMessage" class="success-toast">
      {{ successMessage }}
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCustomersStore } from '../stores/customers'
import { useLoading } from '../composables/useLoading'
import CustomerList from '../components/CustomerList.vue'
import CustomerForm from '../components/CustomerForm.vue'
import CustomerBulkCreate from '../components/CustomerBulkCreate.vue'
import AppLayout from '../components/AppLayout.vue'

const customersStore = useCustomersStore()
const { setLoading, clearLoading } = useLoading()

// State
const showForm = ref(false)
const showBulkCreate = ref(false)
const selectedCustomer = ref(null)
const editingCustomer = ref(null)
const isSubmitting = ref(false)
const successMessage = ref('')

// 初期化
onMounted(async () => {
  try {
    setLoading(true, '顧客データを読み込み中...', '顧客情報を取得しています')
    await customersStore.initializeCustomers()
  } catch (err) {
    console.error('Failed to initialize customers:', err)
  } finally {
    clearLoading()
  }
})

// Actions
const showCreateForm = () => {
  editingCustomer.value = null
  selectedCustomer.value = null
  showForm.value = true
  showBulkCreate.value = false
}

const closeForm = () => {
  showForm.value = false
  editingCustomer.value = null
}

const showBulkCreateForm = () => {
  showForm.value = false
  showBulkCreate.value = true
  selectedCustomer.value = null
}

const closeBulkCreateForm = () => {
  showBulkCreate.value = false
}

const selectCustomer = (customer) => {
  selectedCustomer.value = customer
  showForm.value = false
  showBulkCreate.value = false
}

const closeDetail = () => {
  selectedCustomer.value = null
}

const editCustomer = (customer) => {
  editingCustomer.value = customer
  selectedCustomer.value = null
  showForm.value = true
  showBulkCreate.value = false
}

const editSelectedCustomer = () => {
  if (selectedCustomer.value) {
    editingCustomer.value = selectedCustomer.value
    selectedCustomer.value = null
    showForm.value = true
    showBulkCreate.value = false
  }
}

const deleteCustomer = async (customer) => {
  try {
    setLoading(true, '削除中...', `「${customer.name}」を削除しています`)
    await customersStore.deleteCustomer(customer.id)
    showSuccessMessage(`「${customer.name}」を削除しました`)
    
    // 削除された顧客が選択されている場合は詳細を閉じる
    if (selectedCustomer.value && selectedCustomer.value.id === customer.id) {
      selectedCustomer.value = null
    }
  } catch (err) {
    console.error('Failed to delete customer:', err)
  } finally {
    clearLoading()
  }
}

const deleteSelectedCustomer = async () => {
  if (selectedCustomer.value) {
    await deleteCustomer(selectedCustomer.value)
  }
}

const handleFormSubmit = async (customerData) => {
  try {
    isSubmitting.value = true
    setLoading(true, '保存中...', '顧客情報を保存しています')
    
    if (editingCustomer.value) {
      await customersStore.updateCustomer(editingCustomer.value.id, customerData)
      showSuccessMessage(`「${customerData.name}」を更新しました`)
    } else {
      await customersStore.createCustomer(customerData)
      showSuccessMessage(`「${customerData.name}」を登録しました`)
    }
    
    closeForm()
  } catch (err) {
    console.error('Failed to save customer:', err)
  } finally {
    isSubmitting.value = false
    clearLoading()
  }
}

const handleBulkSubmit = async (customersData) => {
  try {
    isSubmitting.value = true
    setLoading(true, '一括登録中...', `${customersData.length}件の顧客を登録しています`)
    
    await customersStore.bulkCreateCustomers(customersData)
    showSuccessMessage(`${customersData.length}件の顧客を登録しました`)
    
    closeBulkCreateForm()
  } catch (err) {
    console.error('Failed to bulk create customers:', err)
  } finally {
    isSubmitting.value = false
    clearLoading()
  }
}

const retryLoad = async () => {
  try {
    setLoading(true, '再読み込み中...', '顧客データを再取得しています')
    await customersStore.initializeCustomers()
  } catch (err) {
    console.error('Failed to retry load customers:', err)
  } finally {
    clearLoading()
  }
}

const showSuccessMessage = (message) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
</script>

<style scoped>
.customers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.customers-header h1 {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.list-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.detail-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;
}

.form-container {
  width: 100%;
}

.customer-detail {
  width: 100%;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.detail-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.detail-content {
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  margin-bottom: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item .label {
  font-weight: 500;
  color: #666;
  min-width: 120px;
  margin-right: 15px;
}

.detail-item .value {
  color: #333;
  flex: 1;
}

.detail-actions {
  display: flex;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.success-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #4caf50;
  color: white;
  padding: 12px 20px;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
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

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-outline {
  background-color: transparent;
  color: #007bff;
  border: 1px solid #007bff;
}

.btn-outline:hover:not(:disabled) {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

@media (min-width: 1024px) {
  .content-wrapper {
    grid-template-columns: 1fr 400px;
  }
}

@media (max-width: 768px) {
  .customers-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .detail-item {
    flex-direction: column;
    gap: 5px;
  }
  
  .detail-item .label {
    min-width: auto;
    margin-right: 0;
  }
}
</style> 