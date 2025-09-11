import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { APP_CONFIG } from '../config/api.js'
import { googleApiClient } from '../services/googleApi.js'

export const useSalesStore = defineStore('sales', () => {
  // State
  const sales = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const selectedSale = ref(null)
  
  // Computed
  const salesCount = computed(() => sales.value.length)
  const sortedSales = computed(() => {
    return [...sales.value].sort((a, b) => {
      return new Date(b.issuedOn) - new Date(a.issuedOn)
    })
  })
  
  // Google Drive API設定
  const SALES_FOLDER = APP_CONFIG.SUB_FOLDERS[1] // 'sales'
  
  // Actions
  const initializeSales = async () => {
    try {
      isLoading.value = true
      error.value = null
      await loadSales()
    } catch (err) {
      console.error('Failed to initialize sales:', err)
      error.value = '売上データの初期化に失敗しました'
    } finally {
      isLoading.value = false
    }
  }
  
  const loadSales = async () => {
    try {
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // アプリフォルダの取得（認証ストアから）
      const appFolder = await authStore.getAppFolderId()
      
      // salesフォルダの取得または作成
      const salesFolder = await getOrCreateSalesFolder(token, appFolder.id)
      
      // salesフォルダ内の月次ファイル一覧を取得
      const query = `'${salesFolder.id}' in parents and name contains 'ledger-' and trashed=false`
      const data = await googleApiClient.searchFiles(token, query, 'files(id,name,createdTime)', 'name desc')
      
      if (data.files && data.files.length > 0) {
        // 各月次ファイルの内容を取得
        const salesData = []
        for (const file of data.files) {
          try {
            const content = await googleApiClient.getFileContent(token, file.id)
            if (content) {
              // JSONL形式の内容をパース
              const lines = content.split('\n').filter(line => line.trim())
              for (const line of lines) {
                try {
                  const sale = JSON.parse(line)
                  salesData.push(sale)
                } catch (parseErr) {
                  console.warn('Failed to parse sale line:', line, parseErr)
                }
              }
            }
          } catch (err) {
            console.warn('Failed to load monthly ledger file:', file.name, err)
          }
        }
        sales.value = salesData
      } else {
        sales.value = []
      }
      
    } catch (err) {
      console.error('Failed to load sales:', err)
      throw err
    }
  }
  
  const createSale = async (saleData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // バリデーション
      if (!saleData.customerId) {
        throw new Error('顧客を選択してください')
      }
      
      if (!saleData.lines || saleData.lines.length === 0) {
        throw new Error('商品を1つ以上追加してください')
      }
      
      // 伝票IDの生成
      const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 現在の日時を取得（JST）
      const now = new Date()
      const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
      const createdAt = jstNow.toISOString().replace('Z', '+09:00')
      
      // 税額計算
      const totals = calculateTotals(saleData.lines)
      
      // 売上データの作成
      const newSale = {
        id: ticketId,
        customerId: saleData.customerId,
        issuedOn: saleData.issuedOn,
        lines: saleData.lines,
        note: saleData.note || '',
        totals: totals,
        isNegative: saleData.isNegative || false,
        negatesTicketId: saleData.negatesTicketId || null,
        createdAt: createdAt
      }
      
      // アプリフォルダの取得
      const appFolder = await authStore.getAppFolderId()
      
      // salesフォルダの取得または作成
      const salesFolder = await getOrCreateSalesFolder(token, appFolder.id)
      
      // ファイル名の生成（YYYYMMDD_customerId_ticketId.json）
      const dateStr = saleData.issuedOn.replace(/-/g, '')
      const fileName = `${dateStr}_${saleData.customerId}_${ticketId}.json`
      
      // 売上ファイルを作成
      const fileData = {
        name: fileName,
        parents: [salesFolder.id]
      }
      const createResponse = await googleApiClient.createFile(token, fileData)
      const file = await createResponse.json()
      
      // ファイルの内容を設定
      await googleApiClient.updateFileContent(token, file.id, newSale)
      
      // ローカルの状態を更新
      sales.value.unshift(newSale)
      
      return newSale
      
    } catch (err) {
      console.error('Failed to create sale:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const bulkReflectSales = async (salesDataArray) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      if (!salesDataArray || salesDataArray.length === 0) {
        throw new Error('反映する売上データがありません')
      }
      
      // アプリフォルダの取得
      const appFolder = await authStore.getAppFolderId()
      
      // salesフォルダの取得または作成
      const salesFolder = await getOrCreateSalesFolder(token, appFolder.id)
      
      // 月別に売上データをグループ化
      const salesByMonth = {}
      
      for (const saleData of salesDataArray) {
        // バリデーション
        if (!saleData.customerId) {
          throw new Error('顧客を選択してください')
        }
        
        if (!saleData.lines || saleData.lines.length === 0) {
          throw new Error('商品を1つ以上追加してください')
        }
        
        // 伝票IDの生成
        const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // 現在の日時を取得（JST）
        const now = new Date()
        const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
        const createdAt = jstNow.toISOString().replace('Z', '+09:00')
        
        // 税額計算
        const totals = calculateTotals(saleData.lines)
        
        // 売上データの作成
        const newSale = {
          id: ticketId,
          customerId: saleData.customerId,
          issuedOn: saleData.issuedOn,
          lines: saleData.lines,
          note: saleData.note || '',
          totals: totals,
          isNegative: saleData.isNegative || false,
          negatesTicketId: saleData.negatesTicketId || null,
          createdAt: createdAt
        }
        
        // 月次ファイル名の生成（YYYYMM）
        const yearMonth = saleData.issuedOn.substring(0, 7).replace('-', '')
        const fileName = `ledger-${yearMonth}.jsonl`
        
        if (!salesByMonth[fileName]) {
          salesByMonth[fileName] = []
        }
        salesByMonth[fileName].push(newSale)
      }
      
      // 各月次ファイルを更新
      for (const [fileName, sales] of Object.entries(salesByMonth)) {
        await updateMonthlyLedger(token, salesFolder.id, fileName, sales)
      }
      
      // ローカルの状態を更新（新しく作成された売上を追加）
      for (const monthSales of Object.values(salesByMonth)) {
        sales.value.unshift(...monthSales)
      }
      
      return salesDataArray.length
      
    } catch (err) {
      console.error('Failed to bulk reflect sales:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const searchSales = async (filters = {}) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // アプリフォルダの取得
      const appFolder = await authStore.getAppFolderId()
      
      // salesフォルダの取得または作成
      const salesFolder = await getOrCreateSalesFolder(token, appFolder.id)
      
      // 検索クエリの構築（月次ファイルのみ）
      let query = `'${salesFolder.id}' in parents and name contains 'ledger-' and trashed=false`
      
      // 期間フィルタ（月次ファイル名で絞り込み）
      if (filters.fromDate && filters.toDate) {
        const fromYearMonth = filters.fromDate.substring(0, 7).replace('-', '')
        const toYearMonth = filters.toDate.substring(0, 7).replace('-', '')
        query += ` and name >= 'ledger-${fromYearMonth}.jsonl' and name <= 'ledger-${toYearMonth}.jsonl'`
      }
      
      const data = await googleApiClient.searchFiles(token, query, 'files(id,name)', 'name desc')
      
      if (data.files && data.files.length > 0) {
        // 各月次ファイルの内容を取得
        const salesData = []
        for (const file of data.files) {
          try {
            const content = await googleApiClient.getFileContent(token, file.id)
            if (content) {
              // JSONL形式の内容をパース
              const lines = content.split('\n').filter(line => line.trim())
              for (const line of lines) {
                try {
                  const sale = JSON.parse(line)
                  
                  // 追加のフィルタリング（クライアント側）
                  let include = true
                  
                  // 日付フィルタ
                  if (filters.fromDate && new Date(sale.issuedOn) < new Date(filters.fromDate)) {
                    include = false
                  }
                  if (filters.toDate && new Date(sale.issuedOn) > new Date(filters.toDate)) {
                    include = false
                  }
                  
                  // 顧客フィルタ
                  if (filters.customerId && sale.customerId !== filters.customerId) {
                    include = false
                  }
                  
                  // 商品フィルタ
                  if (filters.productId && !sale.lines.some(line => line.productId === filters.productId)) {
                    include = false
                  }
                  
                  if (include) {
                    salesData.push(sale)
                  }
                } catch (parseErr) {
                  console.warn('Failed to parse sale line:', line, parseErr)
                }
              }
            }
          } catch (err) {
            console.warn('Failed to load monthly ledger file:', file.name, err)
          }
        }
        
        // 日付でソート
        salesData.sort((a, b) => new Date(b.issuedOn) - new Date(a.issuedOn))
        
        return salesData
      } else {
        return []
      }
      
    } catch (err) {
      console.error('Failed to search sales:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const getSaleById = (saleId) => {
    return sales.value.find(sale => sale.id === saleId)
  }
  
  const deleteSale = async (saleId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 削除対象の売上を取得
      const saleToDelete = sales.value.find(sale => sale.id === saleId)
      if (!saleToDelete) {
        throw new Error('削除対象の売上が見つかりません')
      }
      
      // アプリフォルダの取得
      const appFolder = await authStore.getAppFolderId()
      
      // salesフォルダの取得または作成
      const salesFolder = await getOrCreateSalesFolder(token, appFolder.id)
      
      // ファイル名の生成
      const dateStr = saleToDelete.issuedOn.replace(/-/g, '')
      const fileName = `${dateStr}_${saleToDelete.customerId}_${saleId}.json`
      
      // ファイルを検索
      const query = `name='${fileName}' and '${salesFolder.id}' in parents and trashed=false`
      const data = await googleApiClient.searchFiles(token, query)
      
      if (data.files && data.files.length > 0) {
        // ファイルを削除（ゴミ箱に移動）
        await googleApiClient.deleteFile(token, data.files[0].id)
        
        // ローカルの状態を更新
        const index = sales.value.findIndex(sale => sale.id === saleId)
        if (index !== -1) {
          sales.value.splice(index, 1)
        }
      }
      
    } catch (err) {
      console.error('Failed to delete sale:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // ヘルパー関数
  const calculateTotals = (lines) => {
    let subtotalExclTax = 0
    const taxByRate = {}
    
    lines.forEach(line => {
      const lineTotal = line.quantity * line.priceExclTax
      subtotalExclTax += lineTotal
      
      // 税額計算（切り捨て）
      const taxAmount = Math.floor(lineTotal * (line.taxRate / 100))
      if (taxByRate[line.taxRate]) {
        taxByRate[line.taxRate] += taxAmount
      } else {
        taxByRate[line.taxRate] = taxAmount
      }
    })
    
    const totalTax = Object.values(taxByRate).reduce((sum, tax) => sum + tax, 0)
    const totalInclTax = subtotalExclTax + totalTax
    
    return {
      subtotalExclTax,
      taxByRate,
      totalTax,
      totalInclTax
    }
  }
  
  // Google Drive API ヘルパー関数
  const getOrCreateSalesFolder = async (token, appFolderId) => {
    try {
      // salesフォルダを検索
      const searchResult = await googleApiClient.searchFolder(token, SALES_FOLDER, appFolderId)
      
      if (searchResult.files && searchResult.files.length > 0) {
        return searchResult.files[0]
      }
      
      // salesフォルダを作成
      return await googleApiClient.createFolder(token, SALES_FOLDER, appFolderId)
      
    } catch (err) {
      console.error('Failed to get or create sales folder:', err)
      throw err
    }
  }
  

  const updateMonthlyLedger = async (token, salesFolderId, fileName, newSales) => {
    try {
      // 既存の月次ファイルを検索
      const query = `name='${fileName}' and '${salesFolderId}' in parents and trashed=false`
      const data = await googleApiClient.searchFiles(token, query)
      let existingSales = []
      
      if (data.files && data.files.length > 0) {
        // 既存ファイルが存在する場合、内容を取得
        const file = data.files[0]
        const content = await googleApiClient.getFileContent(token, file.id)
        if (content && Array.isArray(content)) {
          existingSales = content
        }
      }
      
      // 新しい売上を既存の売上に追加
      const updatedSales = [...existingSales, ...newSales]
      
      // JSONL形式でファイル内容を作成
      const jsonlContent = updatedSales.map(sale => JSON.stringify(sale)).join('\n')
      
      if (data.files && data.files.length > 0) {
        // 既存ファイルを更新
        const file = data.files[0]
        await googleApiClient.updateFileContent(token, file.id, jsonlContent)
      } else {
        // 新しいファイルを作成
        const fileData = {
          name: fileName,
          parents: [salesFolderId]
        }
        const createResponse = await googleApiClient.createFile(token, fileData)
        const file = await createResponse.json()
        await googleApiClient.updateFileContent(token, file.id, jsonlContent)
      }
      
    } catch (err) {
      console.error('Failed to update monthly ledger:', err)
      throw err
    }
  }
  
  
  return {
    // State
    sales,
    isLoading,
    error,
    selectedSale,
    
    // Computed
    salesCount,
    sortedSales,
    
    // Actions
    initializeSales,
    loadSales,
    bulkReflectSales,
    searchSales,
    getSaleById,
    deleteSale
  }
}) 