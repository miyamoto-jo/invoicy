<template>
  <div class="dashboard">
    <header class="header">
      <div class="container">
        <div class="header-content">
          <h1>Invoicy</h1>
          <div class="user-info">
            <span>{{ authStore.userName }}</span>
            <button @click="handleSignOut" class="btn btn-secondary">
              サインアウト
            </button>
          </div>
        </div>
      </div>
    </header>
    
    <main class="main">
      <div class="container">
        <div class="welcome-section">
          <h2>ようこそ、{{ authStore.userName }}さん</h2>
          <p>請求書管理システムへようこそ。左側のメニューから機能を選択してください。</p>
        </div>
        
        <div class="quick-actions">
          <h3>クイックアクション</h3>
          <div class="action-grid">
            <router-link to="/customers" class="action-card">
              <div class="action-icon">👥</div>
              <h4>顧客管理</h4>
              <p>顧客情報の登録・編集</p>
            </router-link>
            
            <router-link to="/products" class="action-card">
              <div class="action-icon">📦</div>
              <h4>商品管理</h4>
              <p>商品情報の登録・編集</p>
            </router-link>
            
            <router-link to="/taxes" class="action-card">
              <div class="action-icon">📊</div>
              <h4>税率管理</h4>
              <p>税率の設定・管理</p>
            </router-link>
            
            <router-link to="/sales" class="action-card">
              <div class="action-icon">💰</div>
              <h4>売上登録</h4>
              <p>売上伝票の作成</p>
            </router-link>
            
            <router-link to="/invoices" class="action-card">
              <div class="action-icon">📄</div>
              <h4>請求書作成</h4>
              <p>請求書の作成・管理</p>
            </router-link>
          </div>
        </div>
        
        <div class="system-info">
          <h3>システム情報</h3>
          <div class="info-grid">
            <div class="info-item">
              <strong>ユーザー:</strong> {{ authStore.userEmail }}
            </div>
            <div class="info-item">
              <strong>認証状態:</strong> 
              <span class="status-badge status-success">認証済み</span>
            </div>
            <div class="info-item">
              <strong>データ保存先:</strong> Google Drive
            </div>
            <div class="info-item">
              <strong>事業者:</strong> {{ settingsStore.businessSettings?.name || '未設定' }}
            </div>
            <div class="info-item">
              <strong>顧客数:</strong> {{ customersStore.customersCount }}件
            </div>
            <div class="info-item">
              <strong>税率数:</strong> {{ taxesStore.taxesCount }}件
            </div>
          </div>
        </div>
        
        <div class="business-settings-section">
          <h3>事業者設定</h3>
          <div class="business-info">
            <div class="business-details">
              <div class="business-name">{{ settingsStore.businessSettings?.name }}</div>
              <div class="business-number">{{ settingsStore.businessSettings?.number }}</div>
              <div class="business-representative">代表者: {{ settingsStore.businessSettings?.representative }}</div>
            </div>
            <router-link to="/business-settings" class="btn btn-primary">
              編集
            </router-link>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/settings'
import { useCustomersStore } from '../stores/customers'
import { useTaxesStore } from '../stores/taxes'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const customersStore = useCustomersStore()
const taxesStore = useTaxesStore()
const router = useRouter()

onMounted(async () => {
  // 設定データを初期化
  try {
    await settingsStore.initializeSettings()
    
    // 事業者設定が存在しない場合は設定画面にリダイレクト
    if (!settingsStore.hasBusinessSettings) {
      router.push('/business-settings')
      return
    }
    
    // 顧客データと税率データを初期化
    await Promise.all([
      customersStore.initializeCustomers(),
      taxesStore.initializeTaxes()
    ])
  } catch (err) {
    console.error('Failed to initialize data:', err)
  }
})

const handleSignOut = async () => {
  authStore.signOut()
  router.push('/')
}
</script>

<style scoped>
.dashboard {
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
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info span {
  color: #666;
}

.main {
  padding: 2rem 0;
}

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

.quick-actions {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.quick-actions h3 {
  color: #333;
  margin-bottom: 1.5rem;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.action-card {
  display: block;
  text-decoration: none;
  color: inherit;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.action-card:hover {
  background: #e9ecef;
  border-color: #4285f4;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.action-card h4 {
  color: #333;
  margin-bottom: 0.5rem;
}

.action-card p {
  color: #666;
  font-size: 0.9rem;
}

.system-info {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.system-info h3 {
  color: #333;
  margin-bottom: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  padding: 0.5rem 0;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-success {
  background: #d4edda;
  color: #155724;
}

.business-settings-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.business-settings-section h3 {
  color: #333;
  margin-bottom: 1.5rem;
}

.business-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.business-details {
  flex: 1;
}

.business-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
}

.business-number {
  color: #666;
  margin-bottom: 0.25rem;
}

.business-representative {
  color: #666;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .business-info {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style> 