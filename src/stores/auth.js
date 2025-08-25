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
  
  // App folder configuration
  const APP_FOLDER_NAME = import.meta.env.VITE_APP_FOLDER_NAME || 'Invoicy'
  
  // Sub folders to create in the app folder
  const SUB_FOLDERS = [
    'masters',
    'sales'
  ]
  
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
      
      // ローカルストレージからフォルダIDを削除
      localStorage.removeItem('invoicy_app_folder_id')
      
      // サブフォルダIDを削除
      for (const folderName of SUB_FOLDERS) {
        localStorage.removeItem(`invoicy_${folderName}_folder_id`)
      }
      
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
      
      // まず既存のフォルダを検索
      console.log('🔍 Searching for existing app folder...')
      const searchQuery = `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (searchResponse.ok) {
        const searchResult = await searchResponse.json()
        console.log('📄 Search result:', searchResult)
        
        if (searchResult.files && searchResult.files.length > 0) {
          const existingFolder = searchResult.files[0]
          console.log('✅ Found existing app folder:', existingFolder.id)
          
          // ローカルストレージに保存
          localStorage.setItem('invoicy_app_folder_id', existingFolder.id)
          console.log('💾 Existing folder ID saved to localStorage')
          
          // サブフォルダの確認・作成
          await ensureSubFolders(token, existingFolder.id)
          
          return existingFolder
        }
      }
      
      // ローカルストレージからフォルダIDを確認
      const savedFolderId = localStorage.getItem('invoicy_app_folder_id')
      
      if (savedFolderId) {
        console.log('🔍 Verifying saved folder ID:', savedFolderId)
        
        // 保存されたフォルダIDの存在確認
        const verifyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${savedFolderId}?fields=id,name,trashed`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (verifyResponse.ok) {
          const folderInfo = await verifyResponse.json()
          if (!folderInfo.trashed && folderInfo.name === APP_FOLDER_NAME) {
            console.log('✅ Saved folder ID is valid:', savedFolderId)
            
            // サブフォルダの確認・作成
            await ensureSubFolders(token, savedFolderId)
            
            return { id: savedFolderId }
          } else {
            console.log('⚠️ Saved folder is trashed or has wrong name, removing from localStorage')
            localStorage.removeItem('invoicy_app_folder_id')
          }
        } else {
          console.log('⚠️ Saved folder ID is invalid, removing from localStorage')
          localStorage.removeItem('invoicy_app_folder_id')
        }
      }
      
      // フォルダIDがない場合または無効な場合は新規作成
      console.log('📁 Creating new app folder...')
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
      
      // フォルダIDをローカルストレージに保存
      localStorage.setItem('invoicy_app_folder_id', newFolder.id)
      console.log('💾 Folder ID saved to localStorage')
      
      // サブフォルダの作成
      await ensureSubFolders(token, newFolder.id)
      
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
  
  // サブフォルダの確認・作成
  const ensureSubFolders = async (token, parentFolderId) => {
    try {
      console.log('🔍 Checking sub folders...')
      console.log('📁 Parent folder ID:', parentFolderId)
      console.log('📋 Sub folders to create:', SUB_FOLDERS)
      
      for (const folderName of SUB_FOLDERS) {
        await ensureSingleSubFolder(token, parentFolderId, folderName)
      }
      
      console.log('✅ All sub folders ensured')
      
    } catch (err) {
      console.error('❌ Failed to ensure sub folders:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      throw err
    }
  }
  
  // 単一のサブフォルダの確認・作成
  const ensureSingleSubFolder = async (token, parentFolderId, folderName) => {
    try {
      console.log(`🔍 Checking ${folderName} folder...`)
      
      // 既存のフォルダを検索
      const searchQuery = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`
      const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (searchResponse.ok) {
        const searchResult = await searchResponse.json()
        console.log(`📄 ${folderName} folder search result:`, searchResult)
        
        if (searchResult.files && searchResult.files.length > 0) {
          const existingFolder = searchResult.files[0]
          console.log(`✅ Found existing ${folderName} folder:`, existingFolder.id)
          
          // ローカルストレージに保存
          localStorage.setItem(`invoicy_${folderName}_folder_id`, existingFolder.id)
          console.log(`💾 ${folderName} folder ID saved to localStorage`)
          
          return existingFolder
        }
      }
      
      // ローカルストレージからフォルダIDを確認
      const savedFolderId = localStorage.getItem(`invoicy_${folderName}_folder_id`)
      
      if (savedFolderId) {
        console.log(`🔍 Verifying saved ${folderName} folder ID:`, savedFolderId)
        
        // 保存されたフォルダIDの存在確認
        const verifyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${savedFolderId}?fields=id,name,trashed`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (verifyResponse.ok) {
          const folderInfo = await verifyResponse.json()
          if (!folderInfo.trashed && folderInfo.name === folderName) {
            console.log(`✅ Saved ${folderName} folder ID is valid:`, savedFolderId)
            return { id: savedFolderId }
          } else {
            console.log(`⚠️ Saved ${folderName} folder is trashed or has wrong name, removing from localStorage`)
            localStorage.removeItem(`invoicy_${folderName}_folder_id`)
          }
        } else {
          console.log(`⚠️ Saved ${folderName} folder ID is invalid, removing from localStorage`)
          localStorage.removeItem(`invoicy_${folderName}_folder_id`)
        }
      }
      
      // フォルダがない場合は新規作成
      console.log(`📁 Creating new ${folderName} folder...`)
      const createPayload = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId]
      }
      console.log(`📦 ${folderName} folder create payload:`, createPayload)
      
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createPayload)
      })
      
      console.log(`📡 ${folderName} folder create response status:`, createResponse.status)
      console.log(`📡 ${folderName} folder create response ok:`, createResponse.ok)
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error(`❌ ${folderName} folder create response error:`, {
          status: createResponse.status,
          statusText: createResponse.statusText,
          errorText: errorText
        })
        throw new Error(`${folderName}フォルダの作成に失敗しました: ${createResponse.status} ${createResponse.statusText}`)
      }
      
      const newFolder = await createResponse.json()
      console.log(`✅ ${folderName} folder created:`, newFolder.id)
      console.log(`📄 ${folderName} folder create response data:`, newFolder)
      
      // フォルダIDをローカルストレージに保存
      localStorage.setItem(`invoicy_${folderName}_folder_id`, newFolder.id)
      console.log(`💾 ${folderName} folder ID saved to localStorage`)
      
      return newFolder
      
    } catch (err) {
      console.error(`❌ Failed to ensure ${folderName} folder:`, {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      throw err
    }
  }
  
  // アプリフォルダIDの取得（ローカルストレージから取得し、必要に応じて検証）
  const getAppFolderId = async () => {
    const token = getAccessToken()
    if (!token) {
      throw new Error('認証トークンがありません')
    }
    
    // ローカルストレージからフォルダIDを取得
    const savedFolderId = localStorage.getItem('invoicy_app_folder_id')
    
    if (!savedFolderId) {
      throw new Error('アプリフォルダIDが保存されていません。ログインしてください。')
    }
    
    // フォルダIDの有効性を検証
    try {
      const verifyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${savedFolderId}?fields=id,name,trashed`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (verifyResponse.ok) {
        const folderInfo = await verifyResponse.json()
        if (!folderInfo.trashed && folderInfo.name === APP_FOLDER_NAME) {
          console.log('✅ Using saved folder ID:', savedFolderId)
          return { id: savedFolderId }
        } else {
          console.log('⚠️ Saved folder is trashed or has wrong name')
          localStorage.removeItem('invoicy_app_folder_id')
          throw new Error('保存されたフォルダが無効です。ログインしてください。')
        }
      } else {
        console.log('⚠️ Saved folder ID is invalid')
        localStorage.removeItem('invoicy_app_folder_id')
        throw new Error('保存されたフォルダが見つかりません。ログインしてください。')
      }
    } catch (err) {
      console.error('Failed to verify folder ID:', err)
      localStorage.removeItem('invoicy_app_folder_id')
      throw new Error('フォルダの検証に失敗しました。ログインしてください。')
    }
  }
  
  // サブフォルダIDの取得（ローカルストレージから取得し、必要に応じて検証）
  const getSubFolderId = async (folderName) => {
    const token = getAccessToken()
    if (!token) {
      throw new Error('認証トークンがありません')
    }
    
    // フォルダ名の検証
    if (!SUB_FOLDERS.includes(folderName)) {
      throw new Error(`無効なフォルダ名です: ${folderName}`)
    }
    
    // ローカルストレージからフォルダIDを取得
    const savedFolderId = localStorage.getItem(`invoicy_${folderName}_folder_id`)
    
    if (!savedFolderId) {
      throw new Error(`${folderName}フォルダIDが保存されていません。ログインしてください。`)
    }
    
    // フォルダIDの有効性を検証
    try {
      const verifyResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${savedFolderId}?fields=id,name,trashed`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (verifyResponse.ok) {
        const folderInfo = await verifyResponse.json()
        if (!folderInfo.trashed && folderInfo.name === folderName) {
          console.log(`✅ Using saved ${folderName} folder ID:`, savedFolderId)
          return { id: savedFolderId }
        } else {
          console.log(`⚠️ Saved ${folderName} folder is trashed or has wrong name`)
          localStorage.removeItem(`invoicy_${folderName}_folder_id`)
          throw new Error(`保存された${folderName}フォルダが無効です。ログインしてください。`)
        }
      } else {
        console.log(`⚠️ Saved ${folderName} folder ID is invalid`)
        localStorage.removeItem(`invoicy_${folderName}_folder_id`)
        throw new Error(`保存された${folderName}フォルダが見つかりません。ログインしてください。`)
      }
    } catch (err) {
      console.error(`Failed to verify ${folderName} folder ID:`, err)
      localStorage.removeItem(`invoicy_${folderName}_folder_id`)
      throw new Error(`${folderName}フォルダの検証に失敗しました。ログインしてください。`)
    }
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
    getAppFolderId,
    getSubFolderId
  }
}) 