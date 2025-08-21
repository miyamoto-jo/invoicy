import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const businessSettings = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  
  // Computed
  const hasBusinessSettings = computed(() => !!businessSettings.value)
  const isInitialized = computed(() => businessSettings.value !== null)
  
  // Actions
  const initializeSettings = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // settings.jsonファイルの存在確認と取得
      await loadSettingsFile(token)
      
    } catch (err) {
      console.error('Settings initialization failed:', err)
      error.value = '設定の初期化に失敗しました'
      // エラーの場合はnullに設定（初回設定画面を表示するため）
      businessSettings.value = null
    } finally {
      isLoading.value = false
    }
  }
  
  const loadSettingsFile = async (token) => {
    try {
      const authStore = useAuthStore()
      const appFolder = await authStore.getAppFolderId()
      
      // settings.jsonファイルを検索
      const searchQuery = `name='settings.json' and '${appFolder.id}' in parents and trashed=false`
      const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!searchResponse.ok) {
        throw new Error('設定ファイルの検索に失敗しました')
      }
      
      const searchResult = await searchResponse.json()
      
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
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('設定ファイルの読み込みに失敗しました')
      }
      
      const settingsData = await response.json()
      
      // 事業者設定を直接設定
      businessSettings.value = settingsData || null
      
      console.log('Settings loaded successfully:', businessSettings.value)
      
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
      
      // settings.jsonファイルを作成
      const appFolder = await authStore.getAppFolderId()
      
      const createPayload = {
        name: 'settings.json',
        parents: [appFolder.id],
        mimeType: 'application/json'
      }
      
      // まずファイルのメタデータを作成
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createPayload)
      })
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        throw new Error(`設定ファイルの作成に失敗しました: ${createResponse.status} ${createResponse.statusText}`)
      }
      
      const createdFile = await createResponse.json()
      console.log('Settings file created:', createdFile.id)
      
      // ファイルの内容を更新
      const updateContentResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${createdFile.id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      })
      
      if (!updateContentResponse.ok) {
        const errorText = await updateContentResponse.text()
        throw new Error(`設定ファイルの内容更新に失敗しました: ${updateContentResponse.status} ${updateContentResponse.statusText}`)
      }
      
      // 状態を更新
      businessSettings.value = settingsData
      
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
      const appFolder = await authStore.getAppFolderId()
      const searchQuery = `name='settings.json' and '${appFolder.id}' in parents and trashed=false`
      const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!searchResponse.ok) {
        throw new Error('設定ファイルの検索に失敗しました')
      }
      
      const searchResult = await searchResponse.json()
      
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
      
      // ファイルの内容を更新
      const updateResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      })
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        throw new Error(`設定ファイルの更新に失敗しました: ${updateResponse.status} ${updateResponse.statusText}`)
      }
      
      const updatedFile = await updateResponse.json()
      console.log('Settings file updated:', updatedFile.id)
      
      // 状態を更新
      businessSettings.value = settingsData
      
      return updatedFile
      
    } catch (err) {
      console.error('Failed to update business settings:', err)
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
  

  
  return {
    // State
    businessSettings,
    isLoading,
    error,
    
    // Computed
    hasBusinessSettings,
    isInitialized,
    
    // Actions
    initializeSettings,
    createBusinessSettings,
    updateBusinessSettings
  }
}) 