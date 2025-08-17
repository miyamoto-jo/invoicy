import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Views
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'
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
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    // 認証が必要なページに未認証でアクセスした場合
    next('/')
  } else if (to.name === 'login' && authStore.isAuthenticated) {
    // 認証済みでログインページにアクセスした場合
    next('/dashboard')
  } else {
    next()
  }
})

export default router 