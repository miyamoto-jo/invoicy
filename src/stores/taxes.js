import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { APP_CONFIG } from '../config/api.js'
import { googleApiClient } from '../services/googleApi.js'

export const useTaxesStore = defineStore('taxes', () => {
  // State
  const taxes = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const selectedTax = ref(null)
  const rounding = ref('floor') // 端数計算方式: floor, ceil, round
  const defaultTaxId = ref('tax_10') // デフォルト税率ID
  
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
  const TAXES_FILE = `masters/${APP_CONFIG.FILES.TAXES}`
  
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
      const content = await googleApiClient.getFileContent(token, taxesFile.id)
      
      if (content && Array.isArray(content)) {
        taxes.value = content
      } else {
        taxes.value = []
      }
      
      // taxes.jsonからroundingとdefault_tax_idを読み込み
      await loadTaxSettingsFromTaxesFile(token, appFolder.id)
      
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
  
  // 端数計算方式のオプション
  const roundingOptions = [
    { value: 'floor', label: '切り捨て' },
    { value: 'ceil', label: '切り上げ' },
    { value: 'round', label: '四捨五入' }
  ]
  
  // Google Drive API ヘルパー関数
  const getOrCreateMastersFolder = async (token, appFolderId) => {
    try {
      // 既存のmastersフォルダを検索
      const searchResult = await googleApiClient.searchFolder(token, APP_CONFIG.SUB_FOLDERS[0], appFolderId)
      
      if (searchResult.files && searchResult.files.length > 0) {
        return searchResult.files[0]
      }
      
      // mastersフォルダが存在しない場合は作成
      return await googleApiClient.createFolder(token, APP_CONFIG.SUB_FOLDERS[0], appFolderId)
      
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
      const query = `name='${APP_CONFIG.FILES.TAXES}' and '${mastersFolder.id}' in parents and trashed=false`
      const searchResult = await googleApiClient.searchFiles(token, query)
      
      if (searchResult.files && searchResult.files.length > 0) {
        return searchResult.files[0]
      }
      
      // ファイルが存在しない場合は作成
      const fileData = {
        name: APP_CONFIG.FILES.TAXES,
        parents: [mastersFolder.id],
        mimeType: 'application/json'
      }
      const createResponse = await googleApiClient.createFile(token, fileData)
      const newFile = await createResponse.json()
      
      // 初期データで初期化
      const initialTaxes = [
        {
          "id": "tax_10",
          "rate": 10.0,
          "description": "一般的な商品・サービスに適用される標準税率",
          "isActive": true,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        },
        {
          "id": "tax_8",
          "rate": 8.0,
          "description": "食品・新聞などに適用される軽減税率",
          "isActive": true,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        },
        {
          "id": "tax_0",
          "rate": 0.0,
          "description": "非課税商品・サービス",
          "isActive": true,
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }
      ]
      
      const initialData = {
        taxes: initialTaxes,
        rounding: 'floor',
        default_tax_id: 'tax_10',
        lastUpdated: new Date().toISOString()
      }
      
      await googleApiClient.updateFileContent(token, newFile.id, initialData)
      
      return newFile
      
    } catch (err) {
      console.error('Failed to get or create taxes file:', err)
      throw err
    }
  }
  
  
  const saveTaxesToFile = async (token) => {
    try {
      const authStore = useAuthStore()
      const appFolder = await authStore.getAppFolderId()
      const taxesFile = await getOrCreateTaxesFile(token, appFolder.id)
      
      // 新しい形式でデータを構築
      const taxesData = {
        taxes: taxes.value,
        rounding: rounding.value,
        default_tax_id: defaultTaxId.value,
        lastUpdated: new Date().toISOString()
      }
      
      await googleApiClient.updateFileContent(token, taxesFile.id, taxesData)
    } catch (err) {
      console.error('Failed to save taxes to file:', err)
      throw err
    }
  }
  
  // 税率設定の読み込み（taxes.jsonから）
  const loadTaxSettingsFromTaxesFile = async (token, appFolderId) => {
    try {
      // taxes.jsonファイルを取得
      const taxesFile = await getOrCreateTaxesFile(token, appFolderId)
      const content = await googleApiClient.getFileContent(token, taxesFile.id)
      
      if (content && typeof content === 'object' && !Array.isArray(content)) {
        // オブジェクト形式の場合（新しい形式）
        rounding.value = content.rounding || 'floor'
        defaultTaxId.value = content.default_tax_id || 'tax_10'
        taxes.value = content.taxes || []
      } else if (content && Array.isArray(content)) {
        // 配列形式の場合（古い形式）
        taxes.value = content
        rounding.value = 'floor'
        defaultTaxId.value = 'tax_10'
      } else {
        // ファイルが空の場合
        taxes.value = []
        rounding.value = 'floor'
        defaultTaxId.value = 'tax_10'
      }
    } catch (err) {
      console.error('Failed to load tax settings from taxes file:', err)
      // エラーの場合はデフォルト値を使用
      taxes.value = []
      rounding.value = 'floor'
      defaultTaxId.value = 'tax_10'
    }
  }
  
  // 税率設定の更新（taxes.jsonに保存）
  const updateTaxSettings = async (newRounding, newDefaultTaxId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // taxes.jsonファイルを取得
      const appFolder = await authStore.getAppFolderId()
      const taxesFile = await getOrCreateTaxesFile(token, appFolder.id)
      
      // 新しい形式でデータを構築
      const taxesData = {
        taxes: taxes.value,
        rounding: newRounding,
        default_tax_id: newDefaultTaxId,
        lastUpdated: new Date().toISOString()
      }
      
      // ファイルを更新
      await googleApiClient.updateFileContent(token, taxesFile.id, taxesData)
      
      // ローカル状態を更新
      rounding.value = newRounding
      defaultTaxId.value = newDefaultTaxId
      
    } catch (err) {
      console.error('Failed to update tax settings:', err)
      error.value = err.message || '税率設定の更新に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    // State
    taxes,
    isLoading,
    error,
    selectedTax,
    rounding,
    defaultTaxId,
    
    // Computed
    taxesCount,
    sortedTaxes,
    getActiveTaxes,
    roundingOptions,
    
    // Actions
    initializeTaxes,
    loadTaxes,
    createTax,
    updateTax,
    deleteTax,
    getTaxById,
    updateTaxSettings
  }
}) 