import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

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
  const CUSTOMERS_FILE = 'masters/customers.json'
  
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
      const content = await getFileContent(token, customersFile.id)
      
      if (content && Array.isArray(content)) {
        customers.value = content
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // ローカル状態を更新
      customers.value.push(newCustomer)
      
      // ファイルを更新
      await saveCustomersToFile(token)
      
      return newCustomer
      
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          // ローカル状態を更新
          customers.value.push(newCustomer)
          createdCustomers.push(newCustomer)
          
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
      const existingCustomer = customers.value.find(c => c.id === customerId)
      if (!existingCustomer) {
        throw new Error('顧客が見つかりません')
      }
      
      // 顧客データの更新
      const updatedCustomer = {
        ...existingCustomer,
        name: customerData.name.trim(),
        alias: customerData.alias?.trim() || '',
        address: customerData.address?.trim() || '',
        updatedAt: new Date().toISOString()
      }
      
      // ローカル状態を更新
      const index = customers.value.findIndex(c => c.id === customerId)
      if (index !== -1) {
        customers.value[index] = updatedCustomer
      }
      
      // ファイルを更新
      await saveCustomersToFile(token)
      
      return updatedCustomer
      
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
      const existingCustomer = customers.value.find(c => c.id === customerId)
      if (!existingCustomer) {
        throw new Error('顧客が見つかりません')
      }
      
      // ローカル状態を更新
      const index = customers.value.findIndex(c => c.id === customerId)
      if (index !== -1) {
        customers.value.splice(index, 1)
      }
      
      // ファイルを更新
      await saveCustomersToFile(token)
      
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
      
      // customers.jsonファイルを検索
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='customers.json' and '${mastersFolder.id}' in parents and trashed=false`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('ファイルの検索に失敗しました')
      }
      
      const data = await response.json()
      
      if (data.files && data.files.length > 0) {
        return data.files[0]
      }
      
      // customers.jsonファイルを作成
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'customers.json',
          parents: [mastersFolder.id]
        })
      })
      
      if (!createResponse.ok) {
        throw new Error('ファイルの作成に失敗しました')
      }
      
      const file = await createResponse.json()
      
      // 初期データ（空の配列）を設定
      await updateFileContent(token, file.id, [])
      
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
      
      // ファイルの内容を更新
      await updateFileContent(token, customersFile.id, customers.value)
      
    } catch (err) {
      console.error('Failed to save customers to file:', err)
      throw err
    }
  }
  
  const getOrCreateFolder = async (token, parentId, folderName) => {
    try {
      // フォルダを検索
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('フォルダの検索に失敗しました')
      }
      
      const data = await response.json()
      
      if (data.files && data.files.length > 0) {
        return data.files[0]
      }
      
      // フォルダを作成
      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        })
      })
      
      if (!createResponse.ok) {
        throw new Error('フォルダの作成に失敗しました')
      }
      
      return await createResponse.json()
      
    } catch (err) {
      console.error('Failed to get or create folder:', err)
      throw err
    }
  }
  
  const updateFileContent = async (token, fileId, content) => {
    try {
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(content)
      })
      
      if (!response.ok) {
        throw new Error('ファイル内容の更新に失敗しました')
      }
      
      return await response.json()
      
    } catch (err) {
      console.error('Failed to update file content:', err)
      throw err
    }
  }
  
  const getFileContent = async (token, fileId) => {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('ファイル内容の取得に失敗しました')
      }
      
      return await response.json()
      
    } catch (err) {
      console.error('Failed to get file content:', err)
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