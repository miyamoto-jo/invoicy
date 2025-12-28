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
    
    <!-- データ保存容量セクション -->
    <div class="storage-section" v-if="authStore.user?.storage_quota">
      <div class="storage-header">
        <h3 class="storage-title">
          データ保存容量
          <span 
            @click="refreshStorageInfo" 
            class="refresh-icon"
            :class="{ 'refreshing': isRefreshing }"
            :title="isRefreshing ? '更新中...' : '容量情報を更新'"
          >
            🔄
          </span>
        </h3>
      </div>
      <div class="storage-container">
        <div class="storage-info">
          <div class="storage-item">
            <span class="storage-label">総容量:</span>
            <span class="storage-value">{{ formatBytes(authStore.user.storage_quota.limit) }}</span>
          </div>
          <div class="storage-item">
            <span class="storage-label">使用量:</span>
            <span class="storage-value">{{ formatBytes(authStore.user.storage_quota.usage) }}</span>
          </div>
          <div class="storage-item">
            <span class="storage-label">残り容量:</span>
            <span class="storage-value" :class="{ 'warning': isNearLimit, 'danger': isOverLimit, 'low-storage': isLowStorage }">
              {{ formatBytes(authStore.user.storage_quota.remaining) }}
            </span>
          </div>
        </div>
        
        <!-- プログレスバー -->
        <div class="storage-gauge">
          <div class="gauge-container">
            <div class="gauge-bar">
              <div 
                class="gauge-fill" 
                :class="{ 'warning': isNearLimit, 'danger': isOverLimit }"
                :style="{ width: usageRate + '%' }"
              ></div>
            </div>
            <div class="gauge-label">{{ usageRate.toFixed(1) }}% 使用中</div>
          </div>
        </div>
        
        <!-- 容量不足警告 -->
        <div v-if="isNearLimit || isOverLimit || isLowStorage" class="storage-warning" :class="{ 'low-storage-warning': isLowStorage }">
          <span class="warning-icon">⚠️</span>
          <span class="warning-text">
            {{ isOverLimit ? '容量が不足しています！' : isLowStorage ? '残り容量が3GB以下です！' : '容量が少なくなっています' }}
          </span>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/setting'
import { useRouter } from 'vue-router'
import { useLoading } from '../composables/useLoading'
import AppLayout from '../components/AppLayout.vue'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const router = useRouter()
const { setLoading, clearLoading } = useLoading()

// 再読み込み状態
const isRefreshing = ref(false)

// 容量情報のcomputed
const usageRate = computed(() => {
  return authStore.user?.storage_quota?.usage_rate || 0
})

const isNearLimit = computed(() => {
  return usageRate.value > 80
})

const isOverLimit = computed(() => {
  return usageRate.value >= 100
})

const isLowStorage = computed(() => {
  const remaining = authStore.user?.storage_quota?.remaining || 0
  const remainingGB = remaining / (1024 * 1024 * 1024) // バイトをGBに変換
  return remainingGB <= 3 // 3GB以下
})

// バイトを読みやすい形式に変換
const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 容量情報の再読み込み
const refreshStorageInfo = async () => {
  try {
    isRefreshing.value = true
    
    const token = authStore.getAccessToken()
    if (!token) {
      console.error('❌ No access token available')
      return
    }
    
    // Google Drive APIから容量情報を取得
    const { googleApiClient } = await import('../services/googleApi.js')
    const driveInfoResponse = await googleApiClient.makeAuthenticatedRequest(
      googleApiClient.getDriveAboutUrl(), 
      token
    )
    
    if (driveInfoResponse.ok) {
      const driveInfo = await driveInfoResponse.json()
      
      // 容量情報の計算
      if (driveInfo.storageQuota) {
        const quota = driveInfo.storageQuota
        const limit = parseInt(quota.limit) || 0
        const usage = parseInt(quota.usage) || 0
        const usageInDrive = parseInt(quota.usageInDrive) || 0
        const usageInDriveTrash = parseInt(quota.usageInDriveTrash) || 0
        const remaining = limit - usage
        
        const updatedStorageQuota = {
          limit: limit,
          usage: usage,
          usage_in_drive: usageInDrive,
          usage_in_drive_trash: usageInDriveTrash,
          remaining: remaining,
          usage_rate: limit > 0 ? (usage / limit) * 100 : 0
        }
        
        // ユーザー情報を更新
        const updatedUser = {
          ...authStore.user,
          storage_quota: updatedStorageQuota
        }
        
        authStore.user = updatedUser
        
        // ローカルストレージに保存
        const { useStorage } = await import('../composables/useStorage.js')
        const { saveToLocalStorage } = useStorage()
        const { STORAGE_KEYS } = await import('../config/api.js')
        saveToLocalStorage(STORAGE_KEYS.USER_INFO, updatedUser)
      } else {
        console.warn('⚠️ No storage quota information in response')
      }
    } else {
      console.error('❌ Failed to fetch storage info:', driveInfoResponse.status, driveInfoResponse.statusText)
    }
    
  } catch (err) {
    console.error('❌ Failed to refresh storage info:', err)
  } finally {
    isRefreshing.value = false
  }
}

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
      router.push('/')
      return
    }
    
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
      router.push('/business-settings')
      return
    }

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

/* データ保存容量セクション */
.storage-section {
  margin-bottom: 2rem;
}

.storage-header {
  margin-bottom: 1rem;
}

.storage-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-icon {
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0.25rem;
  border-radius: 4px;
  user-select: none;
}

.refresh-icon:hover:not(.refreshing) {
  background-color: #f8f9fa;
  transform: scale(1.1);
}

.refresh-icon.refreshing {
  animation: spin 1s linear infinite;
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.storage-container {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.storage-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.storage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 120px;
}

.storage-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.storage-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: #333;
}

.storage-value.warning {
  color: #f57c00;
}

.storage-value.danger {
  color: #d32f2f;
}

.storage-value.low-storage {
  color: #d32f2f;
  font-weight: bold;
}

/* プログレスバー */
.storage-gauge {
  margin-bottom: 1rem;
}

.gauge-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.gauge-bar {
  width: 100%;
  height: 20px;
  background-color: #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.gauge-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 10px;
  transition: width 0.3s ease, background 0.3s ease;
}

.gauge-fill.warning {
  background: linear-gradient(90deg, #ff9800, #ffc107);
}

.gauge-fill.danger {
  background: linear-gradient(90deg, #f44336, #ff5722);
}

.gauge-label {
  text-align: center;
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
}

/* 容量不足警告 */
.storage-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  color: #856404;
}

.storage-warning.danger {
  background-color: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
}

.storage-warning.low-storage-warning {
  background-color: #f8d7da;
  border-color: #f5c6cb;
  color: #721c24;
  border-left: 4px solid #d32f2f;
}

.warning-icon {
  font-size: 1.2rem;
}

.warning-text {
  font-weight: 500;
}

/* レスポンシブデザイン */
@media (max-width: 768px) {
  .storage-title {
    justify-content: center;
  }
  
  .storage-info {
    flex-direction: column;
    gap: 1rem;
  }
  
  .storage-item {
    flex-direction: row;
    justify-content: space-between;
    min-width: auto;
  }
  
  .storage-label {
    margin-bottom: 0;
  }
  
  .storage-container {
    padding: 1.5rem;
  }
}

</style> 