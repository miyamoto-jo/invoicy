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
            user.value = cachedUserInfo
            isAuthenticated.value = true
            error.value = null
          } else {
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
      
      const url = googleApiClient.getTokenInfoUrl(token)
      const response = await fetch(url)
      
      
      if (response.ok) {
        const tokenInfo = await response.json()
        return true
      } else {
        const errorText = await response.text()
        console.error('❌ Token validation response error:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText
        })
        return false
      }
    } catch (err) {
      console.error('❌ Token validation error:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      })
      return false
    }
  }
  
  const fetchUserInfo = async (token) => {
    try {
      
      // ユーザー情報を取得
      const userInfoResponse = await googleApiClient.makeAuthenticatedRequest(googleApiClient.getUserInfoUrl(), token)
      
      // Drive容量情報を取得（失敗してもアプリは動作する）
      let driveInfo = null
      try {
        const driveInfoResponse = await googleApiClient.makeAuthenticatedRequest(googleApiClient.getDriveAboutUrl(), token)
        if (driveInfoResponse.ok) {
          driveInfo = await driveInfoResponse.json()
        } else {
          console.warn('⚠️ Drive info response failed:', driveInfoResponse.status, driveInfoResponse.statusText)
        }
      } catch (driveError) {
        console.warn('⚠️ Drive info fetch failed:', driveError.message)
      }
      
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json()
        
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
        
        if (storageQuota) {
        } else {
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
      
      if (response.error) {
        console.error('❌ Token response contains error:', response.error)
        throw new Error(response.error)
      }
      
      const { access_token } = response
      
      // トークンをセッションストレージに保存
      sessionStorage.setItem('google_access_token', access_token)
      
      // ユーザー情報を取得
      await fetchUserInfo(access_token)
      
      // アプリフォルダの確認・作成
      try {
        await executeWithTokenRefresh(async (token) => {
          return await ensureAppFolder(token)
        })
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
      if (typeof window !== 'undefined' && window.location) {
        window.location.hash = '#/dashboard'
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
      }
      
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }
  
  const getAccessToken = () => {
    return sessionStorage.getItem('google_access_token')
  }
  
  // トークンの有効期限情報を取得
  const getTokenExpirationInfo = async () => {
    try {
      const token = getAccessToken()
      if (!token) {
        return {
          hasToken: false,
          message: 'トークンがありません'
        }
      }
      
      const url = googleApiClient.getTokenInfoUrl(token)
      const response = await fetch(url)
      
      if (!response.ok) {
        return {
          hasToken: true,
          isValid: false,
          message: 'トークンが無効です',
          error: await response.text()
        }
      }
      
      const tokenInfo = await response.json()
      
      // expires_in（秒）が含まれている場合
      if (tokenInfo.expires_in) {
        const expiresInSeconds = parseInt(tokenInfo.expires_in)
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)
        const now = new Date()
        const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000))
        const remainingMinutes = Math.floor(remainingSeconds / 60)
        const remainingHours = Math.floor(remainingMinutes / 60)
        
        return {
          hasToken: true,
          isValid: true,
          expiresIn: expiresInSeconds,
          expiresAt: expiresAt,
          remainingSeconds: remainingSeconds,
          remainingMinutes: remainingMinutes,
          remainingHours: remainingHours,
          expiresInFormatted: formatExpirationTime(remainingSeconds),
          expiresAtFormatted: expiresAt.toLocaleString('ja-JP'),
          tokenInfo: tokenInfo
        }
      }
      
      // expires_inがない場合（通常は含まれるはず）
      return {
        hasToken: true,
        isValid: true,
        message: '有効期限情報が取得できませんでした',
        tokenInfo: tokenInfo
      }
      
    } catch (err) {
      console.error('Token expiration info error:', err)
      return {
        hasToken: true,
        isValid: false,
        error: err.message
      }
    }
  }
  
  // 有効期限をフォーマットするヘルパー関数
  const formatExpirationTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}秒`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${minutes}分${secs}秒`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}時間${minutes}分`
    }
  }
  
  // 401エラーかどうかを判定するヘルパー関数
  const isTokenExpiredError = (error) => {
    if (!error) return false
    const errorMessage = error.message || error.toString()
    return errorMessage.includes('401') || 
           errorMessage.includes('UNAUTHENTICATED') ||
           errorMessage.includes('Invalid Credentials') ||
           errorMessage.includes('invalid authentication credentials')
  }
  
  // トークンをリフレッシュする関数
  const refreshAccessToken = () => {
    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        reject(new Error('Google Identity Servicesが初期化されていません'))
        return
      }
      
      
      // コールバックを一時的に保存
      const originalCallback = tokenClient.callback
      let callbackResolved = false
      
      // 一時的なコールバックを設定
      tokenClient.callback = async (response) => {
        // 既に解決済みの場合は無視（元のコールバックが呼ばれた場合）
        if (callbackResolved) {
          return
        }
        
        try {
          if (response.error) {
            console.error('❌ Token refresh failed:', response.error)
            callbackResolved = true
            // 元のコールバックを復元
            tokenClient.callback = originalCallback
            reject(new Error(`トークンのリフレッシュに失敗しました: ${response.error}`))
            return
          }
          
          const { access_token } = response
          if (access_token) {
            sessionStorage.setItem('google_access_token', access_token)
            callbackResolved = true
            // 元のコールバックを復元
            tokenClient.callback = originalCallback
            resolve(access_token)
          } else {
            callbackResolved = true
            // 元のコールバックを復元
            tokenClient.callback = originalCallback
            reject(new Error('トークンが取得できませんでした'))
          }
        } catch (err) {
          console.error('❌ Token refresh callback error:', err)
          callbackResolved = true
          // 元のコールバックを復元
          tokenClient.callback = originalCallback
          reject(err)
        }
      }
      
      // タイムアウト設定（10秒）
      const timeout = setTimeout(() => {
        if (!callbackResolved) {
          callbackResolved = true
          tokenClient.callback = originalCallback
          reject(new Error('トークンのリフレッシュがタイムアウトしました'))
        }
      }, 10000)
      
      // トークンをリクエスト
      try {
        tokenClient.requestAccessToken({ prompt: '' })
      } catch (err) {
        clearTimeout(timeout)
        callbackResolved = true
        tokenClient.callback = originalCallback
        reject(err)
      }
    })
  }
  
  // トークンを使用してAPIリクエストを実行し、401エラーの場合は自動的にリフレッシュして再試行
  const executeWithTokenRefresh = async (apiCall, retryCount = 0) => {
    const maxRetries = 1 // 最大1回までリトライ
    
    try {
      const token = getAccessToken()
      if (!token) {
        throw new Error('認証トークンがありません。ログインしてください。')
      }
      
      return await apiCall(token)
    } catch (err) {
      // 401エラーで、まだリトライしていない場合
      if (isTokenExpiredError(err) && retryCount < maxRetries) {
        
        try {
          // トークンをリフレッシュ
          const newToken = await refreshAccessToken()
          
          // 新しいトークンで再試行
          return await executeWithTokenRefresh(apiCall, retryCount + 1)
        } catch (refreshErr) {
          console.error('❌ Token refresh failed:', refreshErr)
          throw new Error('トークンのリフレッシュに失敗しました。再度ログインしてください。')
        }
      }
      
      // 401エラーだがリトライ回数を超えた場合、または401以外のエラーの場合
      throw err
    }
  }
  
  // アプリフォルダの確認・作成
  const ensureAppFolder = async (token) => {
    // 既にフォルダ作成処理中の場合は待機
    if (isCreatingAppFolder.value) {
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
      
      // まず既存のフォルダを検索（401エラー時は自動リフレッシュ）
      const searchQuery = `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      const searchResult = await executeWithTokenRefresh(async (currentToken) => {
        return await googleApiClient.searchFiles(currentToken, searchQuery, 'files(id,name)')
      })
      
      if (searchResult.files && searchResult.files.length > 0) {
        // 複数のフォルダが見つかった場合は最初のものを使用
        if (searchResult.files.length > 1) {
        }
        const existingFolder = searchResult.files[0]
        
        // ローカルストレージに保存
        localStorage.setItem(STORAGE_KEYS.APP_FOLDER_ID, existingFolder.id)
        
        // サブフォルダの確認・作成（401エラー時は自動リフレッシュ）
        await executeWithTokenRefresh(async (currentToken) => {
          return await ensureSubFolders(currentToken, existingFolder.id)
        })
        
        // フォルダ作成処理完了
        isCreatingAppFolder.value = false
        return existingFolder
      }
      
      // ローカルストレージからフォルダIDを確認
      const savedFolderId = localStorage.getItem(STORAGE_KEYS.APP_FOLDER_ID)
      
      if (savedFolderId) {
        
        // 保存されたフォルダIDの存在確認（401エラー時は自動リフレッシュ）
        try {
          const folderInfo = await executeWithTokenRefresh(async (currentToken) => {
            const url = googleApiClient.getDriveFileUrl(savedFolderId, { fields: 'id,name,trashed' })
            const verifyResponse = await googleApiClient.makeAuthenticatedRequest(url, currentToken)
            
            if (!verifyResponse.ok) {
              const errorText = await verifyResponse.text()
              throw new Error(`API request failed: ${verifyResponse.status} ${verifyResponse.statusText} - ${errorText}`)
            }
            
            return await verifyResponse.json()
          })
          
          if (!folderInfo.trashed && folderInfo.name === APP_FOLDER_NAME) {
            
            // サブフォルダの確認・作成（401エラー時は自動リフレッシュ）
            await executeWithTokenRefresh(async (currentToken) => {
              return await ensureSubFolders(currentToken, savedFolderId)
            })
            
            // フォルダ作成処理完了
            isCreatingAppFolder.value = false
            return { id: savedFolderId }
          } else {
            localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
          }
        } catch (verifyErr) {
          // 401エラー以外の場合はローカルストレージから削除
          if (!isTokenExpiredError(verifyErr)) {
            localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
          }
          throw verifyErr
        }
      }
      
      // フォルダIDがない場合または無効な場合は新規作成（401エラー時は自動リフレッシュ）
      const newFolder = await executeWithTokenRefresh(async (currentToken) => {
        return await googleApiClient.createFolder(currentToken, APP_FOLDER_NAME)
      })
      
      // フォルダIDをローカルストレージに保存
      localStorage.setItem(STORAGE_KEYS.APP_FOLDER_ID, newFolder.id)
      
      // サブフォルダの作成（401エラー時は自動リフレッシュ）
      await executeWithTokenRefresh(async (currentToken) => {
        return await ensureSubFolders(currentToken, newFolder.id)
      })
      
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
      
      for (const folderName of SUB_FOLDERS) {
        await ensureSingleSubFolder(token, parentFolderId, folderName)
      }
      
      
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
      
      // 既存のフォルダを検索（401エラー時は自動リフレッシュ）
      const searchResult = await executeWithTokenRefresh(async (currentToken) => {
        return await googleApiClient.searchFolder(currentToken, folderName, parentFolderId)
      })
      
      if (searchResult.files && searchResult.files.length > 0) {
        const existingFolder = searchResult.files[0]
        
        // ローカルストレージに保存
        localStorage.setItem(getSubFolderStorageKey(folderName), existingFolder.id)
        
        return existingFolder
      }
      
      // ローカルストレージからフォルダIDを確認
      const savedFolderId = localStorage.getItem(getSubFolderStorageKey(folderName))
      
      if (savedFolderId) {
        
        // 保存されたフォルダIDの存在確認（401エラー時は自動リフレッシュ）
        try {
          const folderInfo = await executeWithTokenRefresh(async (currentToken) => {
            const url = googleApiClient.getDriveFileUrl(savedFolderId, { fields: 'id,name,trashed' })
            const verifyResponse = await googleApiClient.makeAuthenticatedRequest(url, currentToken)
            
            if (!verifyResponse.ok) {
              const errorText = await verifyResponse.text()
              throw new Error(`API request failed: ${verifyResponse.status} ${verifyResponse.statusText} - ${errorText}`)
            }
            
            return await verifyResponse.json()
          })
          
          if (!folderInfo.trashed && folderInfo.name === folderName) {
            return { id: savedFolderId }
          } else {
            localStorage.removeItem(getSubFolderStorageKey(folderName))
          }
        } catch (verifyErr) {
          // 401エラー以外の場合はローカルストレージから削除
          if (!isTokenExpiredError(verifyErr)) {
            localStorage.removeItem(getSubFolderStorageKey(folderName))
          }
          throw verifyErr
        }
      }
      
      // フォルダがない場合は新規作成（401エラー時は自動リフレッシュ）
      const newFolder = await executeWithTokenRefresh(async (currentToken) => {
        return await googleApiClient.createFolder(currentToken, folderName, parentFolderId)
      })
      
      // フォルダIDをローカルストレージに保存
      localStorage.setItem(getSubFolderStorageKey(folderName), newFolder.id)
      
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
    // ローカルストレージからフォルダIDを取得
    const savedFolderId = localStorage.getItem(STORAGE_KEYS.APP_FOLDER_ID)
    
    if (!savedFolderId) {
      // フォルダIDが保存されていない場合、1回だけ再作成を試みる
      if (retryCount === 0) {
        try {
          const appFolder = await executeWithTokenRefresh(async (token) => {
            return await ensureAppFolder(token)
          })
          return appFolder
        } catch (ensureErr) {
          console.error('Failed to ensure app folder:', ensureErr)
          if (isTokenExpiredError(ensureErr)) {
            throw new Error('認証が期限切れです。再度ログインしてください。')
          }
          throw new Error('アプリフォルダIDが保存されていません。ログインしてください。')
        }
      }
      throw new Error('アプリフォルダIDが保存されていません。ログインしてください。')
    }
    
    // フォルダIDの有効性を検証
    try {
      const folderInfo = await executeWithTokenRefresh(async (token) => {
        const url = googleApiClient.getDriveFileUrl(savedFolderId, { fields: 'id,name,trashed' })
        const verifyResponse = await googleApiClient.makeAuthenticatedRequest(url, token)
        
        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text()
          throw new Error(`API request failed: ${verifyResponse.status} ${verifyResponse.statusText} - ${errorText}`)
        }
        
        return await verifyResponse.json()
      })
      
      if (!folderInfo.trashed && folderInfo.name === APP_FOLDER_NAME) {
        return { id: savedFolderId }
      } else {
        localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
        // 1回だけ再作成を試みる
        if (retryCount === 0) {
          try {
            const appFolder = await executeWithTokenRefresh(async (token) => {
              return await ensureAppFolder(token)
            })
            return appFolder
          } catch (ensureErr) {
            console.error('Failed to ensure app folder:', ensureErr)
            if (isTokenExpiredError(ensureErr)) {
              throw new Error('認証が期限切れです。再度ログインしてください。')
            }
            throw new Error('保存されたフォルダが無効です。ログインしてください。')
          }
        }
        throw new Error('保存されたフォルダが無効です。ログインしてください。')
      }
    } catch (err) {
      console.error('Failed to verify folder ID:', err)
      
      // 401エラーの場合は再作成を試みない（既にリフレッシュ済み）
      if (isTokenExpiredError(err)) {
        throw new Error('認証が期限切れです。再度ログインしてください。')
      }
      
      localStorage.removeItem(STORAGE_KEYS.APP_FOLDER_ID)
      // 1回だけ再作成を試みる
      if (retryCount === 0) {
        try {
          const appFolder = await executeWithTokenRefresh(async (token) => {
            return await ensureAppFolder(token)
          })
          return appFolder
        } catch (ensureErr) {
          console.error('Failed to ensure app folder:', ensureErr)
          if (isTokenExpiredError(ensureErr)) {
            throw new Error('認証が期限切れです。再度ログインしてください。')
          }
          throw new Error('フォルダの検証に失敗しました。ログインしてください。')
        }
      }
      throw new Error('フォルダの検証に失敗しました。ログインしてください。')
    }
  }
  
  // サブフォルダIDの取得（ローカルストレージから取得し、必要に応じて検証）
  const getSubFolderId = async (folderName, retryCount = 0) => {
    // フォルダ名の検証
    if (!SUB_FOLDERS.includes(folderName)) {
      throw new Error(`無効なフォルダ名です: ${folderName}`)
    }
    
    
    // ローカルストレージからフォルダIDを取得
    const storageKey = getSubFolderStorageKey(folderName)
    const savedFolderId = localStorage.getItem(storageKey)
    
    
    if (!savedFolderId) {
      // 1回だけ再作成を試みる
      if (retryCount === 0) {
        try {
          // ensureAppFolderを直接呼び出す（getAppFolderIdを経由しない）
          const appFolder = await executeWithTokenRefresh(async (token) => {
            return await ensureAppFolder(token)
          })
          // サブフォルダを確保
          await executeWithTokenRefresh(async (token) => {
            return await ensureSubFolders(token, appFolder.id)
          })
          // 再取得を試みる
          const recreatedFolderId = localStorage.getItem(storageKey)
          if (recreatedFolderId) {
            return { id: recreatedFolderId }
          }
        } catch (ensureErr) {
          console.error(`Failed to ensure ${folderName} folder:`, ensureErr)
          if (isTokenExpiredError(ensureErr)) {
            throw new Error('認証が期限切れです。再度ログインしてください。')
          }
        }
      }
      throw new Error(`${folderName}フォルダIDが保存されていません。ログインしてください。`)
    }
    
    // フォルダIDの有効性を検証
    try {
      
      const folderInfo = await executeWithTokenRefresh(async (token) => {
        const url = googleApiClient.getDriveFileUrl(savedFolderId, { fields: 'id,name,trashed' })
        
        const verifyResponse = await googleApiClient.makeAuthenticatedRequest(url, token)
        
        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text()
          throw new Error(`API request failed: ${verifyResponse.status} ${verifyResponse.statusText} - ${errorText}`)
        }
        
        return await verifyResponse.json()
      })
      
      
      if (!folderInfo.trashed && folderInfo.name === folderName) {
        return { id: savedFolderId }
      } else {
        localStorage.removeItem(getSubFolderStorageKey(folderName))
        // 1回だけ再作成を試みる
        if (retryCount === 0) {
          try {
            // ensureAppFolderを直接呼び出す（getAppFolderIdを経由しない）
            const appFolder = await executeWithTokenRefresh(async (token) => {
              return await ensureAppFolder(token)
            })
            // サブフォルダを確保
            await executeWithTokenRefresh(async (token) => {
              return await ensureSubFolders(token, appFolder.id)
            })
            // 再取得を試みる
            const recreatedFolderId = localStorage.getItem(storageKey)
            if (recreatedFolderId) {
              return { id: recreatedFolderId }
            }
          } catch (ensureErr) {
            console.error(`Failed to ensure ${folderName} folder:`, ensureErr)
            if (isTokenExpiredError(ensureErr)) {
              throw new Error('認証が期限切れです。再度ログインしてください。')
            }
          }
        }
        throw new Error(`保存された${folderName}フォルダが無効です。ログインしてください。`)
      }
    } catch (err) {
      console.error(`Failed to verify ${folderName} folder ID:`, err)
      
      // 401エラーの場合は再作成を試みない（既にリフレッシュ済み）
      if (isTokenExpiredError(err)) {
        throw new Error('認証が期限切れです。再度ログインしてください。')
      }
      
      localStorage.removeItem(getSubFolderStorageKey(folderName))
      // 1回だけ再作成を試みる
      if (retryCount === 0) {
        try {
          // ensureAppFolderを直接呼び出す（getAppFolderIdを経由しない）
          const appFolder = await executeWithTokenRefresh(async (token) => {
            return await ensureAppFolder(token)
          })
          // サブフォルダを確保
          await executeWithTokenRefresh(async (token) => {
            return await ensureSubFolders(token, appFolder.id)
          })
          // 再取得を試みる
          const recreatedFolderId = localStorage.getItem(storageKey)
          if (recreatedFolderId) {
            return { id: recreatedFolderId }
          }
        } catch (ensureErr) {
          console.error(`Failed to ensure ${folderName} folder:`, ensureErr)
          if (isTokenExpiredError(ensureErr)) {
            throw new Error('認証が期限切れです。再度ログインしてください。')
          }
        }
      }
      throw new Error(`${folderName}フォルダの検証に失敗しました。ログインしてください。`)
    }
  }
  
  // 開発者向け: トークン有効期限情報をコンソールに表示
  const logTokenExpirationInfo = async () => {
    const info = await getTokenExpirationInfo()
    
    if (!info.hasToken) {
      return info
    }
    
    if (!info.isValid) {
      return info
    }
    
    if (info.expiresIn) {
    } else {
      if (info.tokenInfo) {
      }
    }
    
    return info
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
    getTokenExpirationInfo,
    logTokenExpirationInfo,
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