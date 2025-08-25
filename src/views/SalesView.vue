<template>
  <AppLayout>
    <div class="sales">
      <!-- 売上登録 -->
      <div class="card">
        <h2>売上登録</h2>
        <p class="description">
          顧客を選択し、商品と数量を入力して売上伝票を作成します。
        </p>
        
        <SalesForm 
          ref="salesFormRef"
          @submit="handleSaleCreated"
          @cancel="handleCancel"
          @error="handleError"
          @toast="handleToast"
        />
      </div>

      <!-- 成功メッセージ -->
      <div v-if="showSuccessMessage" class="success-message">
        <div class="success-content">
          <h3>売上登録完了</h3>
          <p>売上伝票が正常に登録されました。</p>
          <div class="success-actions">
            <button @click="handleReregister" class="btn btn-success">
              再登録
            </button>
            <router-link to="/dashboard" class="btn btn-secondary">
              ダッシュボードに戻る
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- トースト通知 -->
    <div v-if="toast.show" class="toast" :class="toast.type">
      <div class="toast-content">
        <span class="toast-message">{{ toast.message }}</span>
        <button @click="hideToast" class="toast-close">&times;</button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SalesForm from '../components/SalesForm.vue'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()

// Reactive data
const showSuccessMessage = ref(false)
const salesFormRef = ref(null)
const toast = ref({
  show: false,
  message: '',
  type: 'success' // 'success' or 'error'
})

// Methods
const handleSaleCreated = (sale) => {
  console.log('Sale created:', sale)
  showSuccessMessage.value = true
  showToast('売上伝票が正常に登録されました', 'success')
}

const handleCancel = () => {
  // ダッシュボードに戻る
  router.push('/dashboard')
}

const handleError = (error) => {
  showToast(error.message || '売上の登録に失敗しました', 'error')
}

const handleToast = (toastData) => {
  showToast(toastData.message, toastData.type)
}

const handleReregister = () => {
  // 成功メッセージを閉じる
  showSuccessMessage.value = false
  
  // フォームをクリア
  if (salesFormRef.value) {
    salesFormRef.value.clearForm()
  }
}

const showToast = (message, type = 'success') => {
  toast.value = {
    show: true,
    message,
    type
  }
  
  // 3秒後に自動で非表示
  setTimeout(() => {
    hideToast()
  }, 3000)
}

const hideToast = () => {
  toast.value.show = false
}
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

/* 成功メッセージ */
.success-message {
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

.success-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.success-content h3 {
  color: #28a745;
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.success-content p {
  color: #666;
  margin-bottom: 1.5rem;
}

.success-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* トースト通知 */
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

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

@media (max-width: 768px) {
  .success-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
  
  .toast {
    left: 20px;
    right: 20px;
    min-width: auto;
  }
}
</style> 