<template>
  <div class="app-layout" :class="{ 'menu-open': isMenuOpen }">
    <!-- ヘッダー -->
    <header class="header">
      <div class="container">
        <div class="header-content">
          <div class="title-section">
            <img 
              v-if="authStore.user?.picture" 
              :src="authStore.user.picture" 
              :alt="authStore.userName"
              class="user-avatar"
              @click="openMenu"
            />
            <div v-else class="user-avatar-placeholder" @click="openMenu">
              {{ authStore.userName?.charAt(0) || 'U' }}
            </div>
            <img 
              src="../assets/invoicy-title-logo.png" 
              alt="Invoicy" 
              class="logo-image"
              @click="goToDashboard"
            />
          </div>
        </div>
      </div>
    </header>
    
    <!-- メインコンテンツ -->
    <main class="main">
      <div class="container">
        <slot></slot>
      </div>
    </main>
    
    <!-- スライドメニュー -->
    <SlideMenu 
      :is-open="isMenuOpen" 
      @close="closeMenu" 
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import SlideMenu from './SlideMenu.vue'

const router = useRouter()
const authStore = useAuthStore()
const isMenuOpen = ref(false)

// メニュー制御関数
const openMenu = () => {
  isMenuOpen.value = true
}

const closeMenu = () => {
  isMenuOpen.value = false
}

// ダッシュボードにリダイレクト
const goToDashboard = () => {
  router.push('/dashboard')
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 1rem 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e0e0;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.user-avatar:hover {
  transform: scale(1.05);
}

.user-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #4285f4;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
  border: 2px solid #e0e0e0;
}

.user-avatar-placeholder:hover {
  transform: scale(1.05);
}

.logo-image {
  height: 2.0rem;
  width: auto;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.logo-image:hover {
  transform: scale(1.05);
}

.header h1 {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.main {
  padding: 6rem 0 2rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
    justify-content: flex-start;
    align-items: flex-start;
  }
  
  .title-section {
    align-items: center;
  }
  
  .user-avatar,
  .user-avatar-placeholder {
    width: 32px;
    height: 32px;
  }
  
  .logo-image {
    height: 1.7rem;
  }
}
</style>
