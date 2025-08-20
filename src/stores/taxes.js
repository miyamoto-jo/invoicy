import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export const useTaxesStore = defineStore('taxes', () => {
  // State
  const taxes = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const selectedTax = ref(null)
  
  // Computed
  const taxesCount = computed(() => taxes.value.length)
  const sortedTaxes = computed(() => {
    return [...taxes.value].sort((a, b) => {
      // 有効な税率を先に表示
      if (a.isActive !== b.isActive) {
        return b.isActive ? 1 : -1
      }
      // 次に税率でソート
      return b.rate - a.rate
    })
  })
  
  // Google Drive API設定
  const TAXES_FILE = 'masters/taxes.json'
  
  // Actions
  const initializeTaxes = async () => {
    try {
      isLoading.value = true
      error.value = null
      await loadTaxes()
    } catch (err) {
      console.error('Failed to initialize taxes:', err)
      error.value = '税率データの初期化に失敗しました'
    } finally {
      isLoading.value = false
    }
  }
  
  const loadTaxes = async () => {
    try {
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // アプリフォルダの取得（認証ストアから）
      const appFolder = await authStore.getAppFolderId()
      
      // 税率ファイルの取得または作成
      const taxesFile = await getOrCreateTaxesFile(token, appFolder.id)
      
      // ファイルの内容を取得
      const content = await getFileContent(token, taxesFile.id)
      
      if (content && Array.isArray(content)) {
        taxes.value = content
      } else {
        taxes.value = []
      }
      
    } catch (err) {
      console.error('Failed to load taxes:', err)
      throw err
    }
  }
  
  const createTax = async (taxData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // バリデーション
      if (taxData.rate === undefined || taxData.rate === null || taxData.rate < 0) {
        throw new Error('税率は0以上の数値で入力してください')
      }
      
      // 税率IDの生成
      const taxId = `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 税率データの作成
      const newTax = {
        id: taxId,
        rate: parseFloat(taxData.rate),
        description: taxData.description?.trim() || '',
        isActive: taxData.isActive !== false, // デフォルトはtrue
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // ローカル状態を更新
      taxes.value.push(newTax)
      
      // ファイルを更新
      await saveTaxesToFile(token)
      
      return newTax
      
    } catch (err) {
      console.error('Failed to create tax:', err)
      error.value = err.message || '税率の作成に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const updateTax = async (taxId, taxData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // バリデーション
      if (taxData.rate === undefined || taxData.rate === null || taxData.rate < 0) {
        throw new Error('税率は0以上の数値で入力してください')
      }
      
      // 税率を検索
      const taxIndex = taxes.value.findIndex(tax => tax.id === taxId)
      if (taxIndex === -1) {
        throw new Error('税率が見つかりません')
      }
      
      // 税率データの更新
      const updatedTax = {
        ...taxes.value[taxIndex],
        rate: parseFloat(taxData.rate),
        description: taxData.description?.trim() || '',
        isActive: taxData.isActive !== false,
        updatedAt: new Date().toISOString()
      }
      
      // ローカル状態を更新
      taxes.value[taxIndex] = updatedTax
      
      // ファイルを更新
      await saveTaxesToFile(token)
      
      return updatedTax
      
    } catch (err) {
      console.error('Failed to update tax:', err)
      error.value = err.message || '税率の更新に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const deleteTax = async (taxId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 税率を検索
      const taxIndex = taxes.value.findIndex(tax => tax.id === taxId)
      if (taxIndex === -1) {
        throw new Error('税率が見つかりません')
      }
      
      // ローカル状態から削除
      taxes.value.splice(taxIndex, 1)
      
      // ファイルを更新
      await saveTaxesToFile(token)
      
    } catch (err) {
      console.error('Failed to delete tax:', err)
      error.value = err.message || '税率の削除に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const getTaxById = (taxId) => {
    return taxes.value.find(tax => tax.id === taxId)
  }
  
  const getActiveTaxes = computed(() => {
    return taxes.value.filter(tax => tax.isActive)
  })
  
  // Google Drive API ヘルパー関数
  const getOrCreateMastersFolder = async (token, appFolderId) => {
    try {
      // 既存のmastersフォルダを検索
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='masters' and '${appFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Google Drive API request failed')
      }
      
      const data = await response.json()
      
      if (data.files && data.files.length > 0) {
        return data.files[0]
      }
      
      // mastersフォルダが存在しない場合は作成
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'masters',
          parents: [appFolderId],
          mimeType: 'application/vnd.google-apps.folder'
        })
      })
      
      if (!createResponse.ok) {
        throw new Error('Failed to create masters folder')
      }
      
      return await createResponse.json()
      
    } catch (err) {
      console.error('Failed to get or create masters folder:', err)
      throw err
    }
  }
  
  const getOrCreateTaxesFile = async (token, appFolderId) => {
    try {
      // mastersフォルダを取得または作成
      const mastersFolder = await getOrCreateMastersFolder(token, appFolderId)
      
      // 既存のtaxes.jsonファイルを検索
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='taxes.json' and '${mastersFolder.id}' in parents and trashed=false`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('Google Drive API request failed')
      }
      
      const data = await response.json()
      
      if (data.files && data.files.length > 0) {
        return data.files[0]
      }
      
      // ファイルが存在しない場合は作成
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'taxes.json',
          parents: [mastersFolder.id],
          mimeType: 'application/json'
        })
      })
      
      if (!createResponse.ok) {
        throw new Error('Failed to create taxes file')
      }
      
      const newFile = await createResponse.json()
      
      // 初期データで初期化
      const initialData = [
        {
          "id": "tax_standard",
          "rate": 10.0,
          "description": "一般的な商品・サービスに適用される標準税率",
          "isActive": true,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        },
        {
          "id": "tax_reduced",
          "rate": 8.0,
          "description": "食品・新聞などに適用される軽減税率",
          "isActive": true,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        },
        {
          "id": "tax_zero",
          "rate": 0.0,
          "description": "非課税商品・サービス",
          "isActive": true,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }
      ]
      
      await updateFileContent(token, newFile.id, initialData)
      
      return newFile
      
    } catch (err) {
      console.error('Failed to get or create taxes file:', err)
      throw err
    }
  }
  
  const getFileContent = async (token, fileId) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        if (response.status === 404) {
          return []
        }
        throw new Error('Failed to get file content')
      }
      
      const content = await response.text()
      return content ? JSON.parse(content) : []
      
    } catch (err) {
      console.error('Failed to get file content:', err)
      throw err
    }
  }
  
  const updateFileContent = async (token, fileId, content) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(content)
        }
      )
      
      if (!response.ok) {
        throw new Error('Failed to update file content')
      }
      
    } catch (err) {
      console.error('Failed to update file content:', err)
      throw err
    }
  }
  
  const saveTaxesToFile = async (token) => {
    try {
      const authStore = useAuthStore()
      const appFolder = await authStore.getAppFolderId()
      const taxesFile = await getOrCreateTaxesFile(token, appFolder.id)
      await updateFileContent(token, taxesFile.id, taxes.value)
    } catch (err) {
      console.error('Failed to save taxes to file:', err)
      throw err
    }
  }
  
  return {
    // State
    taxes,
    isLoading,
    error,
    selectedTax,
    
    // Computed
    taxesCount,
    sortedTaxes,
    getActiveTaxes,
    
    // Actions
    initializeTaxes,
    loadTaxes,
    createTax,
    updateTax,
    deleteTax,
    getTaxById
  }
}) 