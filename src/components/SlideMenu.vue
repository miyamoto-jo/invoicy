<template>
  <div class="slide-menu-container">
    <!-- オーバーレイ -->
    <div 
      v-if="isOpen" 
      class="menu-overlay"
      @click="closeMenu"
    ></div>
    
    <!-- スライドメニュー -->
    <div 
      class="slide-menu"
      :class="{ 'menu-open': isOpen }"
    >
      <!-- ユーザー情報セクション -->
      <div class="user-section">
        <div class="user-avatar">
          <img 
            v-if="authStore.user?.picture" 
            :src="authStore.user.picture" 
            :alt="authStore.userName"
          />
          <div v-else class="avatar-placeholder">
            {{ authStore.userName?.charAt(0) || 'U' }}
          </div>
        </div>
        <div class="user-info">
          <div class="user-name">{{ authStore.userName || 'ユーザー名' }}</div>
          <div class="user-email">{{ authStore.userEmail || 'user@example.com' }}</div>
          <div class="business-info">
            <div class="business-name">事業者名: {{ settingsStore.businessSettings?.name || '未設定' }}</div>
            <div class="business-representative">代表者: {{ settingsStore.businessSettings?.representative || '未設定' }}</div>
          </div>
        </div>
      </div>
      
      <!-- メニュー項目 -->
      <nav class="menu-items">
        <!-- ダッシュボード -->
        <div class="menu-section">
          <router-link to="/dashboard" class="menu-item" @click="closeMenu">
            <div class="menu-icon dashboard-icon">🏠</div>
            <span class="menu-text">ダッシュボード</span>
          </router-link>
        </div>
        
        <!-- 業務セクション -->
        <div class="menu-section">
          <h3 class="section-title">業務</h3>
          <router-link to="/sales" class="menu-item" @click="closeMenu">
            <div class="menu-icon sales-icon">💰</div>
            <span class="menu-text">売上登録</span>
          </router-link>
          <router-link to="/invoices" class="menu-item" @click="closeMenu">
            <div class="menu-icon invoice-icon">📄</div>
            <span class="menu-text">請求書作成</span>
          </router-link>
          <router-link to="/sales/list" class="menu-item" @click="closeMenu">
            <div class="menu-icon sales-list-icon">📋</div>
            <span class="menu-text">売上一覧</span>
          </router-link>
          <router-link to="/sales/analytics" class="menu-item" @click="closeMenu">
            <div class="menu-icon sales-analytics-icon">📈</div>
            <span class="menu-text">売上分析</span>
          </router-link>
        </div>
        
        <!-- マスター管理セクション -->
        <div class="menu-section">
          <h3 class="section-title">マスター管理</h3>
          <router-link to="/customers" class="menu-item" @click="closeMenu">
            <div class="menu-icon customer-icon">👥</div>
            <span class="menu-text">顧客管理</span>
          </router-link>
          <router-link to="/products" class="menu-item" @click="closeMenu">
            <div class="menu-icon product-icon">📦</div>
            <span class="menu-text">商品管理</span>
          </router-link>
          <router-link to="/taxes" class="menu-item" @click="closeMenu">
            <div class="menu-icon tax-icon">📊</div>
            <span class="menu-text">税率管理</span>
          </router-link>
        </div>
        
        <!-- その他セクション -->
        <div class="menu-section">
          <h3 class="section-title">その他</h3>
          <router-link to="/business-settings" class="menu-item" @click="closeMenu">
            <div class="menu-icon settings-icon">🏢</div>
            <span class="menu-text">事業者設定</span>
          </router-link>
          <button class="menu-item signout-button" @click="showSignOutModal">
            <div class="menu-icon signout-icon">👋</div>
            <span class="menu-text">サインアウト</span>
          </button>
        </div>
      </nav>
    </div>

    <!-- サインアウト確認モーダル -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">サインアウト確認</h3>
        </div>
        <div class="modal-body">
          <p>本当にサインアウトしますか？</p>
          <p class="modal-subtitle">ログイン画面に戻ります。</p>
        </div>
        <div class="modal-footer">
          <button class="modal-button cancel-button" @click="closeModal">
            キャンセル
          </button>
          <button class="modal-button confirm-button" @click="confirmSignOut">
            サインアウト
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useSettingsStore } from '../stores/setting'
import { useRouter } from 'vue-router'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const router = useRouter()

