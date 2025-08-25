<template>
  <AppLayout>
        <div class="welcome-section">
          <h2>ようこそ、{{ authStore.userName }}さん</h2>
          <p>請求書管理システムへようこそ。左上のアイコンをタップしてメニューを開き、機能を選択してください。</p>
        </div>
      </AppLayout>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const router = useRouter()

onMounted(async () => {
  try {
    // 認証状態の確認
    if (!authStore.isAuthenticated) {
      console.log('❌ User not authenticated, redirecting to login')
      router.push('/')
      return
    }
    
    console.log('✅ User authenticated, initializing data...')
    
    // 設定データを初期化
    await settingsStore.initializeSettings()
    
    // 事業者設定が存在しない場合は設定画面にリダイレクト
    if (!settingsStore.hasBusinessSettings) {
      console.log('❌ No business settings found, redirecting to setup')
      router.push('/business-settings')
      return
    }
    
    console.log('✅ Business settings loaded')
    
  } catch (err) {
    console.error('Failed to initialize data:', err)
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

</style> 