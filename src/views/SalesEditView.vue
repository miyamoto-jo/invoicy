<template>
  <AppLayout>
    <div class="sales">
      <div class="card">
        <h2>売上編集</h2>
        <p class="description">
          選択した売上伝票の内容を更新します。顧客は固定され、日付・明細・税率・備考を変更できます。
        </p>

        <div v-if="isLoading" class="loading-placeholder">
          読み込み中...
        </div>
        <div v-else-if="error" class="error-banner">
          {{ error }}
        </div>
        <div v-else-if="initialData">
          <SalesForm
            ref="salesFormRef"
            mode="edit"
            :initial-data="initialData"
            @submit="openConfirmModal"
            @cancel="handleCancel"
            @error="handleError"
            @toast="handleToast"
          />
        </div>
      </div>

      <!-- トースト通知 -->
      <div v-if="toast.show" class="toast" :class="toast.type">
        <div class="toast-content">
          <span class="toast-message">{{ toast.message }}</span>
          <button @click="hideToast" class="toast-close">&times;</button>
        </div>
      </div>

      <!-- 更新確認モーダル -->
      <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
        <div class="modal-content" @click.stop>
          <h3>確認</h3>
          <p>
            この売上を新しい情報に更新しますか？既にこの売上が含まれる請求書を作成している場合、その請求書の売上は変更されないため、注意してください。請求書側の売上情報も更新したい場合は、売上編集を実施後、請求書データを再生成してください。
          </p>
          <div class="modal-actions">
            <button @click="executeUpdate" class="btn btn-primary" :disabled="isUpdating">
              {{ isUpdating ? '更新中...' : '実行' }}
            </button>
            <button @click="closeConfirmModal" class="btn btn-secondary" :disabled="isUpdating">
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SalesForm from '../components/SalesForm.vue'
import AppLayout from '../components/AppLayout.vue'
import { useSalesStore } from '../stores/sales'
import { useCustomersStore } from '../stores/customers'

const route = useRoute()
const router = useRouter()
const salesStore = useSalesStore()
const customersStore = useCustomersStore()

const salesFormRef = ref(null)
const initialData = ref(null)
const isLoading = ref(false)
const isUpdating = ref(false)
const error = ref('')
const showConfirmModal = ref(false)
const pendingUpdate = ref(null)
const toast = ref({
  show: false,
  message: '',
  type: 'success'
})

const loadSale = async () => {
  try {
    isLoading.value = true
    error.value = ''
    await Promise.all([
      customersStore.initializeCustomers(),
      salesStore.initializeSales()
    ])

    const saleId = route.params.id
    const sale = salesStore.getSaleById(saleId)
    if (!sale) {
      throw new Error('売上情報が見つかりませんでした')
    }

    initialData.value = convertSaleToFormData(sale)
  } catch (err) {
    console.error('Failed to load sale for edit:', err)
    error.value = err.message || '売上情報の取得に失敗しました'
  } finally {
    isLoading.value = false
  }
}

const convertSaleToFormData = (sale) => {
  return {
    id: sale.id,
    customerId: sale.customerId,
    issuedOn: sale.issuedOn,
    note: sale.note,
    invoiceTaxRate: sale.lines?.[0]?.taxRate ?? null,
    lines: sale.lines.map(line => (line.toJSON ? line.toJSON() : line))
  }
}

const openConfirmModal = (data) => {
  pendingUpdate.value = data
  showConfirmModal.value = true
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
  pendingUpdate.value = null
}

const executeUpdate = async () => {
  if (!pendingUpdate.value) return

  try {
    isUpdating.value = true
    await salesStore.updateSale(route.params.id, {
      issuedOn: pendingUpdate.value.issuedOn,
      note: pendingUpdate.value.note,
      lines: pendingUpdate.value.lines
    })
    showToast('売上を更新しました', 'success')
    closeConfirmModal()
    router.push('/sales/list')
  } catch (err) {
    console.error('Failed to update sale:', err)
    error.value = err.message || '売上の更新に失敗しました'
  } finally {
    isUpdating.value = false
  }
}

const handleCancel = () => {
  router.push('/sales/list')
}

const handleError = (err) => {
  error.value = err.message || 'エラーが発生しました'
}

const handleToast = (toastData) => {
  showToast(toastData.message, toastData.type)
}

const showToast = (message, type = 'success') => {
  toast.value = {
    show: true,
    message,
    type
  }

  setTimeout(() => {
    hideToast()
  }, 3000)
}

const hideToast = () => {
  toast.value.show = false
}

onMounted(() => {
  loadSale()
})
</script>

<style scoped>
.sales {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card h2 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.description {
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.error-banner {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
  margin-bottom: 1rem;
}

.loading-placeholder {
  padding: 1rem;
  color: #666;
}

.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  min-width: 300px;
  max-width: 400px;
  animation: slideIn 0.3s ease-out;
}

.toast.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.toast.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.toast-content {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 4px;
}

.toast-message {
  flex: 1;
  margin-right: 1rem;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
}

.toast-close:hover {
  opacity: 1;
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

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.modal-content p {
  margin: 0 0 1.5rem 0;
  color: #666;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #545b62;
}

@media (max-width: 768px) {
  .modal-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>

