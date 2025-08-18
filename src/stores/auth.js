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
    'https://www.googleapis.com/auth/drive'
  ].join(' ')
  
  // App folder configuration
  const APP_FOLDER_NAME = import.meta.env.VITE_APP_FOLDER_NAME || 'Invoicy'
  
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
          // アプリフォルダの確認・作成は初回ログイン時のみ行うため、ここでは実行しない
          console.log('✅ Existing token is valid, skipping app folder creation')
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
      console.log('🔍 Validating token...')
      console.log('🔑 Token available:', !!token)
      
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
      
      console.log('📡 Token validation response status:', response.status)
      console.log('📡 Token validation response ok:', response.ok)
      
      if (response.ok) {
        const tokenInfo = await response.json()
        console.log('📄 Token validation response data:', tokenInfo)
        console.log('✅ Token is valid')
        return true
      } else {
        const errorText = await response.text()
        console.error('❌ Token validation response error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        console.log('❌ Token is invalid')
        return false
      }
    } catch (err) {
      console.error('❌ Token validation error:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      console.log('❌ Token validation failed')
      return false
    }
  }
  
  const fetchUserInfo = async (token) => {
    try {
      console.log('👤 Fetching user info with token...')
      console.log('🔑 Token available:', !!token)
      
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('📡 User info response status:', response.status)
      console.log('📡 User info response ok:', response.ok)
      
      if (response.ok) {
        const userInfo = await response.json()
        console.log('📄 User info response data:', userInfo)
        user.value = userInfo
        isAuthenticated.value = true
        error.value = null
        console.log('✅ User info set successfully')
      } else {
        const errorText = await response.text()
        console.error('❌ User info response error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        throw new Error(`ユーザー情報の取得に失敗しました: ${response.status} ${response.statusText}`)
      }
    } catch (err) {
      console.error('❌ User info fetch error:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      throw err
    }
  }
  
  const handleTokenResponse = async (response) => {
    try {
      console.log('🔐 Token response received:', response)
      
      if (response.error) {
        console.error('❌ Token response contains error:', response.error)
        throw new Error(response.error)
      }
      
      const { access_token } = response
      console.log('✅ Access token received:', access_token ? 'YES' : 'NO')
      console.log('🔑 Token length:', access_token ? access_token.length : 0)
      
      // トークンをセッションストレージに保存
      sessionStorage.setItem('google_access_token', access_token)
      console.log('💾 Token saved to sessionStorage')
      
      // ユーザー情報を取得
      console.log('👤 Fetching user info...')
      await fetchUserInfo(access_token)
      console.log('✅ User info fetched, isAuthenticated:', isAuthenticated.value)
      console.log('👤 User data:', user.value)
      
      // アプリフォルダの確認・作成（エラーが発生しても認証は継続）
      try {
        console.log('📁 Ensuring app folder...')
        await ensureAppFolder(access_token)
        console.log('✅ App folder ensured')
      } catch (folderError) {
        console.warn('⚠️ App folder creation failed, but authentication continues:', {
          message: folderError.message,
          stack: folderError.stack,
          name: folderError.name
        })
        // アプリフォルダ作成の失敗は認証を妨げない
      }
      
      // 認証成功後、ダッシュボードにリダイレクト
      console.log('🔄 Redirecting to dashboard...')
      console.log('📍 Current location:', window.location.href)
      if (typeof window !== 'undefined' && window.location) {
        window.location.hash = '#/dashboard'
        console.log('✅ Redirected to:', window.location.href)
      }
      
    } catch (err) {
      console.error('❌ Token response handling error:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        response: response
      })
      error.value = `認証に失敗しました: ${err.message}`
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
  
  // アプリフォルダの確認・作成
  const ensureAppFolder = async (token) => {
    try {
      console.log('🔍 Checking app folder...')
      console.log('📋 App folder name:', APP_FOLDER_NAME)
      console.log('🔑 Token available:', !!token)
      
      // アプリフォルダを検索
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      console.log('🔗 Search URL:', searchUrl)
      
      const response = await fetch(searchUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('📡 Search response status:', response.status)
      console.log('📡 Search response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Search response error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        throw new Error(`フォルダの検索に失敗しました: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📄 Search response data:', data)
      
      if (data.files && data.files.length > 0) {
        console.log('✅ App folder found:', data.files[0].id)
        return data.files[0]
      }
      
      // アプリフォルダを作成
      console.log('📁 Creating app folder...')
      const createPayload = {
        name: APP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      }
      console.log('📦 Create payload:', createPayload)
      
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createPayload)
      })
      
      console.log('📡 Create response status:', createResponse.status)
      console.log('📡 Create response ok:', createResponse.ok)
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('❌ Create response error:', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          errorText: errorText
        })
        throw new Error(`アプリフォルダの作成に失敗しました: ${createResponse.status} ${createResponse.statusText}`)
      }
      
      const newFolder = await createResponse.json()
      console.log('✅ App folder created:', newFolder.id)
      console.log('📄 Create response data:', newFolder)
      return newFolder
      
    } catch (err) {
      console.error('❌ Failed to ensure app folder:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      throw err
    }
  }
  
  // アプリフォルダIDの取得
  const getAppFolderId = async () => {
    const token = getAccessToken()
    if (!token) {
      throw new Error('認証トークンがありません')
    }
    
    return await ensureAppFolder(token)
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
    getAccessToken,
    ensureAppFolder,
    getAppFolderId
  }
}) 