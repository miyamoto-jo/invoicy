<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  // アプリケーション起動時に認証状態をチェック
  authStore.initializeAuth()
})

// 認証状態の変更を監視
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated && router.currentRoute.value.name === 'login') {
    // 認証済みでログインページにいる場合、ダッシュボードにリダイレクト
    router.push('/dashboard')
  }
})
</script> 