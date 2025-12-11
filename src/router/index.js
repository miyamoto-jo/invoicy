import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Views
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
import BusinessSettingsView from '../views/BusinessSettingsView.vue'
import CustomersView from '../views/CustomersView.vue'
import CustomerCreateView from '../views/CustomerCreateView.vue'
import CustomerBulkCreateView from '../views/CustomerBulkCreateView.vue'
import ProductsView from '../views/ProductsView.vue'
import TaxesView from '../views/TaxesView.vue'
import SalesView from '../views/SalesView.vue'
import SalesListView from '../views/SalesListView.vue'
import SalesAnalyticsView from '../views/SalesAnalyticsView.vue'
import InvoicesView from '../views/InvoicesView.vue'
import InvoiceAnalyticsView from '../views/InvoiceAnalyticsView.vue'
import DataDeletionView from '../views/DataDeletionView.vue'

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
    path: '/customers/create',
    name: 'customer-create',
    component: CustomerCreateView,
    meta: { requiresAuth: true }
  },
  {
    path: '/customers/edit/:id',
    name: 'customer-edit',
    component: CustomerCreateView,
    meta: { requiresAuth: true }
  },
  {
    path: '/customers/bulk-create',
    name: 'customer-bulk-create',
    component: CustomerBulkCreateView,
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
    path: '/sales/list',
    name: 'sales-list',
    component: SalesListView,
    meta: { requiresAuth: true }
  },
  {
    path: '/sales/analytics',
    name: 'sales-analytics',
    component: SalesAnalyticsView,
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
  },
  {
    path: '/invoices/analytics',
    name: 'invoice-analytics',
    component: InvoiceAnalyticsView,
    meta: { requiresAuth: true }
  },
  {
    path: '/data-deletion',
    name: 'data-deletion',
    component: DataDeletionView,
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
  } else {
    // その他の場合は通常通り進む
    next()
  }
})

export default router 