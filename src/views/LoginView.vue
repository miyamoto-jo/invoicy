<template>
  <div class="auth-container">
    <div class="auth-card">
      <!-- タイトル画像セクション -->
      <div class="title-images">
        <img 
          src="../assets/loading-cat2.png" 
          alt="Loading Cat 2" 
          class="title-image cat-image"
        />
        <img 
          src="../assets/invoicy-title-logo.png" 
          alt="Invoicy Title Logo" 
          class="title-image logo-image"
        />
        <img 
          src="../assets/loading-cat1.png" 
          alt="Loading Cat 1" 
          class="title-image cat-image"
        />
      </div>
      
      <p>Googleアカウントでログインして、請求書管理を始めましょう</p>
      
      <div v-if="authStore.error" class="error-message">
        <p>{{ authStore.error }}</p>
        <button @click="retryAuth" class="btn btn-primary">
          再試行
        </button>
      </div>
      
      <div v-else>
        <button 
          @click="handleSignIn" 
          class="btn btn-primary google-signin-btn"
          :disabled="authStore.isLoading"
        >
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Googleでサインイン
        </button>
        
        <div class="auth-info">
          <p class="info-text">
            <small>
              ※ このアプリはGoogle Driveにデータを保存します<br>
              ※ 必要な権限のみを要求します
            </small>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useLoading } from '../composables/useLoading'

const authStore = useAuthStore()
const { setLoading, clearLoading } = useLoading()

const handleSignIn = async () => {
  try {
    setLoading(true, '認証中...', 'Googleアカウントで認証しています')
    await authStore.signIn()
  } catch (err) {
    console.error('Sign in failed:', err)
  } finally {
    clearLoading()
  }
}

const retryAuth = async () => {
  try {
    setLoading(true, '認証を再試行中...', '認証情報を確認しています')
    await authStore.initializeAuth()
  } catch (err) {
    console.error('Auth retry failed:', err)
  } finally {
    clearLoading()
  }
}
</script>

<style scoped>
/* タイトル画像のスタイル */
.title-images {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  width: 100%;
}

.title-image {
  object-fit: contain;
  transition: transform 0.3s ease;
}

.title-image:hover {
  transform: scale(1.05);
}

/* PC版のスタイル */
@media (min-width: 768px) {
  .title-images {
    gap: 30px;
    margin-bottom: 40px;
  }
  
  .cat-image {
    width: 80px;
  }
  
  .logo-image {
    width: 300px;
    height: auto;
    max-height: 120px;
  }
}

/* スマホ版のスタイル */
@media (max-width: 767px) {
  .title-images {
    gap: 12px;
    margin-bottom: 25px;
  }
  
  .cat-image {
    width: 45px;
  }
  
  .logo-image {
    width: 120px;
    height: auto;
    max-height: 70px;
  }
}

/* 超小さい画面用 */
@media (max-width: 480px) {
  .title-images {
    gap: 8px;
    margin-bottom: 20px;
  }
  
  .cat-image {
    width: 50px;
    height: 50px;
  }
  
  .logo-image {
    width: 80px;
    height: auto;
    max-height: 50px;
  }
}

.google-signin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 500;
  background-color: #4285f4;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
}

.google-signin-btn:hover {
  background-color: #3367d6;
}

.google-signin-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.google-icon {
  width: 18px;
  height: 18px;
}

.error-message {
  color: #d32f2f;
  margin-bottom: 20px;
}

.error-message p {
  margin-bottom: 15px;
}

.auth-info {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.info-text {
  color: #666;
  font-size: 12px;
  line-height: 1.4;
}

.loading p {
  margin-top: 10px;
  color: #666;
}
</style> 