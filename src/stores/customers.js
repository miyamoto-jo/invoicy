import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { APP_CONFIG } from '../config/api.js'
import { googleApiClient } from '../services/googleApi.js'

export const useCustomersStore = defineStore('customers', () => {
  // State
  const customers = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const selectedCustomer = ref(null)
  
  // Computed
  const customersCount = computed(() => customers.value.length)
  const sortedCustomers = computed(() => {
    return [...customers.value].sort((a, b) => {
      return a.name.localeCompare(b.name, 'ja')
    })
  })
  
  // Google Drive API設定
  const CUSTOMERS_FILE = `masters/${APP_CONFIG.FILES.CUSTOMERS}`
  
  // Actions
  const initializeCustomers = async () => {
    try {
      isLoading.value = true
      error.value = null
      await loadCustomers()
    } catch (err) {
      console.error('Failed to initialize customers:', err)
      error.value = '顧客データの初期化に失敗しました'
    } finally {
      isLoading.value = false
    }
  }
  
  const loadCustomers = async () => {
    try {
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // アプリフォルダの取得（認証ストアから）
      const appFolder = await authStore.getAppFolderId()
      
      // 顧客ファイルの取得または作成
      const customersFile = await getOrCreateCustomersFile(token, appFolder.id)
      
      // ファイルの内容を取得
      const content = await googleApiClient.getFileContent(token, customersFile.id)
      
      if (content && typeof content === 'string' && content.trim()) {
        // JSONL形式の文字列を行ごとにパース
        const lines = content.trim().split('\n')
        const parsedCustomers = []
        for (const line of lines) {
          if (line.trim()) {
            try {
              const customer = JSON.parse(line)
              // 必要な情報のみを抽出
              const essentialCustomer = {
                id: customer.id,
                name: customer.name,
                closingDay: customer.closingDay,
                paymentMethod: customer.paymentMethod,
                alias: customer.alias,
                address: customer.address,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt
              }
              parsedCustomers.push(essentialCustomer)
            } catch (err) {
              console.warn('Invalid JSON line in customers.jsonl:', line, err)
            }
          }
        }
        customers.value = parsedCustomers
        
      } else {
        customers.value = []
      }
      
    } catch (err) {
      console.error('Failed to load customers:', err)
      throw err
    }
  }
  
  const createCustomer = async (customerData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // バリデーション
      if (!customerData.name || customerData.name.trim() === '') {
        throw new Error('顧客名は必須です')
      }
      
      // 顧客IDの生成
      const customerId = `cus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 顧客データの作成
      const newCustomer = {
        id: customerId,
        name: customerData.name.trim(),
        alias: customerData.alias?.trim() || '',
        address: customerData.address?.trim() || '',
        closingDay: customerData.closingDay,
        paymentMethod: customerData.paymentMethod,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // 必要な情報のみを抽出
      const essentialCustomer = {
        id: newCustomer.id,
        name: newCustomer.name,
        closingDay: newCustomer.closingDay,
        paymentMethod: newCustomer.paymentMethod,
        alias: newCustomer.alias,
        address: newCustomer.address,
        createdAt: newCustomer.createdAt,
        updatedAt: newCustomer.updatedAt
      }
      
      // ローカル状態に追加
      customers.value.push(essentialCustomer)
      
      // ファイルを更新
      await saveCustomersToFile(token)
      
      console.log('Customer created successfully:', essentialCustomer)
      
      return essentialCustomer
      
    } catch (err) {
      console.error('Failed to create customer:', err)
      error.value = err.message || '顧客の作成に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const bulkCreateCustomers = async (customersData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      if (!Array.isArray(customersData) || customersData.length === 0) {
        throw new Error('顧客データが正しくありません')
      }
      
      // バリデーション
      const validationErrors = []
      customersData.forEach((customerData, index) => {
        if (!customerData.name || customerData.name.trim() === '') {
          validationErrors.push(`顧客${index + 1}: 顧客名は必須です`)
        }
        if (!customerData.closingDay) {
          validationErrors.push(`顧客${index + 1}: 締め日は必須です`)
        } else if (customerData.closingDay !== '末日' && (customerData.closingDay < 1 || customerData.closingDay > 31)) {
          validationErrors.push(`顧客${index + 1}: 締め日は1〜31の範囲または末日で入力してください`)
        }
        if (!customerData.paymentMethod) {
          validationErrors.push(`顧客${index + 1}: お支払い方法は必須です`)
        }
      })
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'))
      }
      
      // 各顧客を作成
      const createdCustomers = []
      for (const customerData of customersData) {
        try {
          // 顧客IDの生成
          const customerId = `cus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          // 顧客データの作成
          const newCustomer = {
            id: customerId,
            name: customerData.name.trim(),
            alias: customerData.alias?.trim() || '',
            address: customerData.address?.trim() || '',
            closingDay: customerData.closingDay,
            paymentMethod: customerData.paymentMethod,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          // 必要な情報のみを抽出
          const essentialCustomer = {
            id: newCustomer.id,
            name: newCustomer.name,
            closingDay: newCustomer.closingDay,
            paymentMethod: newCustomer.paymentMethod,
            alias: newCustomer.alias,
            address: newCustomer.address,
            createdAt: newCustomer.createdAt,
            updatedAt: newCustomer.updatedAt
          }
          
          // ローカル状態に追加
          customers.value.push(essentialCustomer)
          createdCustomers.push(essentialCustomer)
          
        } catch (err) {
          console.error(`Failed to create customer ${customerData.name}:`, err)
          throw new Error(`顧客「${customerData.name}」の作成に失敗しました: ${err.message}`)
        }
      }
      
      // ファイルを更新
      await saveCustomersToFile(token)
      
      return createdCustomers
      
    } catch (err) {
      console.error('Failed to bulk create customers:', err)
      error.value = err.message || '顧客の一括作成に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const updateCustomer = async (customerId, customerData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // バリデーション
      if (!customerData.name || customerData.name.trim() === '') {
        throw new Error('顧客名は必須です')
      }
      
      // 既存の顧客を検索
      const customerIndex = customers.value.findIndex(c => c.id === customerId)
      if (customerIndex === -1) {
        throw new Error('顧客が見つかりません')
      }
      
      // 顧客データを更新
      const updatedCustomer = {
        ...customers.value[customerIndex],
        name: customerData.name.trim(),
        alias: customerData.alias?.trim() || '',
        address: customerData.address?.trim() || '',
        closingDay: customerData.closingDay,
        paymentMethod: customerData.paymentMethod,
        updatedAt: new Date().toISOString()
      }
      
      // 必要な情報のみを抽出
      const essentialCustomer = {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        closingDay: updatedCustomer.closingDay,
        paymentMethod: updatedCustomer.paymentMethod,
        alias: updatedCustomer.alias,
        address: updatedCustomer.address,
        createdAt: updatedCustomer.createdAt,
        updatedAt: updatedCustomer.updatedAt
      }
      
      // ローカル状態を更新
      customers.value[customerIndex] = essentialCustomer
      
      // ファイルを更新
      await saveCustomersToFile(token)
      
      console.log('Customer updated successfully:', essentialCustomer)
      
      return essentialCustomer
      
    } catch (err) {
      console.error('Failed to update customer:', err)
      error.value = err.message || '顧客の更新に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const deleteCustomer = async (customerId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 既存の顧客を検索
      const customerIndex = customers.value.findIndex(c => c.id === customerId)
      if (customerIndex === -1) {
        throw new Error('顧客が見つかりません')
      }
      
      // ローカル状態から削除
      customers.value.splice(customerIndex, 1)
      
      // ファイルを更新
      await saveCustomersToFile(token)
      
      console.log('Customer deleted successfully')
      
    } catch (err) {
      console.error('Failed to delete customer:', err)
      error.value = err.message || '顧客の削除に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const getCustomerById = (customerId) => {
    return customers.value.find(c => c.id === customerId)
  }
  
  const searchCustomers = (query) => {
    if (!query || query.trim() === '') {
      return sortedCustomers.value
    }
    
    const searchTerm = query.toLowerCase()
    return sortedCustomers.value.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.alias.toLowerCase().includes(searchTerm) ||
      customer.address.toLowerCase().includes(searchTerm)
    )
  }
  
  // Google Drive API ヘルパー関数
  const getOrCreateCustomersFile = async (token, appFolderId) => {
    try {
      // mastersフォルダの取得または作成
      const mastersFolder = await getOrCreateFolder(token, appFolderId, 'masters')
      
      // customers.jsonlファイルを検索
      const query = `name='${APP_CONFIG.FILES.CUSTOMERS}' and '${mastersFolder.id}' in parents and trashed=false`
      const searchResult = await googleApiClient.searchFiles(token, query)
      
      if (searchResult.files && searchResult.files.length > 0) {
        return searchResult.files[0]
      }
      
      // customers.jsonlファイルを作成
      const fileData = {
        name: APP_CONFIG.FILES.CUSTOMERS,
        parents: [mastersFolder.id]
      }
      const createResponse = await googleApiClient.createFile(token, fileData)
      const file = await createResponse.json()
      
      // 初期データ（空のJSONLファイル）を設定
      await googleApiClient.updateFileContent(token, file.id, '')
      
      return file
      
    } catch (err) {
      console.error('Failed to get or create customers file:', err)
      throw err
    }
  }
  
  const saveCustomersToFile = async (token) => {
    try {
      const authStore = useAuthStore()
      const appFolder = await authStore.getAppFolderId()
      const customersFile = await getOrCreateCustomersFile(token, appFolder.id)
      
      // ファイルの内容を更新（JSONL形式）
      const jsonlContent = customers.value.map(customer => JSON.stringify(customer)).join('\n')
      await googleApiClient.updateFileContent(token, customersFile.id, jsonlContent)
      
    } catch (err) {
      console.error('Failed to save customers to file:', err)
      throw err
    }
  }
  
  const getOrCreateFolder = async (token, parentId, folderName) => {
    try {
      // フォルダを検索
      const searchResult = await googleApiClient.searchFolder(token, folderName, parentId)
      
      if (searchResult.files && searchResult.files.length > 0) {
        return searchResult.files[0]
      }
      
      // フォルダを作成
      return await googleApiClient.createFolder(token, folderName, parentId)
      
    } catch (err) {
      console.error('Failed to get or create folder:', err)
      throw err
    }
  }
  
  
  return {
    // State
    customers,
    isLoading,
    error,
    selectedCustomer,
    
    // Computed
    customersCount,
    sortedCustomers,
    
    // Actions
    initializeCustomers,
    loadCustomers,
    createCustomer,
    bulkCreateCustomers,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    searchCustomers
  }
}) 