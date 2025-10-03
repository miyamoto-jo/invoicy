<template>
  <AppLayout>
    <div class="welcome-section">
      <h2>ようこそ、{{ authStore.userName }}さん</h2>
      <p>請求書管理システムへようこそ。左上のアイコンをタップしてメニューを開き、機能を選択してください。</p>
    </div>
    
    <div class="quick-actions-section">
      <h3 class="quick-actions-title">クイックアクション</h3>
      <div class="quick-actions-container">
        <button class="quick-action-button" @click="navigateToSales">
          <div class="quick-action-icon sales-icon">
            <span class="emoji-icon">💰</span>
          </div>
          <span class="quick-action-text">売上登録</span>
        </button>
        
        <button class="quick-action-button" @click="navigateToInvoices">
          <div class="quick-action-icon invoice-icon">
            <span class="emoji-icon">📄</span>
          </div>
          <span class="quick-action-text">請求書作成</span>
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/setting'
import { useRouter } from 'vue-router'
import { useLoading } from '../composables/useLoading'
import AppLayout from '../components/AppLayout.vue'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const router = useRouter()
const { setLoading, clearLoading } = useLoading()

// ナビゲーション関数
const navigateToSales = () => {
  router.push('/sales')
}

const navigateToInvoices = () => {
  router.push('/invoices')
}

onMounted(async () => {
  try {
    // 認証状態の確認
    if (!authStore.isAuthenticated) {
      console.log('❌ User not authenticated, redirecting to login')
      router.push('/')
      return
    }
    
    console.log('✅ User authenticated, initializing data...')
    
    // 設定データを初期化（既に初期化済みの場合はスキップ）
    if (!settingsStore.isInitialized) {
      // ローディング開始
      setLoading(true, 'データを読み込み中...', '設定情報を確認しています')
      
      await settingsStore.initializeSettings()
      
      // ローディング終了
      clearLoading()
    }
    
    // 事業者設定が存在しない場合は設定画面にリダイレクト
    if (!settingsStore.hasBusinessSettings) {
      console.log('❌ No business settings found, redirecting to setup')
      router.push('/business-settings')
      return
    }
    
    console.log('✅ Business settings loaded')
    
  } catch (err) {
    console.error('Failed to initialize data:', err)
    clearLoading()
  }
})

</script>

<style scoped>

.welcome-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.welcome-section h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.welcome-section p {
  color: #666;
}

.quick-actions-section {
  margin-bottom: 2rem;
}

.quick-actions-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  text-align: center;
  margin-bottom: 1rem;
}

.quick-actions-container {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-around;
  gap: 2rem;
}

.quick-action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 1rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
  flex: 1;
  max-width: 200px;
}

.quick-action-button:hover {
  background-color: #f5f5f5;
}

.quick-action-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  border-radius: 50%;
}

.sales-icon {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: white;
}

.invoice-icon {
  background: #f8f9fa;
  color: #333;
}

.quick-action-icon svg {
  width: 32px;
  height: 32px;
}

.emoji-icon {
  font-size: 2rem;
  display: block;
}

.quick-action-text {
  font-size: 1rem;
  color: #333;
  text-align: center;
  font-weight: 500;
}

@media (max-width: 768px) {
  .quick-actions-container {
    flex-direction: row;
    gap: 1rem;
    padding: 1rem;
  }
  
  .quick-action-button {
    max-width: none;
    flex: 1;
  }
  
  .quick-action-icon {
    width: 50px;
    height: 50px;
  }
  
  .emoji-icon {
    font-size: 1.5rem;
  }
  
  .quick-action-text {
    font-size: 0.9rem;
  }
}

</style> 