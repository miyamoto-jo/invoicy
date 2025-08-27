<template>
  <AppLayout>
    <div class="business-settings">
      <div class="settings-form">
        <div class="form-header">
          <h2>{{ isEditMode ? '事業者設定の編集' : '事業者設定の作成' }}</h2>
          <p>{{ isEditMode ? '事業者情報を編集できます。' : '初回設定です。事業者情報を入力してください。' }}</p>
        </div>
        
        <form @submit.prevent="handleSubmit" class="form">
          <div class="form-group">
            <label for="name" class="form-label">
              事業者名 <span class="required">*</span>
            </label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              class="form-input"
              :class="{ 'error': errors.name }"
              placeholder="例: 株式会社サンプル"
              required
            />
            <div v-if="errors.name" class="error-message">{{ errors.name }}</div>
          </div>
          
          <div class="form-group">
            <label for="number" class="form-label">
              事業者番号 <span class="required">*</span>
            </label>
            <input
              id="number"
              v-model="formData.number"
              type="text"
              class="form-input"
              :class="{ 'error': errors.number }"
              placeholder="例: T1234567890123"
              required
            />
            <div class="form-hint">Tから始まる番号を入力してください</div>
            <div v-if="errors.number" class="error-message">{{ errors.number }}</div>
          </div>
          
          <div class="form-group">
            <label for="representative" class="form-label">
              代表者名 <span class="required">*</span>
            </label>
            <input
              id="representative"
              v-model="formData.representative"
              type="text"
              class="form-input"
              :class="{ 'error': errors.representative }"
              placeholder="例: 山田太郎"
              required
            />
            <div v-if="errors.representative" class="error-message">{{ errors.representative }}</div>
          </div>
          
          <div class="form-group">
            <label for="bankInfo" class="form-label">
              振込先情報
            </label>
            <textarea
              id="bankInfo"
              v-model="formData.bankInfo"
              class="form-textarea"
              :class="{ 'error': errors.bankInfo }"
              placeholder="例: 〇〇銀行 〇〇支店 普通 1234567 株式会社サンプル"
              rows="3"
            ></textarea>
            <div v-if="errors.bankInfo" class="error-message">{{ errors.bankInfo }}</div>
          </div>
          
          <div class="form-group">
            <label for="phone" class="form-label">
              電話番号
            </label>
            <input
              id="phone"
              v-model="formData.phone"
              type="tel"
              class="form-input"
              :class="{ 'error': errors.phone }"
              placeholder="例: 03-1234-5678"
            />
            <div v-if="errors.phone" class="error-message">{{ errors.phone }}</div>
          </div>
          
          <div class="form-group">
            <label for="address" class="form-label">
              住所
            </label>
            <textarea
              id="address"
              v-model="formData.address"
              class="form-textarea"
              :class="{ 'error': errors.address }"
              placeholder="例: 〒100-0001 東京都千代田区千代田1-1-1"
              rows="3"
            ></textarea>
            <div v-if="errors.address" class="error-message">{{ errors.address }}</div>
          </div>
          
          <div class="form-actions">
            <button
              type="button"
              @click="handleCancel"
              class="btn btn-secondary"
              :disabled="settingsStore.isLoading"
            >
              キャンセル
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="settingsStore.isLoading"
            >
              <span v-if="settingsStore.isLoading" class="loading-spinner"></span>
              {{ isEditMode ? '更新' : '作成' }}
            </button>
          </div>
        </form>
        
        <div v-if="settingsStore.error" class="error-alert">
          {{ settingsStore.error }}
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { useLoading } from '../composables/useLoading'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { setLoading, clearLoading } = useLoading()

// 初期化完了フラグ
const isInitialized = ref(false)

// フォームデータ
const formData = reactive({
  name: '',
  number: '',
  representative: '',
  bankInfo: '',
  phone: '',
  address: ''
})

// エラー状態
const errors = reactive({
  name: '',
  number: '',
  representative: '',
  bankInfo: '',
  phone: '',
  address: ''
})

// 編集モードかどうか
const isEditMode = computed(() => settingsStore.hasBusinessSettings)

onMounted(async () => {
  try {
    // ローディング開始
    setLoading(true, '設定を確認中...', '事業者設定を読み込んでいます')
    
    // 設定の初期化
    await settingsStore.initializeSettings()
    
    // 設定が存在する場合はダッシュボードにリダイレクト
    if (settingsStore.hasBusinessSettings) {
      console.log('✅ Business settings found, redirecting to dashboard')
      router.push('/dashboard')
      return
    }
    
    // 編集モードの場合は既存データをフォームに設定
    if (isEditMode.value && settingsStore.businessSettings) {
      const business = settingsStore.businessSettings
      formData.name = business.name || ''
      formData.number = business.number || ''
      formData.representative = business.representative || ''
      formData.bankInfo = business.bankInfo || ''
      formData.phone = business.phone || ''
      formData.address = business.address || ''
    }
    
    isInitialized.value = true
    
  } catch (err) {
    console.error('Failed to initialize settings:', err)
  } finally {
    // ローディング終了
    clearLoading()
  }
})

const validateForm = () => {
  // エラーをクリア
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })
  
  let isValid = true
  
  // 事業者名のバリデーション
  if (!formData.name.trim()) {
    errors.name = '事業者名は必須です'
    isValid = false
  }
  
  // 事業者番号のバリデーション
  if (!formData.number.trim()) {
    errors.number = '事業者番号は必須です'
    isValid = false
  } else if (!formData.number.startsWith('T')) {
    errors.number = '事業者番号はTから始まる必要があります'
    isValid = false
  }
  
  // 代表者名のバリデーション
  if (!formData.representative.trim()) {
    errors.representative = '代表者名は必須です'
    isValid = false
  }
  
  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  
  try {
    // ローディング開始
    setLoading(true, '保存中...', '事業者設定を保存しています')
    
    const businessData = {
      name: formData.name.trim(),
      number: formData.number.trim(),
      representative: formData.representative.trim(),
      bankInfo: formData.bankInfo.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim()
    }
    
    if (isEditMode.value) {
      await settingsStore.updateBusinessSettings(businessData)
    } else {
      await settingsStore.createBusinessSettings(businessData)
    }
    
    // 成功時はダッシュボードにリダイレクト
    router.push('/dashboard')
    
  } catch (err) {
    console.error('Failed to save business settings:', err)
    // エラーはストアで管理されているため、ここでは何もしない
  } finally {
    // ローディング終了
    clearLoading()
  }
}

const handleCancel = () => {
  if (isEditMode.value) {
    // 編集モードの場合はダッシュボードに戻る
    router.push('/dashboard')
  } else {
    // 作成モードの場合はログアウト
    authStore.signOut()
    router.push('/')
  }
}

const handleSignOut = async () => {
  authStore.signOut()
  router.push('/')
}
</script>

<style scoped>
.business-settings {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.settings-form {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-header {
  margin-bottom: 2rem;
  text-align: center;
}

.form-header h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.form-header p {
  color: #666;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #333;
}

.required {
  color: #dc3545;
}

.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
}

.form-input.error,
.form-textarea.error {
  border-color: #dc3545;
}

.form-hint {
  font-size: 0.875rem;
  color: #666;
}

.error-message {
  font-size: 0.875rem;
  color: #dc3545;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
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
  display: flex;
  align-items: center;
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
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
}

.loading-spinner {
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

.error-alert {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .settings-form {
    margin: 0 1rem;
    padding: 1.5rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style> 