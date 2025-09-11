import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth.js'
import { APP_CONFIG, STORAGE_KEYS } from '../config/api.js'
import { googleApiClient } from '../services/googleApi.js'
import { useStorage } from '../composables/useStorage.js'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const businessSettings = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const isInitialized = ref(false) // 初期化完了フラグを追加
  
  // Local storage utilities
  const { saveToLocalStorage, loadFromLocalStorage } = useStorage()
  
  // Computed
  const hasBusinessSettings = computed(() => !!businessSettings.value)
  
  // Actions
  const initializeSettings = async () => {
    // 既に初期化済みの場合はスキップ
    if (isInitialized.value) {
      console.log('✅ Settings already initialized, skipping...')
      return
    }
    
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // ローカルストレージから事業者設定を確認
      const cachedSettings = loadFromLocalStorage(STORAGE_KEYS.BUSINESS_SETTINGS)
      if (cachedSettings) {
        console.log('✅ Using cached business settings from localStorage')
        businessSettings.value = cachedSettings
        isInitialized.value = true
        return
      }
      
      console.log('📡 Fetching business settings from API')
      // setting.jsonファイルの存在確認と取得
      await loadSettingsFile(token)
      
      isInitialized.value = true
      
    } catch (err) {
      console.error('Settings initialization failed:', err)
      error.value = '設定の初期化に失敗しました'
      // エラーの場合はnullに設定（初回設定画面を表示するため）
      businessSettings.value = null
      isInitialized.value = true
    } finally {
      isLoading.value = false
    }
  }
  
  const loadSettingsFile = async (token) => {
    try {
      const authStore = useAuthStore()
      
      // アプリフォルダの取得または作成
      let appFolder
      try {
        console.log('🔍 Trying to get existing app folder...')
        appFolder = await authStore.getAppFolderId()
        console.log('✅ Found existing app folder:', appFolder.id)
      } catch (err) {
        console.log('❌ App folder not found, creating new one...', err.message)
        try {
          appFolder = await authStore.ensureAppFolder(token)
          console.log('✅ Created new app folder:', appFolder.id)
        } catch (createErr) {
          console.error('❌ Failed to create app folder:', createErr)
          throw new Error(`アプリフォルダの作成に失敗しました: ${createErr.message}`)
        }
      }
      
      // setting.jsonファイルを検索
      const searchQuery = `name='${APP_CONFIG.FILES.SETTING}' and '${appFolder.id}' in parents and trashed=false`
      const searchResult = await googleApiClient.searchFiles(token, searchQuery, 'files(id,name)')
      
      if (searchResult.files && searchResult.files.length > 0) {
        // 既存の設定ファイルを取得
        const fileId = searchResult.files[0].id
        await loadSettingsFromFile(token, fileId)
      } else {
        // 設定ファイルが存在しない場合はnullに設定
        businessSettings.value = null
        console.log('Settings file not found, will show initial setup')
      }
      
    } catch (err) {
      console.error('Failed to load settings file:', err)
      throw err
    }
  }
  
  const loadSettingsFromFile = async (token, fileId) => {
    try {
      const settingsData = await googleApiClient.getFileContent(token, fileId)
      
      // 必要な情報のみを抽出
      const essentialSettings = {
        name: settingsData.name,
        representative: settingsData.representative,
        number: settingsData.number,
        bankInfo: settingsData.bankInfo,
        phone: settingsData.phone,
        address: settingsData.address,
        createdAt: settingsData.createdAt,
        updatedAt: settingsData.updatedAt
      }
      
      // 事業者設定を直接設定
      businessSettings.value = essentialSettings || null
      
      // ローカルストレージに保存
      saveToLocalStorage(STORAGE_KEYS.BUSINESS_SETTINGS, essentialSettings)
      
      console.log('Settings loaded successfully and cached:', businessSettings.value)
      
    } catch (err) {
      console.error('Failed to load settings from file:', err)
      throw err
    }
  }
  
  const createBusinessSettings = async (businessData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // バリデーション
      validateBusinessSettings(businessData)
      
      // 設定データを作成（現在時刻を追加）
      const settingsData = {
        ...businessData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // 必要な情報のみを抽出
      const essentialSettings = {
        name: settingsData.name,
        representative: settingsData.representative,
        number: settingsData.number,
        bankInfo: settingsData.bankInfo,
        phone: settingsData.phone,
        address: settingsData.address,
        createdAt: settingsData.createdAt,
        updatedAt: settingsData.updatedAt
      }
      
      // ローカルストレージに保存
      saveToLocalStorage(STORAGE_KEYS.BUSINESS_SETTINGS, essentialSettings)
      
      // 事業者設定を設定
      businessSettings.value = essentialSettings
      
      // setting.jsonファイルを作成
      const appFolder = await authStore.ensureAppFolder(token)
      
      const fileData = {
        name: APP_CONFIG.FILES.SETTING,
        parents: [appFolder.id],
        mimeType: 'application/json'
      }
      
      // ファイルを作成
      const createResponse = await googleApiClient.createFile(token, fileData)
      const createdFile = await createResponse.json()
      console.log('Settings file created:', createdFile.id)
      
      // ファイルの内容を更新
      await googleApiClient.updateFileContent(token, createdFile.id, settingsData)
      
      console.log('Business settings created successfully and cached')
      
      return createdFile
      
    } catch (err) {
      console.error('Failed to create business settings:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const updateBusinessSettings = async (businessData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // バリデーション
      validateBusinessSettings(businessData)
      
      // 既存の設定ファイルを検索
      const appFolder = await authStore.ensureAppFolder(token)
      const searchQuery = `name='${APP_CONFIG.FILES.SETTING}' and '${appFolder.id}' in parents and trashed=false`
      const searchResult = await googleApiClient.searchFiles(token, searchQuery, 'files(id,name)')
      
      if (!searchResult.files || searchResult.files.length === 0) {
        throw new Error('設定ファイルが見つかりません')
      }
      
      const fileId = searchResult.files[0].id
      
      // 既存の設定を取得して更新
      const existingSettings = businessSettings.value || {}
      const settingsData = {
        ...existingSettings,
        ...businessData,
        updatedAt: new Date().toISOString()
      }

      // 必要な情報のみを抽出
      const essentialSettings = {
        name: settingsData.name,
        representative: settingsData.representative,
        number: settingsData.number,
        bankInfo: settingsData.bankInfo,
        phone: settingsData.phone,
        address: settingsData.address,
        createdAt: settingsData.createdAt,
        updatedAt: settingsData.updatedAt
      }
      
      // ファイルの内容を更新
      await googleApiClient.updateFileContent(token, fileId, settingsData)
      console.log('Settings file updated:', fileId)

      // ローカルストレージに保存
      saveToLocalStorage(STORAGE_KEYS.BUSINESS_SETTINGS, essentialSettings)
      
      // 状態を更新
      businessSettings.value = settingsData
      
      return { id: fileId }
      
    } catch (err) {
      console.error('Failed to update business setting:', err)
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const validateBusinessSettings = (businessData) => {
    const errors = []
    
    if (!businessData.name || businessData.name.trim() === '') {
      errors.push('事業者名は必須です')
    }
    
    if (!businessData.number || businessData.number.trim() === '') {
      errors.push('事業者番号は必須です')
    } else if (!businessData.number.startsWith('T')) {
      errors.push('事業者番号はTから始まる必要があります')
    }
    
    if (!businessData.representative || businessData.representative.trim() === '') {
      errors.push('代表者名は必須です')
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '))
    }
  }
  
  const resetSettings = () => {
    businessSettings.value = null
    isLoading.value = false
    error.value = null
    isInitialized.value = false
    console.log('🔄 Settings store reset')
  }
  

  
  return {
    // State
    businessSettings,
    isLoading,
    error,
    isInitialized, // 初期化完了フラグをエクスポート
    
    // Computed
    hasBusinessSettings,
    
    // Actions
    initializeSettings,
    createBusinessSettings,
    updateBusinessSettings,
    resetSettings
  }
}) 