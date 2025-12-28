import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { googleApiClient } from '../services/googleApi.js'
import { Invoice } from '../models/Invoice.js'
import { InvoiceDetail } from '../models/InvoiceDetail.js'
import { InvoiceSummary } from '../models/InvoiceSummary.js'

export const useInvoicesStore = defineStore('invoices', () => {
  // State
  const invoices = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const selectedInvoice = ref(null)
  
  // Computed
  const invoicesCount = computed(() => invoices.value.length)
  const sortedInvoices = computed(() => {
    return [...invoices.value].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  })
  
  
  // Actions
  const initializeInvoices = async (targetYear = null) => {
    try {
      isLoading.value = true
      error.value = null
      const year = targetYear || new Date().getFullYear()
      console.log(`🔄 Loading invoices for year ${year}...`)
      await loadInvoices(year)
      console.log('✅ Invoices loaded successfully')
    } catch (err) {
      console.error('Failed to initialize invoices:', err)
      error.value = '請求書データの初期化に失敗しました'
    } finally {
      isLoading.value = false
    }
  }
  
  const loadInvoices = async (targetYear = null) => {
    try {
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 年が指定されていない場合は現在の年を使用
      const year = targetYear || new Date().getFullYear()
      // アプリフォルダの取得
      const appFolder = await authStore.getAppFolderId()
      
      // invoicesフォルダIDの取得
      const invoicesFolderId = await getInvoicesFolderId(token)
      
      // 指定された年の月次ファイルのみを取得（例：2025-で始まるファイル）
      const query = `'${invoicesFolderId}' in parents and name contains '${year}-' and name contains '-invoices.jsonl' and trashed=false`
      const data = await googleApiClient.searchFiles(token, query, 'files(id,name,createdTime)', 'name desc')
      
      if (data.files && data.files.length > 0) {
        // 各月次ファイルの内容を取得
        const invoicesData = []
        for (const file of data.files) {
          try {
            const content = await googleApiClient.getFileContentAsText(token, file.id)
            if (content && content.trim()) {
              // JSONL形式の内容をパース
              const lines = content.split('\n').filter(line => line.trim())
              for (const line of lines) {
                try {
                  const invoiceData = JSON.parse(line)
                  // Invoiceインスタンスに変換
                  const invoice = Invoice.fromData(invoiceData)
                  invoicesData.push(invoice)
                } catch (parseErr) {
                  console.warn('Failed to parse invoice line:', line, parseErr)
                }
              }
            }
          } catch (err) {
            console.warn('Failed to load monthly invoice file:', file.name, err)
          }
        }
        
        invoices.value = invoicesData

        console.log(`✅ Loaded ${invoicesData.length} invoices for year ${year}`)
      } else {
        invoices.value = []
      }
      
    } catch (err) {
      console.error('Failed to load invoices:', err)
      throw err
    }
  }
  
  const createInvoice = async (invoiceData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 請求書IDの生成（顧客IDと期間から固定IDを生成）
      const invoiceId = generateInvoiceId(invoiceData.customerId, invoiceData.period)
      
      // 現在の日時を取得（JST）
      const now = new Date()
      const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
      const createdAt = jstNow.toISOString().replace('Z', '+09:00')
      
      // detailsをInvoiceDetailインスタンスの配列に変換
      const invoiceDetails = invoiceData.details.map(detailData => InvoiceDetail.fromData(detailData))
      
      // summaryを計算（detailsから）
      const invoiceSummary = InvoiceSummary.calculateFromDetails(invoiceDetails)
      
      // 請求書データの作成
      const invoiceDataWithId = {
        id: invoiceId,
        customerId: invoiceData.customerId,
        customerName: invoiceData.customerName,
        period: invoiceData.period,
        closingDay: invoiceData.closingDay,
        paymentMethod: invoiceData.paymentMethod,
        summary: invoiceSummary.toJSON(), // InvoiceSummaryをJSONに変換
        details: invoiceDetails.map(detail => detail.toJSON()), // InvoiceDetailをJSONに変換
        createdAt: createdAt
      }
      
      // Invoiceインスタンスを作成
      const newInvoice = Invoice.fromData(invoiceDataWithId)
      
      // バリデーション
      newInvoice.validate()
      
      // invoicesフォルダIDの取得
      const invoicesFolderId = await getInvoicesFolderId(token)
      
      // 月次ファイル名の生成（YYYY-MM-invoices.jsonl）
      const yearMonth = invoiceData.period.replace('年', '-').replace('月分', '')
      const fileName = `${yearMonth}-invoices.jsonl`
      
      // 月次ファイルを更新（InvoiceインスタンスをJSONに変換）
      await updateMonthlyInvoices(token, invoicesFolderId, fileName, newInvoice.toJSON())
      
      // ローカルの状態を更新
      const existingIndex = invoices.value.findIndex(inv => inv.id === newInvoice.id)
      if (existingIndex !== -1) {
        invoices.value[existingIndex] = newInvoice
      } else {
        invoices.value.unshift(newInvoice)
      }
      
      return newInvoice
      
    } catch (err) {
      console.error('Failed to create invoice:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const bulkCreateInvoices = async (invoicesDataArray) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      if (!invoicesDataArray || invoicesDataArray.length === 0) {
        throw new Error('作成する請求書データがありません')
      }
      
      // invoicesフォルダIDの取得
      const invoicesFolderId = await getInvoicesFolderId(token)
      
      // 月別に請求書データをグループ化
      const invoicesByMonth = {}
      
      for (const invoiceData of invoicesDataArray) {
        // 請求書IDの生成（顧客IDと期間から固定IDを生成）
        const invoiceId = generateInvoiceId(invoiceData.customerId, invoiceData.period)
        
        // 現在の日時を取得（JST）
        const now = new Date()
        const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
        const createdAt = jstNow.toISOString().replace('Z', '+09:00')
        
        // detailsをInvoiceDetailインスタンスの配列に変換
        const invoiceDetails = invoiceData.details.map(detailData => InvoiceDetail.fromData(detailData))
        
        // summaryを計算（detailsから）
        const invoiceSummary = InvoiceSummary.calculateFromDetails(invoiceDetails)
        
        // 請求書データの作成
        const invoiceDataWithId = {
          id: invoiceId,
          customerId: invoiceData.customerId,
          customerName: invoiceData.customerName,
          period: invoiceData.period,
          closingDay: invoiceData.closingDay,
          paymentMethod: invoiceData.paymentMethod,
          summary: invoiceSummary.toJSON(), // InvoiceSummaryをJSONに変換
          details: invoiceDetails.map(detail => detail.toJSON()), // InvoiceDetailをJSONに変換
          createdAt: createdAt
        }
        
        // Invoiceインスタンスを作成
        const newInvoice = Invoice.fromData(invoiceDataWithId)
        
        // バリデーション
        newInvoice.validate()
        
        // 月次ファイル名の生成
        const yearMonth = invoiceData.period.replace('年', '-').replace('月分', '')
        const fileName = `${yearMonth}-invoices.jsonl`
        
        if (!invoicesByMonth[fileName]) {
          invoicesByMonth[fileName] = []
        }
        // JSON形式で保存するため、toJSON()を使用
        invoicesByMonth[fileName].push(newInvoice.toJSON())
      }
      
      // 各月次ファイルを更新
      for (const [fileName, monthInvoices] of Object.entries(invoicesByMonth)) {
        for (const invoiceData of monthInvoices) {
          await updateMonthlyInvoices(token, invoicesFolderId, fileName, invoiceData)
        }
      }
      
      // ローカルの状態を更新（JSON形式からInvoiceインスタンスに変換）
      for (const monthInvoices of Object.values(invoicesByMonth)) {
        for (const invoiceData of monthInvoices) {
          const invoice = Invoice.fromData(invoiceData)
          const existingIndex = invoices.value.findIndex(inv => inv.id === invoice.id)
          if (existingIndex !== -1) {
            invoices.value[existingIndex] = invoice
          } else {
            invoices.value.unshift(invoice)
          }
        }
      }
      
      return invoicesDataArray.length
      
    } catch (err) {
      console.error('Failed to bulk create invoices:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const searchInvoices = async (filters = {}) => {
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
      
      // invoicesフォルダの取得または作成
      const invoicesFolder = await getOrCreateInvoicesFolder(token, appFolder.id)
      
      // 検索クエリの構築
      let query = `'${invoicesFolder.id}' in parents and name contains '-invoices.jsonl' and trashed=false`
      
      // 期間フィルタ（月次ファイル名で絞り込み）
      if (filters.period) {
        const yearMonth = filters.period.replace('-', '')
        query += ` and name contains '${yearMonth}-invoices.jsonl'`
      }
      
      const data = await googleApiClient.searchFiles(token, query, 'files(id,name)', 'name desc')
      
      if (data.files && data.files.length > 0) {
        // 各月次ファイルの内容を取得
        const invoicesData = []
        for (const file of data.files) {
          try {
            const content = await googleApiClient.getFileContentAsText(token, file.id)
            if (content && content.trim()) {
              // JSONL形式の内容をパース
              const lines = content.split('\n').filter(line => line.trim())
              for (const line of lines) {
                try {
                  const invoiceData = JSON.parse(line)
                  // Invoiceインスタンスに変換
                  const invoice = Invoice.fromData(invoiceData)
                  
                  // 追加のフィルタリング（クライアント側）
                  let include = true
                  
                  // 顧客名フィルタ
                  if (filters.customerName && !invoice.customerName.includes(filters.customerName)) {
                    include = false
                  }
                  
                  if (include) {
                    invoicesData.push(invoice)
                  }
                } catch (parseErr) {
                  console.warn('Failed to parse invoice line:', line, parseErr)
                }
              }
            }
          } catch (err) {
            console.warn('Failed to load monthly invoice file:', file.name, err)
          }
        }
        
        // 作成日時でソート
        invoicesData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        
        return invoicesData
      } else {
        return []
      }
      
    } catch (err) {
      console.error('Failed to search invoices:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const getInvoiceById = (invoiceId) => {
    return invoices.value.find(invoice => invoice.id === invoiceId)
  }
  
  
  // ヘルパー関数
  const generateInvoiceId = (customerId, period) => {
    // 顧客IDと期間から固定の請求書IDを生成
    // 同じ顧客・同じ期間の請求書は同じIDになるため、上書きされる
    // period形式: "2025年1月分" -> "2025-01" -> "202501"
    const yearMonth = period.replace('年', '-').replace('月分', '')
    const [year, month] = yearMonth.split('-')
    const dateStr = `${year}${String(parseInt(month)).padStart(2, '0')}` // 202501
    // customerIdからプレフィックス（cus_）を除去して使用
    const customerIdShort = customerId.replace('cus_', '')
    const invoiceId = `inv_${customerIdShort}_${dateStr}`
    console.log('🔍 Generated Invoice ID:', invoiceId, 'from customerId:', customerId, 'period:', period)
    return invoiceId
  }
  
  // Google Drive API ヘルパー関数
  const getInvoicesFolderId = async (token) => {
    try {
      const authStore = useAuthStore()
      
      try {
        // まず既存のフォルダIDを取得を試行
        const result = await authStore.getSubFolderId('invoices')
        console.log('🔍 getInvoicesFolderId result:', result)
        
        if (!result || !result.id) {
          throw new Error('invoicesフォルダIDが取得できませんでした')
        }
        
        return result.id
      } catch (getErr) {
        console.log('⚠️ Failed to get existing invoices folder, trying to create...', getErr.message)
        
        // フォルダが存在しない場合は作成を試行
        try {
          console.log('📁 Creating invoices folder...')
          const appFolder = await authStore.getAppFolderId()
          const newFolder = await googleApiClient.createFolder(token, 'invoices', appFolder.id)
          console.log('✅ Created invoices folder:', newFolder.id)
          
          // ローカルストレージに保存
          localStorage.setItem('invoicy_invoices_folder_id', newFolder.id)
          
          return newFolder.id
        } catch (createErr) {
          console.error('❌ Failed to create invoices folder:', createErr)
          throw new Error(`invoicesフォルダの作成に失敗しました: ${createErr.message}`)
        }
      }
    } catch (err) {
      console.error('Failed to get invoices folder ID:', err)
      throw err
    }
  }
  
  const updateMonthlyInvoices = async (token, invoicesFolderId, fileName, newInvoice) => {
    try {
      // 既存の月次ファイルを検索
      const query = `name='${fileName}' and '${invoicesFolderId}' in parents and trashed=false`
      const data = await googleApiClient.searchFiles(token, query)
      let existingInvoices = []
      
      if (data.files && data.files.length > 0) {
        // 既存ファイルが存在する場合、内容を取得
        const file = data.files[0]
        const content = await googleApiClient.getFileContentAsText(token, file.id)
        if (content && content.trim()) {
          // JSONL形式の内容をパース
          const lines = content.split('\n').filter(line => line.trim())
          for (const line of lines) {
            try {
              const invoice = JSON.parse(line)
              existingInvoices.push(invoice)
            } catch (parseErr) {
              console.warn('Failed to parse invoice line:', line, parseErr)
            }
          }
        }
      }
      
      // 同じIDの請求書を削除（上書き準備）
      const beforeCount = existingInvoices.length
      const filteredInvoices = existingInvoices.filter(inv => inv.id !== newInvoice.id)
      const removedCount = beforeCount - filteredInvoices.length
      
      if (removedCount > 0) {
        console.log(`✅ Found existing invoice with ID: ${newInvoice.id}, will be overwritten`)
      } else {
        console.log(`ℹ️ No existing invoice found with ID: ${newInvoice.id}, will be added as new`)
      }
      
      // 新しい請求書を追加
      const updatedInvoices = [...filteredInvoices, newInvoice]
      
      // JSONL形式でファイル内容を作成
      const jsonlContent = updatedInvoices.map(invoice => JSON.stringify(invoice)).join('\n')
      
      if (data.files && data.files.length > 0) {
        // 既存ファイルを更新
        const file = data.files[0]
        await googleApiClient.updateFileContentAsText(token, file.id, jsonlContent)
      } else {
        // 新しいファイルを作成
        const fileData = {
          name: fileName,
          parents: [invoicesFolderId]
        }
        const createResponse = await googleApiClient.createFile(token, fileData)
        const file = await createResponse.json()
        await googleApiClient.updateFileContentAsText(token, file.id, jsonlContent)
      }
      
    } catch (err) {
      console.error('Failed to update monthly invoices:', err)
      throw err
    }
  }
  
  const removeInvoiceFromMonthlyFile = async (token, invoicesFolderId, fileName, invoiceId) => {
    try {
      // 既存の月次ファイルを検索
      const query = `name='${fileName}' and '${invoicesFolderId}' in parents and trashed=false`
      const data = await googleApiClient.searchFiles(token, query)
      
      if (data.files && data.files.length > 0) {
        const file = data.files[0]
        const content = await googleApiClient.getFileContentAsText(token, file.id)
        
        if (content && content.trim()) {
          // JSONL形式の内容をパース
          const lines = content.split('\n').filter(line => line.trim())
          const existingInvoices = []
          
          for (const line of lines) {
            try {
              const invoice = JSON.parse(line)
              if (invoice.id !== invoiceId) {
                existingInvoices.push(invoice)
              }
            } catch (parseErr) {
              console.warn('Failed to parse invoice line:', line, parseErr)
            }
          }
          
          // ファイルが空になったら削除
          if (existingInvoices.length === 0) {
            console.log(`🗑️ File ${fileName} is empty after deletion, removing file...`)
            await googleApiClient.deleteFile(token, file.id)
            return { fileDeleted: true }
          } else {
            // 更新された内容でファイルを更新
            const jsonlContent = existingInvoices.map(invoice => JSON.stringify(invoice)).join('\n')
            await googleApiClient.updateFileContentAsText(token, file.id, jsonlContent)
            return { fileDeleted: false }
          }
        } else {
          // ファイルが空の場合は削除
          console.log(`🗑️ File ${fileName} is empty, removing file...`)
          await googleApiClient.deleteFile(token, file.id)
          return { fileDeleted: true }
        }
      }
      
      return { fileDeleted: false }
      
    } catch (err) {
      console.error('Failed to remove invoice from monthly file:', err)
      throw err
    }
  }

  const deleteInvoice = async (invoiceId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 削除対象の請求書を検索
      const invoiceToDelete = invoices.value.find(inv => inv.id === invoiceId)
      if (!invoiceToDelete) {
        throw new Error('削除対象の請求書が見つかりません')
      }
      
      // invoicesフォルダIDの取得
      const invoicesFolderId = await getInvoicesFolderId(token)
      
      // 月次ファイル名の生成（YYYY-MM-invoices.jsonl）
      const yearMonth = invoiceToDelete.period.replace('年', '-').replace('月分', '')
      const fileName = `${yearMonth}-invoices.jsonl`
      
      // 月次ファイルから請求書を削除
      await removeInvoiceFromMonthlyFile(token, invoicesFolderId, fileName, invoiceId)
      
      // ローカルの状態から削除
      const index = invoices.value.findIndex(inv => inv.id === invoiceId)
      if (index !== -1) {
        invoices.value.splice(index, 1)
      }
      
    } catch (err) {
      console.error('Failed to delete invoice:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    // State
    invoices,
    isLoading,
    error,
    selectedInvoice,
    
    // Computed
    invoicesCount,
    sortedInvoices,
    
    // Actions
    initializeInvoices,
    loadInvoices,
    createInvoice,
    bulkCreateInvoices,
    searchInvoices,
    getInvoiceById,
    deleteInvoice
  }
})

