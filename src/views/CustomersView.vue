<template>
  <div class="customers">
    <header class="header">
      <div class="container">
        <div class="header-content">
          <h1>顧客管理</h1>
          <div class="header-actions">
            <button @click="showCreateForm" class="btn btn-primary">
              ＋ 新規顧客
            </button>
            <router-link to="/dashboard" class="btn btn-secondary">
              ダッシュボードに戻る
            </router-link>
          </div>
        </div>
      </div>
    </header>
    
    <main class="main">
      <div class="container">
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
            />
          </div>
          
          <!-- 顧客詳細・フォーム -->
          <div v-if="showForm || selectedCustomer" class="detail-section">
            <div v-if="showForm" class="form-container">
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
      </div>
    </main>
    
    <!-- 成功メッセージ -->
    <div v-if="successMessage" class="success-toast">
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCustomersStore } from '../stores/customers'
import CustomerList from '../components/CustomerList.vue'
import CustomerForm from '../components/CustomerForm.vue'

const customersStore = useCustomersStore()

// State
const showForm = ref(false)
const selectedCustomer = ref(null)
const editingCustomer = ref(null)
const isSubmitting = ref(false)
const successMessage = ref('')

// 初期化
onMounted(async () => {
  try {
    await customersStore.initializeCustomers()
  } catch (err) {
    console.error('Failed to initialize customers:', err)
  }
})

// Actions
const showCreateForm = () => {
  editingCustomer.value = null
  selectedCustomer.value = null
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  editingCustomer.value = null
}

const selectCustomer = (customer) => {
  selectedCustomer.value = customer
  showForm.value = false
}

const closeDetail = () => {
  selectedCustomer.value = null
}

const editCustomer = (customer) => {
  editingCustomer.value = customer
  selectedCustomer.value = null
  showForm.value = true
}

const editSelectedCustomer = () => {
  if (selectedCustomer.value) {
    editingCustomer.value = selectedCustomer.value
    selectedCustomer.value = null
    showForm.value = true
  }
}

const deleteCustomer = async (customer) => {
  try {
    await customersStore.deleteCustomer(customer.id)
    showSuccessMessage(`「${customer.name}」を削除しました`)
    
    // 削除された顧客が選択されている場合は詳細を閉じる
    if (selectedCustomer.value && selectedCustomer.value.id === customer.id) {
      selectedCustomer.value = null
    }
  } catch (err) {
    console.error('Failed to delete customer:', err)
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
    
    if (editingCustomer.value) {
      // 更新
      await customersStore.updateCustomer(editingCustomer.value.id, customerData)
      showSuccessMessage(`「${customerData.name}」を更新しました`)
    } else {
      // 新規作成
      await customersStore.createCustomer(customerData)
      showSuccessMessage(`「${customerData.name}」を登録しました`)
    }
    
    closeForm()
    
  } catch (err) {
    console.error('Failed to submit customer:', err)
  } finally {
    isSubmitting.value = false
  }
}

const retryLoad = async () => {
  try {
    await customersStore.initializeCustomers()
  } catch (err) {
    console.error('Failed to retry load:', err)
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
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.customers {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 1rem 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.main {
  padding: 2rem 0;
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

@media (min-width: 1024px) {
  .content-wrapper {
    grid-template-columns: 1fr 400px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
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