import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Views
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import BusinessSettingsView from '../views/BusinessSettingsView.vue'
import CustomersView from '../views/CustomersView.vue'
import ProductsView from '../views/ProductsView.vue'
import TaxesView from '../views/TaxesView.vue'
import SalesView from '../views/SalesView.vue'
import InvoicesView from '../views/InvoicesView.vue'

const routes = [
  {
    path: '/',
    name: 'login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/business-settings',
    name: 'business-settings',
    component: BusinessSettingsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/customers',
    name: 'customers',
    component: CustomersView,
    meta: { requiresAuth: true }
  },
  {
    path: '/products',
    name: 'products',
    component: ProductsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/taxes',
    name: 'taxes',
    component: TaxesView,
    meta: { requiresAuth: true }
  },
  {
    path: '/sales',
    name: 'sales',
    component: SalesView,
    meta: { requiresAuth: true }
  },
  {
    path: '/invoices',
    name: 'invoices',
    component: InvoicesView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 認証が必要なページに未認証でアクセスした場合
    next('/')
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    // 認証済みでログインページにアクセスした場合
    next('/dashboard')
  } else if (to.meta.requiresAuth && authStore.isAuthenticated) {
    // 認証済みでダッシュボードにアクセスする場合、事業者設定の確認
    if (to.name === 'dashboard') {
      try {
        // 設定ストアを動的にインポート
        const { useSettingsStore } = await import('../stores/settings')
        const settingsStore = useSettingsStore()
        
        // 設定の初期化
        await settingsStore.initializeSettings()
        
        // 事業者設定が存在しない場合は設定画面にリダイレクト
        if (!settingsStore.hasBusinessSettings) {
          next('/business-settings')
          return
        }
      } catch (err) {
        console.error('Failed to check business settings:', err)
        // エラーの場合はダッシュボードに進む
      }
    }
    next()
  } else {
    next()
  }
})

export default router 