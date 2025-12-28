import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { APP_CONFIG } from '../config/api.js'
import { googleApiClient } from '../services/googleApi.js'
import { Sale } from '../models/Sale.js'
import { SaleLine } from '../models/SaleLine.js'
import { SaleTotals } from '../models/SaleTotals.js'

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
            const content = await googleApiClient.getFileContentAsText(token, file.id)
            if (content && content.trim()) {
              // JSONL形式の内容をパース
              const lines = content.split('\n').filter(line => line.trim())
              for (const line of lines) {
                try {
                  const saleData = JSON.parse(line)
                  // Saleインスタンスに変換
                  const sale = Sale.fromData(saleData)
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
  
  const loadSalesByYearMonth = async (yearMonth) => {
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
      
      // 年月をYYYYMM形式に変換（例: "2025-12" -> "202512"）
      const yearMonthStr = yearMonth.replace('-', '')
      const fileName = `ledger-${yearMonthStr}.jsonl`
      
      // 特定の月次ファイルを検索
      const query = `name='${fileName}' and '${salesFolder.id}' in parents and trashed=false`
      const data = await googleApiClient.searchFiles(token, query, 'files(id,name)', 'name desc')
      
      if (data.files && data.files.length > 0) {
        // 月次ファイルの内容を取得
        const salesData = []
        const file = data.files[0]
        try {
          const content = await googleApiClient.getFileContentAsText(token, file.id)
          if (content && content.trim()) {
            // JSONL形式の内容をパース
            const lines = content.split('\n').filter(line => line.trim())
            for (const line of lines) {
              try {
                const saleData = JSON.parse(line)
                // Saleインスタンスに変換
                const sale = Sale.fromData(saleData)
                salesData.push(sale)
              } catch (parseErr) {
                console.warn('Failed to parse sale line:', line, parseErr)
              }
            }
          }
        } catch (err) {
          console.warn('Failed to load monthly ledger file:', file.name, err)
        }
        
        // issuedOnが新しい順でソート
        salesData.sort((a, b) => new Date(b.issuedOn) - new Date(a.issuedOn))
        
        return salesData
      } else {
        return []
      }
      
    } catch (err) {
      console.error('Failed to load sales by year month:', err)
      throw err
    } finally {
      isLoading.value = false
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
      
      // 伝票IDの生成
      const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 現在の日時を取得（JST）
      const now = new Date()
      const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
      const createdAt = jstNow.toISOString().replace('Z', '+09:00')
      
      // linesをSaleLineインスタンスの配列に変換
      const saleLines = saleData.lines.map(lineData => SaleLine.fromData(lineData))
      
      // 税額計算
      const totals = SaleTotals.calculateFromLines(saleLines)
      
      // 売上データの作成
      const saleDataWithId = {
        id: ticketId,
        customerId: saleData.customerId,
        issuedOn: saleData.issuedOn,
        lines: saleLines.map(line => line.toJSON()), // SaleLineをJSONに変換
        note: saleData.note || '',
        totals: totals.toJSON(), // SaleTotalsをJSONに変換
        isNegative: saleData.isNegative || false,
        negatesTicketId: saleData.negatesTicketId || null,
        createdAt: createdAt
      }
      
      // Saleインスタンスを作成
      const newSale = Sale.fromData(saleDataWithId)
      
      // バリデーション
      newSale.validate()
      
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
      
      // ファイルの内容を設定（SaleインスタンスをJSONに変換）
      await googleApiClient.updateFileContent(token, file.id, newSale.toJSON())
      
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
        // 伝票IDの生成
        const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // 現在の日時を取得（JST）
        const now = new Date()
        const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
        const createdAt = jstNow.toISOString().replace('Z', '+09:00')
        
        // linesをSaleLineインスタンスの配列に変換
        const saleLines = saleData.lines.map(lineData => SaleLine.fromData(lineData))
        
        // 税額計算
        const totals = SaleTotals.calculateFromLines(saleLines)
        
        // 売上データの作成
        const saleDataWithId = {
          id: ticketId,
          customerId: saleData.customerId,
          issuedOn: saleData.issuedOn,
          lines: saleLines.map(line => line.toJSON()), // SaleLineをJSONに変換
          note: saleData.note || '',
          totals: totals.toJSON(), // SaleTotalsをJSONに変換
          isNegative: saleData.isNegative || false,
          negatesTicketId: saleData.negatesTicketId || null,
          createdAt: createdAt
        }
        
        // Saleインスタンスを作成
        const newSale = Sale.fromData(saleDataWithId)
        
        // バリデーション
        newSale.validate()
        
        // 月次ファイル名の生成（YYYYMM）
        const yearMonth = saleData.issuedOn.substring(0, 7).replace('-', '')
        const fileName = `ledger-${yearMonth}.jsonl`
        
        if (!salesByMonth[fileName]) {
          salesByMonth[fileName] = []
        }
        // JSON形式で保存するため、toJSON()を使用
        salesByMonth[fileName].push(newSale.toJSON())
      }
      
      // 各月次ファイルを更新
      for (const [fileName, monthSales] of Object.entries(salesByMonth)) {
        await updateMonthlyLedger(token, salesFolder.id, fileName, monthSales)
      }
      
      // ローカルの状態を更新（新しく作成された売上を追加）
      // JSON形式からSaleインスタンスに変換
      const allNewSales = []
      for (const monthSales of Object.values(salesByMonth)) {
        const saleInstances = monthSales.map(saleData => Sale.fromData(saleData))
        sales.value.unshift(...saleInstances)
        allNewSales.push(...saleInstances)
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
      // Google Drive APIの文字列比較（>=, <=）は正しく動作しないため、
      // name containsを使用して年を含むファイルを検索し、クライアント側でフィルタリング
      if (filters.fromDate && filters.toDate) {
        const fromYear = filters.fromDate.substring(0, 4)
        const toYear = filters.toDate.substring(0, 4)
        
        // 同じ年の場合は、その年のファイルを検索
        if (fromYear === toYear) {
          query += ` and name contains 'ledger-${fromYear}'`
        } else {
          // 複数年にまたがる場合は、範囲内の年のファイルを検索（OR条件）
          const yearConditions = []
          for (let year = parseInt(fromYear); year <= parseInt(toYear); year++) {
            yearConditions.push(`name contains 'ledger-${year}'`)
          }
          if (yearConditions.length > 0) {
            query += ` and (${yearConditions.join(' or ')})`
          }
        }
      }
      
      const data = await googleApiClient.searchFiles(token, query, 'files(id,name)', 'name desc')
      
      if (data.files && data.files.length > 0) {
        // 各月次ファイルの内容を取得
        const salesData = []
        for (const file of data.files) {
          try {
            const content = await googleApiClient.getFileContentAsText(token, file.id)
            if (content && content.trim()) {
              // JSONL形式の内容をパース
              const lines = content.split('\n').filter(line => line.trim())
              for (const line of lines) {
                try {
                  const saleData = JSON.parse(line)
                  // Saleインスタンスに変換
                  const sale = Sale.fromData(saleData)
                  
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

  const updateSale = async (saleId, updatedData) => {
    try {
      isLoading.value = true
      error.value = null

      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      if (!token) {
        throw new Error('認証トークンがありません')
      }

      const existingSale = sales.value.find(sale => sale.id === saleId)
      if (!existingSale) {
        throw new Error('更新対象の売上が見つかりません')
      }

      const appFolder = await authStore.getAppFolderId()
      const salesFolder = await getOrCreateSalesFolder(token, appFolder.id)

      const updatedIssuedOn = updatedData.issuedOn || existingSale.issuedOn
      const oldYearMonth = existingSale.issuedOn.substring(0, 7).replace('-', '')
      const newYearMonth = updatedIssuedOn.substring(0, 7).replace('-', '')

      const updatedLines = (updatedData.lines && updatedData.lines.length > 0)
        ? updatedData.lines.map(line => SaleLine.fromData(line))
        : existingSale.lines.map(line => SaleLine.fromData(line.toJSON ? line.toJSON() : line))

      const totals = SaleTotals.calculateFromLines(updatedLines)

      const now = new Date()
      const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
      const updatedAt = jstNow.toISOString().replace('Z', '+09:00')

      const updatedSaleData = {
        ...existingSale.toJSON(),
        issuedOn: updatedIssuedOn,
        lines: updatedLines.map(line => line.toJSON()),
        note: updatedData.note ?? existingSale.note ?? '',
        totals: totals.toJSON(),
        updatedAt
      }

      const updateLedger = async (targetYearMonth, mutate) => {
        const { fileId, entries, fileName } = await loadMonthlyLedgerEntries(token, salesFolder.id, targetYearMonth)
        const mutatedEntries = mutate(entries)
        const newFileId = await saveMonthlyLedgerEntries(token, salesFolder.id, fileId, fileName, mutatedEntries)
        return newFileId
      }

      if (oldYearMonth === newYearMonth) {
        await updateLedger(oldYearMonth, entries => {
          const filtered = entries.filter(entry => entry.id !== saleId)
          return [...filtered, updatedSaleData]
        })
      } else {
        await updateLedger(oldYearMonth, entries => entries.filter(entry => entry.id !== saleId))
        await updateLedger(newYearMonth, entries => {
          const filtered = entries.filter(entry => entry.id !== saleId)
          return [...filtered, updatedSaleData]
        })
      }

      const updatedSale = Sale.fromData(updatedSaleData)
      const index = sales.value.findIndex(sale => sale.id === saleId)
      if (index !== -1) {
        sales.value.splice(index, 1, updatedSale)
      } else {
        sales.value.unshift(updatedSale)
      }

      return updatedSale
    } catch (err) {
      console.error('Failed to update sale:', err)
      error.value = err.message || '売上の更新に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // ヘルパー関数（calculateTotalsはSaleTotals.calculateFromLines()に置き換えられました）
  
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
        // 既存ファイルが存在する場合、内容を取得（JSONL形式のテキストとして取得）
        const file = data.files[0]
        const content = await googleApiClient.getFileContentAsText(token, file.id)
        if (content && content.trim()) {
          // JSONL形式の内容をパース
          const lines = content.split('\n').filter(line => line.trim())
          for (const line of lines) {
            try {
              const saleData = JSON.parse(line)
              // Saleインスタンスに変換
              const sale = Sale.fromData(saleData)
              existingSales.push(sale.toJSON()) // JSON形式で保存
            } catch (parseErr) {
              console.warn('Failed to parse sale line:', line, parseErr)
            }
          }
        }
      }
      
      // 新しい売上を既存の売上に追加
      const updatedSales = [...existingSales, ...newSales]
      
      // JSONL形式でファイル内容を作成
      const jsonlContent = updatedSales.map(sale => JSON.stringify(sale)).join('\n')
      
      if (data.files && data.files.length > 0) {
        // 既存ファイルを更新（テキストとして更新）
        const file = data.files[0]
        await googleApiClient.updateFileContentAsText(token, file.id, jsonlContent)
      } else {
        // 新しいファイルを作成
        const fileData = {
          name: fileName,
          parents: [salesFolderId]
        }
        const createResponse = await googleApiClient.createFile(token, fileData)
        const file = await createResponse.json()
        await googleApiClient.updateFileContentAsText(token, file.id, jsonlContent)
      }
      
    } catch (err) {
      console.error('Failed to update monthly ledger:', err)
      throw err
    }
  }

  const loadMonthlyLedgerEntries = async (token, salesFolderId, yearMonth) => {
    const fileName = `ledger-${yearMonth}.jsonl`
    const query = `name='${fileName}' and '${salesFolderId}' in parents and trashed=false`
    const data = await googleApiClient.searchFiles(token, query)
    const fileId = data.files && data.files.length > 0 ? data.files[0].id : null

    let entries = []
    if (fileId) {
      const content = await googleApiClient.getFileContentAsText(token, fileId)
      if (content && content.trim()) {
        const lines = content.split('\n').filter(line => line.trim())
        for (const line of lines) {
          try {
            entries.push(JSON.parse(line))
          } catch (parseErr) {
            console.warn('Failed to parse sale line:', line, parseErr)
          }
        }
      }
    }

    return { fileId, entries, fileName }
  }

  const saveMonthlyLedgerEntries = async (token, salesFolderId, fileId, fileName, entries) => {
    const jsonlContent = entries.map(entry => JSON.stringify(entry)).join('\n')

    if (fileId) {
      await googleApiClient.updateFileContentAsText(token, fileId, jsonlContent)
      return fileId
    }

    if (entries.length === 0) {
      return null
    }

    const fileData = {
      name: fileName,
      parents: [salesFolderId]
    }
    const createResponse = await googleApiClient.createFile(token, fileData)
    const file = await createResponse.json()
    await googleApiClient.updateFileContentAsText(token, file.id, jsonlContent)
    return file.id
  }

  const voidSale = async (saleToVoid, issuedOn) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 伝票IDの生成
      const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 現在の日時を取得（JST）
      const now = new Date()
      const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
      const createdAt = jstNow.toISOString().replace('Z', '+09:00')
      
      // linesは同じものをコピー
      const voidLines = saleToVoid.lines.map(line => line.toJSON())
      
      // totalsの符号を逆転（+だったら-に、-だったら+に）
      const originalTotals = saleToVoid.totals
      const voidTotals = {
        subtotalExclTax: -originalTotals.subtotalExclTax,
        taxByRate: {},
        totalTax: -originalTotals.totalTax,
        totalInclTax: -originalTotals.totalInclTax
      }
      
      // taxByRateの各税率の税額も符号を逆転
      for (const [rate, taxAmount] of Object.entries(originalTotals.taxByRate)) {
        voidTotals.taxByRate[rate] = -taxAmount
      }
      
      // 売上データの作成
      const voidSaleData = {
        id: ticketId,
        customerId: saleToVoid.customerId,
        issuedOn: issuedOn, // モーダル表示時に取得したシステム日
        lines: voidLines,
        note: '',
        totals: voidTotals,
        isNegative: !saleToVoid.isNegative, // 取り消す伝票と逆にする
        negatesTicketId: saleToVoid.id, // 取り消す伝票のid
        createdAt: createdAt
      }
      
      // Saleインスタンスを作成
      const newVoidSale = Sale.fromData(voidSaleData)
      
      // バリデーション
      newVoidSale.validate()
      
      // アプリフォルダの取得
      const appFolder = await authStore.getAppFolderId()
      
      // salesフォルダの取得または作成
      const salesFolder = await getOrCreateSalesFolder(token, appFolder.id)
      
      // 月次ファイル名の生成（YYYYMM）
      const yearMonth = issuedOn.substring(0, 7).replace('-', '')
      const fileName = `ledger-${yearMonth}.jsonl`
      
      // 月次ファイルに追加
      await updateMonthlyLedger(token, salesFolder.id, fileName, [newVoidSale.toJSON()])
      
      // ローカルの状態を更新
      sales.value.unshift(newVoidSale)
      
      return newVoidSale
      
    } catch (err) {
      console.error('Failed to void sale:', err)
      throw err
    } finally {
      isLoading.value = false
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
    loadSalesByYearMonth,
    bulkReflectSales,
    searchSales,
    getSaleById,
    updateSale,
    deleteSale,
    voidSale
  }
}) 