const showModal = ref(false)

// スクロール制御関数
const disableScroll = () => {
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
}

const enableScroll = () => {
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
}

// モーダルの表示状態を監視してスクロールを制御
watch(showModal, (newValue) => {
  if (newValue) {
    disableScroll()
  } else {
    enableScroll()
  }
})

const closeMenu = () => {
  emit('close')
}

const showSignOutModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const confirmSignOut = async () => {
  try {
    await authStore.signOut()
    closeModal()
    closeMenu()
    router.push('/')
  } catch (error) {
    console.error('Sign out failed:', error)
  }
}

// コンポーネントがアンマウントされる時にスクロールを有効に戻す
onUnmounted(() => {
  enableScroll()
})
</script>

<style scoped>
.slide-menu-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  pointer-events: none;
}

.menu-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  animation: fadeIn 0.25s ease-out;
}

.slide-menu {
  position: absolute;
  top: 0;
  left: -320px;
  width: 320px;
  height: 100%;
  background-color: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  transition: transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  will-change: transform;
}

.slide-menu.menu-open {
  transform: translateX(320px);
}

/* ユーザー情報セクション */
.user-section {
  padding: 2rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.user-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-bottom: 1rem;
  overflow: hidden;
  border: 3px solid #e0e0e0;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background-color: #4285f4;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 600;
}

.user-info {
  color: #333;
}

.user-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.user-email {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.75rem;
}

.business-info {
  font-size: 0.85rem;
  color: #666;
}

.business-name,
.business-representative {
  margin-bottom: 0.25rem;
}

/* メニュー項目 */
.menu-items {
  flex: 1;
  padding: 1rem 0;
}

.menu-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 1.5rem;
  margin-bottom: 0.5rem;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  color: #333;
  transition: background-color 0.2s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 1rem;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.menu-item.router-link-active {
  background-color: #e3f2fd;
  color: #1976d2;
}

.menu-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  font-size: 1.2rem;
}

.menu-text {
  font-weight: 500;
}

/* アイコンカラー */
.dashboard-icon {
  color: #4caf50;
}

.sales-icon {
  color: #f57c00;
}

.sales-list-icon {
  color: #2196f3;
}

.sales-analytics-icon {
  color: #9c27b0;
}

.invoice-icon {
  color: #388e3c;
}

.customer-icon {
  color: #1976d2;
}

.product-icon {
  color: #7b1fa2;
}

.tax-icon {
  color: #d32f2f;
}

.settings-icon {
  color: #ff9800;
}

.signout-icon {
  color: #f44336;
}

/* アニメーション */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .slide-menu {
    width: 280px;
    left: -280px;
  }
  
  .slide-menu.menu-open {
    transform: translateX(280px);
  }
  
  .user-section {
    padding: 1.5rem 1rem;
  }
  
  .menu-item {
    padding: 0.75rem 1rem;
  }
  
  .section-title {
    padding: 0 1rem;
  }
}

/* スクロールバーのスタイリング */
.slide-menu::-webkit-scrollbar {
  width: 4px;
}

.slide-menu::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.slide-menu::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.slide-menu::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* モーダルスタイル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.25s ease-out;
  pointer-events: auto;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  animation: slideIn 0.25s ease-out;
  pointer-events: auto;
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body p {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #333;
  line-height: 1.5;
}

.modal-subtitle {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0;
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 100px;
  pointer-events: auto;
  position: relative;
  z-index: 1;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #666;
}

.cancel-button:hover {
  background-color: #e0e0e0;
  color: #333;
}

.confirm-button {
  background-color: #f44336;
  color: white;
}

.confirm-button:hover {
  background-color: #d32f2f;
}

/* モーダルアニメーション */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .slide-menu {
    width: 280px;
    left: -280px;
  }
  
  .slide-menu.menu-open {
    transform: translateX(280px);
  }
  
  .user-section {
    padding: 1.5rem 1rem;
  }
  
  .menu-item {
    padding: 0.75rem 1rem;
  }
  
  .section-title {
    padding: 0 1rem;
  }

  .modal-content {
    width: 95%;
    margin: 1rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .modal-button {
    width: 100%;
  }
}
</style>
