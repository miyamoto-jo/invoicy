import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const error = ref(null)
  
  // Google Identity Services client
  let tokenClient = null
  
  // Configuration
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-client-id-here'
  const SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/drive.file'
  ].join(' ')
  
  // Computed
  const userEmail = computed(() => user.value?.email || '')
  const userName = computed(() => user.value?.name || '')
  
  // Actions
  const initializeAuth = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      // Google Identity Servicesの初期化
      await initializeGoogleIdentity()
      
      // 既存のトークンをチェック
      await checkExistingToken()
      
    } catch (err) {
      console.error('Auth initialization failed:', err)
      error.value = '認証の初期化に失敗しました'
    } finally {
      isLoading.value = false
    }
  }
  
  const initializeGoogleIdentity = () => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.accounts) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: handleTokenResponse,
          error_callback: (error) => {
            console.error('Token client error:', error)
            reject(new Error('トークンの取得に失敗しました'))
          }
        })
        resolve()
      } else {
        // Google Identity Servicesが読み込まれていない場合
        const checkGoogle = setInterval(() => {
          if (window.google && window.google.accounts) {
            clearInterval(checkGoogle)
            initializeGoogleIdentity().then(resolve).catch(reject)
          }
        }, 100)
        
        // タイムアウト設定
        setTimeout(() => {
          clearInterval(checkGoogle)
          reject(new Error('Google Identity Servicesの読み込みに失敗しました'))
        }, 10000)
      }
    })
  }
  
  const checkExistingToken = async () => {
    try {
      // セッションストレージからトークンを確認
      const token = sessionStorage.getItem('google_access_token')
      if (token) {
        // トークンの有効性を確認
        const isValid = await validateToken(token)
        if (isValid) {
          await fetchUserInfo(token)
          return
        }
      }
      
      // 有効なトークンがない場合は未認証状態
      isAuthenticated.value = false
      user.value = null
      
    } catch (err) {
      console.error('Token validation failed:', err)
      // エラーの場合はトークンをクリア
      sessionStorage.removeItem('google_access_token')
      isAuthenticated.value = false
      user.value = null
    }
  }
  
  const validateToken = async (token) => {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
      return response.ok
    } catch (err) {
      console.error('Token validation error:', err)
      return false
    }
  }
  
  const fetchUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const userInfo = await response.json()
        user.value = userInfo
        isAuthenticated.value = true
        error.value = null
      } else {
        throw new Error('ユーザー情報の取得に失敗しました')
      }
    } catch (err) {
      console.error('User info fetch error:', err)
      throw err
    }
  }
  
  const handleTokenResponse = async (response) => {
    try {
      if (response.error) {
        throw new Error(response.error)
      }
      
      const { access_token } = response
      
      // トークンをセッションストレージに保存
      sessionStorage.setItem('google_access_token', access_token)
      
      // ユーザー情報を取得
      await fetchUserInfo(access_token)
      
      // 認証成功後、ダッシュボードにリダイレクト
      if (typeof window !== 'undefined' && window.location) {
        window.location.hash = '#/dashboard'
      }
      
    } catch (err) {
      console.error('Token response handling error:', err)
      error.value = '認証に失敗しました'
      isAuthenticated.value = false
      user.value = null
    }
  }
  
  const signIn = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      if (!tokenClient) {
        throw new Error('Google Identity Servicesが初期化されていません')
      }
      
      // 認証リクエストを開始
      tokenClient.requestAccessToken()
      
    } catch (err) {
      console.error('Sign in error:', err)
      error.value = 'サインインに失敗しました'
    } finally {
      isLoading.value = false
    }
  }
  
  const signOut = () => {
    try {
      // セッションストレージからトークンを削除
      sessionStorage.removeItem('google_access_token')
      
      // Google Identity Servicesのサインアウト
      if (window.google && window.google.accounts) {
        window.google.accounts.oauth2.revoke(
          sessionStorage.getItem('google_access_token'),
          () => {
            console.log('Token revoked successfully')
          }
        )
      }
      
      // 状態をリセット
      user.value = null
      isAuthenticated.value = false
      error.value = null
      
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }
  
  const getAccessToken = () => {
    return sessionStorage.getItem('google_access_token')
  }
  
  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    
    // Computed
    userEmail,
    userName,
    
    // Actions
    initializeAuth,
    signIn,
    signOut,
    getAccessToken
  }
}) 