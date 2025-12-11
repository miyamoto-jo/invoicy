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
    
    <div class="customers-content">
      <!-- 顧客一覧 -->
      <div v-if="!showForm && !showBulkCreate && !showDetail" class="card">
        <CustomerList
          :customers="customersStore.customers"
          :is-loading="customersStore.isLoading"
          :error="customersStore.error"
          @select="selectCustomer"
          @edit="showEditForm"
          @delete="deleteCustomer"
          @retry="retryLoad"
        />
      </div>

      <!-- 顧客フォーム -->
      <div v-else-if="showForm" class="card">
        <div class="card-header">
          <h2>{{ isEdit ? '顧客編集' : '顧客登録' }}</h2>
          <button
            @click="hideForm"
            class="btn btn-secondary"
          >
            一覧に戻る
          </button>
        </div>
        
        <CustomerForm
          :customer="editingCustomer"
          :is-submitting="isSubmitting"
          @submit="handleSubmit"
          @close="hideForm"
        />
      </div>

      <!-- 一括登録フォーム -->
      <div v-else-if="showBulkCreate" class="card">
        <div class="card-header">
          <h2>顧客一括登録</h2>
          <button
            @click="hideBulkCreateForm"
            class="btn btn-secondary"
          >
            一覧に戻る
          </button>
        </div>
        
        <CustomerBulkCreate
          :is-loading="isSubmitting"
          @submit="handleBulkSubmit"
          @cancel="hideBulkCreateForm"
        />
      </div>

      <!-- 顧客詳細 -->
      <div v-else-if="showDetail" class="card">
        <div class="card-header">
          <h2>顧客詳細</h2>
          <button @click="closeDetail" class="btn btn-secondary">
            一覧に戻る
          </button>
        </div>
        
        <div class="customer-detail">
          <div class="detail-content">
            <div class="detail-item">
              <span class="label">顧客名:</span>
              <span class="value">{{ selectedCustomer.getDisplayName() }}</span>
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
            <button
              @click="editSelectedCustomer"
              class="btn btn-primary"
            >
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
import { ref, computed, onMounted } from 'vue'
import { useCustomersStore } from '../stores/customers'
import { useLoading } from '../composables/useLoading'
import CustomerList from '../components/CustomerList.vue'
import CustomerForm from '../components/CustomerForm.vue'
import CustomerBulkCreate from '../components/CustomerBulkCreate.vue'
import AppLayout from '../components/AppLayout.vue'

const customersStore = useCustomersStore()
const { setLoading, clearLoading } = useLoading()

// ローカル状態
const showForm = ref(false)
const showBulkCreate = ref(false)
const showDetail = ref(false)
const selectedCustomer = ref(null)
const editingCustomer = ref(null)
const isSubmitting = ref(false)
const successMessage = ref('')

// ストアから状態を取得
const customers = computed(() => customersStore.customers)
const isLoading = computed(() => customersStore.isLoading)
const error = computed(() => customersStore.error)

// 計算プロパティ
const isEdit = computed(() => !!editingCustomer.value)

// 初期化
onMounted(async () => {
  try {
    // 既にデータが存在する場合はスキップ
    if (customersStore.customers.length === 0) {
      setLoading(true, '顧客データを読み込み中...', '顧客情報を取得しています')
      await customersStore.initializeCustomers()
      clearLoading()
    }
  } catch (err) {
    console.error('Failed to initialize customers:', err)
    clearLoading()
  }
})

// フォーム表示制御
const showCreateForm = () => {
  editingCustomer.value = null
  showForm.value = true
  showBulkCreate.value = false
  showDetail.value = false
  selectedCustomer.value = null
}

const showEditForm = (customer) => {
  editingCustomer.value = customer
  showForm.value = true
  showBulkCreate.value = false
  showDetail.value = false
  selectedCustomer.value = null
}

const hideForm = () => {
  showForm.value = false
  editingCustomer.value = null
}

const showBulkCreateForm = () => {
  showForm.value = false
  showBulkCreate.value = true
  showDetail.value = false
  selectedCustomer.value = null
}

const hideBulkCreateForm = () => {
  showBulkCreate.value = false
}

// 顧客詳細表示制御
const selectCustomer = (customer) => {
  selectedCustomer.value = customer
  showDetail.value = true
  showForm.value = false
  showBulkCreate.value = false
}

const closeDetail = () => {
  selectedCustomer.value = null
  showDetail.value = false
}

const editSelectedCustomer = () => {
  if (selectedCustomer.value) {
    editingCustomer.value = selectedCustomer.value
    selectedCustomer.value = null
    showDetail.value = false
    showForm.value = true
    showBulkCreate.value = false
  }
}

// フォーム送信処理
const handleSubmit = async (customerData) => {
  try {
    isSubmitting.value = true
    setLoading(true, '保存中...', '顧客情報を保存しています')
    
    if (isEdit.value) {
      await customersStore.updateCustomer(editingCustomer.value.id, customerData)
      showSuccessMessage(`「${customerData.name}」を更新しました`)
    } else {
      await customersStore.createCustomer(customerData)
      showSuccessMessage(`「${customerData.name}」を登録しました`)
    }
    
    // 成功時は一覧に戻る
    hideForm()
  } catch (err) {
    console.error('Failed to save customer:', err)
  } finally {
    isSubmitting.value = false
    clearLoading()
  }
}

// 一括登録処理
const handleBulkSubmit = async (customersData) => {
  try {
    isSubmitting.value = true
    setLoading(true, '一括登録中...', `${customersData.length}件の顧客を登録しています`)
    
    await customersStore.bulkCreateCustomers(customersData)
    showSuccessMessage(`${customersData.length}件の顧客を登録しました`)
    
    // 成功時は一覧に戻る
    hideBulkCreateForm()
  } catch (err) {
    console.error('Failed to bulk create customers:', err)
  } finally {
    isSubmitting.value = false
    clearLoading()
  }
}

// 削除処理
const deleteCustomer = async (customer) => {
  try {
    setLoading(true, '削除中...', `「${customer.getDisplayName()}」を削除しています`)
    await customersStore.deleteCustomer(customer.id)
    showSuccessMessage(`「${customer.getDisplayName()}」を削除しました`)
    
    // 削除された顧客が選択されている場合は詳細を閉じる
    if (selectedCustomer.value && selectedCustomer.value.id === customer.id) {
      selectedCustomer.value = null
      showDetail.value = false
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

.header-actions {
  display: flex;
  gap: 1rem;
}

.customers-header h1 {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.customers-content {
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

.customer-detail {
  padding: 2rem;
}

.detail-content {
  margin-bottom: 2rem;
}

.detail-item {
  display: flex;
  margin-bottom: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item .label {
  font-weight: 500;
  color: #666;
  min-width: 120px;
  margin-right: 1rem;
}

.detail-item .value {
  color: #333;
  flex: 1;
}

.detail-actions {
  display: flex;
  gap: 1rem;
  padding-top: 1.5rem;
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

.btn:disabled,
.btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled):not(.disabled) {
  background-color: #0056b3;
}

.btn-outline {
  background-color: #ffe0e0;
  color: #c82333;
  border: 1px solid #f5c6cb;
}

.btn-outline:hover:not(:disabled):not(.disabled) {
  background-color: #ffcccc;
  border-color: #f5c6cb;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled):not(.disabled) {
  background-color: #545b62;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .customers-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .detail-item {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .detail-item .label {
    min-width: auto;
    margin-right: 0;
  }
  
  .detail-actions {
    flex-direction: column;
  }
}
</style> 