import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { APP_CONFIG, STORAGE_KEYS, getSubFolderStorageKey } from '../config/api.js'
import { googleApiClient } from '../services/googleApi.js'
import { useStorage } from '../composables/useStorage.js'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const isAuthenticated = ref(false)
  const isLoading = ref(false)
  const error = ref(null)
  
  // フォルダ作成処理の排他制御用フラグ
  const isCreatingAppFolder = ref(false)
  
  // Google Identity Services client
  let tokenClient = null
  
  // Configuration
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-client-id-here'
  const SCOPES = googleApiClient.getScopes()
  
  // App folder configuration
  const APP_FOLDER_NAME = APP_CONFIG.FOLDER_NAME
  
  // Sub folders to create in the app folder
  const SUB_FOLDERS = APP_CONFIG.SUB_FOLDERS
  
  // Computed
  const userEmail = computed(() => user.value?.email || '')
  const userName = computed(() => user.value?.name || '')
  
  // Local storage utilities
  const { saveToLocalStorage, loadFromLocalStorage, clearAppData } = useStorage()
  
  // 容量情報の計算ヘルパー関数
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  const getStorageInfo = (storageQuota) => {
    if (!storageQuota) return null
    
    const limit = parseInt(storageQuota.limit) || 0
    const usage = parseInt(storageQuota.usage) || 0
    const remaining = limit - usage
    const usageRate = limit > 0 ? (usage / limit) * 100 : 0
    
    return {
      limit: limit,
      usage: usage,
      remaining: remaining,
      usageRate: usageRate,
      limitFormatted: formatBytes(limit),
      usageFormatted: formatBytes(usage),
      remainingFormatted: formatBytes(remaining),
      isNearLimit: usageRate > 80,
      isOverLimit: usageRate >= 100
    }
  }
  
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
          // ローカルストレージからユーザー情報を確認
          const cachedUserInfo = loadFromLocalStorage(STORAGE_KEYS.USER_INFO)
          if (cachedUserInfo) {
            console.log('✅ Using cached user info from localStorage')
            user.value = cachedUserInfo
            isAuthenticated.value = true
            error.value = null
          } else {
            console.log('📡 Fetching user info from API')
            await fetchUserInfo(token)
          }
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
      
      const url = googleApiClient.getTokenInfoUrl(token)
      const response = await fetch(url)
      
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
      
      // ユーザー情報を取得
      const userInfoResponse = await googleApiClient.makeAuthenticatedRequest(googleApiClient.getUserInfoUrl(), token)
      
      // Drive容量情報を取得（失敗してもアプリは動作する）
      let driveInfo = null
      try {
        const driveInfoResponse = await googleApiClient.makeAuthenticatedRequest(googleApiClient.getDriveAboutUrl(), token)
        if (driveInfoResponse.ok) {
          driveInfo = await driveInfoResponse.json()
          console.log('📄 Drive info response data:', driveInfo)
        } else {
          console.warn('⚠️ Drive info response failed:', driveInfoResponse.status, driveInfoResponse.statusText)
        }
      } catch (driveError) {
        console.warn('⚠️ Drive info fetch failed:', driveError.message)
      }
      
      console.log('📡 User info response status:', userInfoResponse.status)
      console.log('📡 User info response ok:', userInfoResponse.ok)
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json()
        console.log('📄 User info response data:', userInfo)
        
        // 容量情報の計算（取得できた場合のみ）
        let storageQuota = null
        if (driveInfo && driveInfo.storageQuota) {
          const quota = driveInfo.storageQuota
          const limit = parseInt(quota.limit) || 0
          const usage = parseInt(quota.usage) || 0
          const usageInDrive = parseInt(quota.usageInDrive) || 0
          const usageInDriveTrash = parseInt(quota.usageInDriveTrash) || 0
          const remaining = limit - usage
          
          storageQuota = {
            limit: limit,
            usage: usage,
            usage_in_drive: usageInDrive,
            usage_in_drive_trash: usageInDriveTrash,
            remaining: remaining,
            usage_rate: limit > 0 ? (usage / limit) * 100 : 0
          }
        }
        
        // 必要な情報のみを抽出
        const essentialUserInfo = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          given_name: userInfo.given_name,
          family_name: userInfo.family_name,
          // 容量情報（取得できた場合のみ）
          ...(storageQuota && { storage_quota: storageQuota })
        }
        
        user.value = essentialUserInfo
        isAuthenticated.value = true
        error.value = null
        
        // ローカルストレージに保存
        saveToLocalStorage(STORAGE_KEYS.USER_INFO, essentialUserInfo)
        
        console.log('✅ User info set successfully and cached')
        if (storageQuota) {
          console.log('💾 Storage quota info:', storageQuota)
        } else {
          console.log('⚠️ Storage quota info not available')
        }
      } else {
        const userErrorText = await userInfoResponse.text()
        console.error('❌ User info response error:', {
          status: userInfoResponse.status,
          statusText: userInfoResponse.statusText,
          errorText: userErrorText
        })
        throw new Error(`ユーザー情報の取得に失敗しました: ${userInfoResponse.status} ${userInfoResponse.statusText}`)
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
      
      // アプリフォルダの確認・作成
      try {
        console.log('📁 Ensuring app folder...')
        await ensureAppFolder(access_token)
        console.log('✅ App folder ensured')
      } catch (folderError) {
        console.error('❌ App folder creation failed:', {
          message: folderError.message,
          stack: folderError.stack,
          name: folderError.name
        })
        // アプリフォルダ作成の失敗は認証を妨げないが、ログには記録
        // 設定ストアの初期化時に再試行される
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
  
  const signOut = async () => {
    try {
      // セッションストレージからトークンを削除
      sessionStorage.removeItem('google_access_token')
      
      // ローカルストレージからフォルダIDを削除
      localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
      
      // サブフォルダIDを削除
      for (const folderName of SUB_FOLDERS) {
        localStorage.removeItem(getSubFolderStorageKey(folderName))
      }
      
      // アプリデータをローカルストレージから削除
      clearAppData()
      
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
      
      // 設定ストアもリセット
      try {
        const { useSettingsStore } = await import('./setting.js')
        const settingsStore = useSettingsStore()
        settingsStore.resetSettings()
      } catch (err) {
        console.log('Settings store reset failed (may not be initialized):', err)
      }
      
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }
  
  const getAccessToken = () => {
    return sessionStorage.getItem('google_access_token')
  }
  
  // アプリフォルダの確認・作成
  const ensureAppFolder = async (token) => {
    // 既にフォルダ作成処理中の場合は待機
    if (isCreatingAppFolder.value) {
      console.log('⏳ App folder creation already in progress, waiting...')
      // 作成処理が完了するまで待機
      while (isCreatingAppFolder.value) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      // 作成完了後、ローカルストレージからフォルダIDを取得
      const savedFolderId = localStorage.getItem(STORAGE_KEYS.APP_FOLDER_ID)
      if (savedFolderId) {
        return { id: savedFolderId }
      }
    }
    
    // フォルダ作成処理を開始
    isCreatingAppFolder.value = true
    
    try {
      console.log('🔍 Checking app folder...')
      console.log('📋 App folder name:', APP_FOLDER_NAME)
      console.log('🔑 Token available:', !!token)
      
      // まず既存のフォルダを検索
      console.log('🔍 Searching for existing app folder...')
      const searchQuery = `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      const searchResult = await googleApiClient.searchFiles(token, searchQuery, 'files(id,name)')
      console.log('📄 Search result:', searchResult)
      
      if (searchResult.files && searchResult.files.length > 0) {
        // 複数のフォルダが見つかった場合は最初のものを使用
        if (searchResult.files.length > 1) {
          console.log(`⚠️ Found ${searchResult.files.length} app folders, using the first one`)
        }
        const existingFolder = searchResult.files[0]
        console.log('✅ Found existing app folder:', existingFolder.id)
        
        // ローカルストレージに保存
        localStorage.setItem(STORAGE_KEYS.APP_FOLDER_ID, existingFolder.id)
        console.log('💾 Existing folder ID saved to localStorage')
        
        // サブフォルダの確認・作成
        await ensureSubFolders(token, existingFolder.id)
        
        // フォルダ作成処理完了
        isCreatingAppFolder.value = false
        return existingFolder
      }
      
      // ローカルストレージからフォルダIDを確認
      const savedFolderId = localStorage.getItem(STORAGE_KEYS.APP_FOLDER_ID)
      
      if (savedFolderId) {
        console.log('🔍 Verifying saved folder ID:', savedFolderId)
        
        // 保存されたフォルダIDの存在確認
        const url = googleApiClient.getDriveFileUrl(savedFolderId, { fields: 'id,name,trashed' })
        const verifyResponse = await googleApiClient.makeAuthenticatedRequest(url, token)
        
        if (verifyResponse.ok) {
          const folderInfo = await verifyResponse.json()
          if (!folderInfo.trashed && folderInfo.name === APP_FOLDER_NAME) {
            console.log('✅ Saved folder ID is valid:', savedFolderId)
            
            // サブフォルダの確認・作成
            await ensureSubFolders(token, savedFolderId)
            
            // フォルダ作成処理完了
            isCreatingAppFolder.value = false
            return { id: savedFolderId }
          } else {
            console.log('⚠️ Saved folder is trashed or has wrong name, removing from localStorage')
            localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
          }
        } else {
          console.log('⚠️ Saved folder ID is invalid, removing from localStorage')
          localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
        }
      }
      
      // フォルダIDがない場合または無効な場合は新規作成
      console.log('📁 Creating new app folder...')
      const newFolder = await googleApiClient.createFolder(token, APP_FOLDER_NAME)
      console.log('✅ App folder created:', newFolder.id)
      console.log('📄 Create response data:', newFolder)
      
      // フォルダIDをローカルストレージに保存
      localStorage.setItem(STORAGE_KEYS.APP_FOLDER_ID, newFolder.id)
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
    } finally {
      // フォルダ作成処理完了
      isCreatingAppFolder.value = false
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
      const searchResult = await googleApiClient.searchFolder(token, folderName, parentFolderId)
      console.log(`📄 ${folderName} folder search result:`, searchResult)
      
      if (searchResult.files && searchResult.files.length > 0) {
        const existingFolder = searchResult.files[0]
        console.log(`✅ Found existing ${folderName} folder:`, existingFolder.id)
        
        // ローカルストレージに保存
        localStorage.setItem(getSubFolderStorageKey(folderName), existingFolder.id)
        console.log(`💾 ${folderName} folder ID saved to localStorage`)
        
        return existingFolder
      }
      
      // ローカルストレージからフォルダIDを確認
      const savedFolderId = localStorage.getItem(getSubFolderStorageKey(folderName))
      
      if (savedFolderId) {
        console.log(`🔍 Verifying saved ${folderName} folder ID:`, savedFolderId)
        
        // 保存されたフォルダIDの存在確認
        const url = googleApiClient.getDriveFileUrl(savedFolderId, { fields: 'id,name,trashed' })
        const verifyResponse = await googleApiClient.makeAuthenticatedRequest(url, token)
        
        if (verifyResponse.ok) {
          const folderInfo = await verifyResponse.json()
          if (!folderInfo.trashed && folderInfo.name === folderName) {
            console.log(`✅ Saved ${folderName} folder ID is valid:`, savedFolderId)
            return { id: savedFolderId }
          } else {
            console.log(`⚠️ Saved ${folderName} folder is trashed or has wrong name, removing from localStorage`)
            localStorage.removeItem(getSubFolderStorageKey(folderName))
          }
        } else {
          console.log(`⚠️ Saved ${folderName} folder ID is invalid, removing from localStorage`)
          localStorage.removeItem(getSubFolderStorageKey(folderName))
        }
      }
      
      // フォルダがない場合は新規作成
      console.log(`📁 Creating new ${folderName} folder...`)
      const newFolder = await googleApiClient.createFolder(token, folderName, parentFolderId)
      console.log(`✅ ${folderName} folder created:`, newFolder.id)
      console.log(`📄 ${folderName} folder create response data:`, newFolder)
      
      // フォルダIDをローカルストレージに保存
      localStorage.setItem(getSubFolderStorageKey(folderName), newFolder.id)
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
  const getAppFolderId = async (retryCount = 0) => {
    const token = getAccessToken()
    if (!token) {
      throw new Error('認証トークンがありません')
    }
    
    // ローカルストレージからフォルダIDを取得
    const savedFolderId = localStorage.getItem(STORAGE_KEYS.APP_FOLDER_ID)
    
    if (!savedFolderId) {
      // フォルダIDが保存されていない場合、1回だけ再作成を試みる
      if (retryCount === 0) {
        console.log('⚠️ App folder ID not found, attempting to recreate...')
        try {
          const appFolder = await ensureAppFolder(token)
          return appFolder
        } catch (ensureErr) {
          console.error('Failed to ensure app folder:', ensureErr)
          throw new Error('アプリフォルダIDが保存されていません。ログインしてください。')
        }
      }
      throw new Error('アプリフォルダIDが保存されていません。ログインしてください。')
    }
    
    // フォルダIDの有効性を検証
    try {
      const url = googleApiClient.getDriveFileUrl(savedFolderId, { fields: 'id,name,trashed' })
      const verifyResponse = await googleApiClient.makeAuthenticatedRequest(url, token)
      
      if (verifyResponse.ok) {
        const folderInfo = await verifyResponse.json()
        if (!folderInfo.trashed && folderInfo.name === APP_FOLDER_NAME) {
          console.log('✅ Using saved folder ID:', savedFolderId)
          return { id: savedFolderId }
        } else {
          console.log('⚠️ Saved folder is trashed or has wrong name')
          localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
          // 1回だけ再作成を試みる
          if (retryCount === 0) {
            try {
              const appFolder = await ensureAppFolder(token)
              return appFolder
            } catch (ensureErr) {
              console.error('Failed to ensure app folder:', ensureErr)
              throw new Error('保存されたフォルダが無効です。ログインしてください。')
            }
          }
          throw new Error('保存されたフォルダが無効です。ログインしてください。')
        }
      } else {
        console.log('⚠️ Saved folder ID is invalid')
        localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
        // 1回だけ再作成を試みる
        if (retryCount === 0) {
          try {
            const appFolder = await ensureAppFolder(token)
            return appFolder
          } catch (ensureErr) {
            console.error('Failed to ensure app folder:', ensureErr)
            throw new Error('保存されたフォルダが見つかりません。ログインしてください。')
          }
        }
        throw new Error('保存されたフォルダが見つかりません。ログインしてください。')
      }
    } catch (err) {
      console.error('Failed to verify folder ID:', err)
      localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
      // 1回だけ再作成を試みる
      if (retryCount === 0) {
        try {
          const appFolder = await ensureAppFolder(token)
          return appFolder
        } catch (ensureErr) {
          console.error('Failed to ensure app folder:', ensureErr)
          throw new Error('フォルダの検証に失敗しました。ログインしてください。')
        }
      }
      throw new Error('フォルダの検証に失敗しました。ログインしてください。')
    }
  }
  
  // サブフォルダIDの取得（ローカルストレージから取得し、必要に応じて検証）
  const getSubFolderId = async (folderName, retryCount = 0) => {
    const token = getAccessToken()
    if (!token) {
      throw new Error('認証トークンがありません')
    }
    
    // フォルダ名の検証
    if (!SUB_FOLDERS.includes(folderName)) {
      throw new Error(`無効なフォルダ名です: ${folderName}`)
    }
    
    console.log(`🔍 Getting ${folderName} folder ID...`)
    console.log(`📋 Available sub folders:`, SUB_FOLDERS)
    
    // ローカルストレージからフォルダIDを取得
    const storageKey = getSubFolderStorageKey(folderName)
    const savedFolderId = localStorage.getItem(storageKey)
    
    console.log(`💾 Storage key: ${storageKey}`)
    console.log(`💾 Saved folder ID: ${savedFolderId}`)
    
    if (!savedFolderId) {
      console.log(`❌ ${folderName} folder ID not found in localStorage`)
      // 1回だけ再作成を試みる
      if (retryCount === 0) {
        try {
          // ensureAppFolderを直接呼び出す（getAppFolderIdを経由しない）
          const appFolder = await ensureAppFolder(token)
          // サブフォルダを確保
          await ensureSubFolders(token, appFolder.id)
          // 再取得を試みる
          const recreatedFolderId = localStorage.getItem(storageKey)
          if (recreatedFolderId) {
            return { id: recreatedFolderId }
          }
        } catch (ensureErr) {
          console.error(`Failed to ensure ${folderName} folder:`, ensureErr)
        }
      }
      throw new Error(`${folderName}フォルダIDが保存されていません。ログインしてください。`)
    }
    
    // フォルダIDの有効性を検証
    try {
      console.log(`🔍 Verifying ${folderName} folder ID: ${savedFolderId}`)
      const url = googleApiClient.getDriveFileUrl(savedFolderId, { fields: 'id,name,trashed' })
      console.log(`📡 Verification URL: ${url}`)
      
      const verifyResponse = await googleApiClient.makeAuthenticatedRequest(url, token)
      console.log(`📡 Verification response status: ${verifyResponse.status}`)
      
      if (verifyResponse.ok) {
        const folderInfo = await verifyResponse.json()
        console.log(`📄 Folder info:`, folderInfo)
        
        if (!folderInfo.trashed && folderInfo.name === folderName) {
          console.log(`✅ Using saved ${folderName} folder ID:`, savedFolderId)
          return { id: savedFolderId }
        } else {
          console.log(`⚠️ Saved ${folderName} folder is trashed or has wrong name`)
          console.log(`📄 Expected name: ${folderName}, actual name: ${folderInfo.name}`)
          console.log(`📄 Trashed: ${folderInfo.trashed}`)
          localStorage.removeItem(getSubFolderStorageKey(folderName))
          // 1回だけ再作成を試みる
          if (retryCount === 0) {
            try {
              // ensureAppFolderを直接呼び出す（getAppFolderIdを経由しない）
              const appFolder = await ensureAppFolder(token)
              // サブフォルダを確保
              await ensureSubFolders(token, appFolder.id)
              // 再取得を試みる
              const recreatedFolderId = localStorage.getItem(storageKey)
              if (recreatedFolderId) {
                return { id: recreatedFolderId }
              }
            } catch (ensureErr) {
              console.error(`Failed to ensure ${folderName} folder:`, ensureErr)
            }
          }
          throw new Error(`保存された${folderName}フォルダが無効です。ログインしてください。`)
        }
      } else {
        console.log(`⚠️ Saved ${folderName} folder ID is invalid`)
        const errorText = await verifyResponse.text()
        console.log(`📄 Error response:`, errorText)
        localStorage.removeItem(getSubFolderStorageKey(folderName))
        // 1回だけ再作成を試みる
        if (retryCount === 0) {
          try {
            // ensureAppFolderを直接呼び出す（getAppFolderIdを経由しない）
            const appFolder = await ensureAppFolder(token)
            // サブフォルダを確保
            await ensureSubFolders(token, appFolder.id)
            // 再取得を試みる
            const recreatedFolderId = localStorage.getItem(storageKey)
            if (recreatedFolderId) {
              return { id: recreatedFolderId }
            }
          } catch (ensureErr) {
            console.error(`Failed to ensure ${folderName} folder:`, ensureErr)
          }
        }
        throw new Error(`保存された${folderName}フォルダが見つかりません。ログインしてください。`)
      }
    } catch (err) {
      console.error(`Failed to verify ${folderName} folder ID:`, err)
      localStorage.removeItem(getSubFolderStorageKey(folderName))
      // 1回だけ再作成を試みる
      if (retryCount === 0) {
        try {
          // ensureAppFolderを直接呼び出す（getAppFolderIdを経由しない）
          const appFolder = await ensureAppFolder(token)
          // サブフォルダを確保
          await ensureSubFolders(token, appFolder.id)
          // 再取得を試みる
          const recreatedFolderId = localStorage.getItem(storageKey)
          if (recreatedFolderId) {
            return { id: recreatedFolderId }
          }
        } catch (ensureErr) {
          console.error(`Failed to ensure ${folderName} folder:`, ensureErr)
        }
      }
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
    getSubFolderId,
    
    // Storage utilities
    formatBytes,
    getStorageInfo,
    
    // Local storage utilities (for backward compatibility)
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage: clearAppData,
    STORAGE_KEYS
  }
}) 