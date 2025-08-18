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
  const CUSTOMERS_FOLDER = 'masters/customers'
  
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
      
      // 顧客フォルダの取得または作成
      const customersFolder = await getOrCreateFolder(token, appFolder.id, CUSTOMERS_FOLDER)
      
      // 顧客ファイルの一覧を取得
      const files = await listFiles(token, customersFolder.id)
      
      // 各ファイルの内容を取得
      const customersData = []
      for (const file of files) {
        try {
          const content = await getFileContent(token, file.id)
          if (content) {
            customersData.push(content)
          }
        } catch (err) {
          console.error(`Failed to load customer file ${file.name}:`, err)
        }
      }
      
      customers.value = customersData
      
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
      
      // アプリフォルダの取得（認証ストアから）
      const appFolder = await authStore.getAppFolderId()
      
      // 顧客フォルダの取得または作成
      const customersFolder = await getOrCreateFolder(token, appFolder.id, CUSTOMERS_FOLDER)
      
      // 顧客ファイルを作成
      await createFile(token, customersFolder.id, `${customerId}.json`, newCustomer)
      
      // ローカル状態を更新
      customers.value.push(newCustomer)
      
      return newCustomer
      
    } catch (err) {
      console.error('Failed to create customer:', err)
      error.value = err.message || '顧客の作成に失敗しました'
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
      
      // アプリフォルダの取得（認証ストアから）
      const appFolder = await authStore.getAppFolderId()
      
      // 顧客フォルダの取得または作成
      const customersFolder = await getOrCreateFolder(token, appFolder.id, CUSTOMERS_FOLDER)
      
      // 顧客ファイルを検索
      const files = await listFiles(token, customersFolder.id)
      const customerFile = files.find(f => f.name === `${customerId}.json`)
      
      if (!customerFile) {
        throw new Error('顧客ファイルが見つかりません')
      }
      
      // 顧客ファイルを更新
      await updateFile(token, customerFile.id, updatedCustomer)
      
      // ローカル状態を更新
      const index = customers.value.findIndex(c => c.id === customerId)
      if (index !== -1) {
        customers.value[index] = updatedCustomer
      }
      
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
      
      // アプリフォルダの取得（認証ストアから）
      const appFolder = await authStore.getAppFolderId()
      
      // 顧客フォルダの取得または作成
      const customersFolder = await getOrCreateFolder(token, appFolder.id, CUSTOMERS_FOLDER)
      
      // 顧客ファイルを検索
      const files = await listFiles(token, customersFolder.id)
      const customerFile = files.find(f => f.name === `${customerId}.json`)
      
      if (!customerFile) {
        throw new Error('顧客ファイルが見つかりません')
      }
      
      // 顧客ファイルを削除（論理削除）
      await deleteFile(token, customerFile.id)
      
      // ローカル状態を更新
      const index = customers.value.findIndex(c => c.id === customerId)
      if (index !== -1) {
        customers.value.splice(index, 1)
      }
      
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
  
  const listFiles = async (token, folderId) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      if (!response.ok) {
        throw new Error('ファイル一覧の取得に失敗しました')
      }
      
      const data = await response.json()
      return data.files || []
      
    } catch (err) {
      console.error('Failed to list files:', err)
      throw err
    }
  }
  
  const createFile = async (token, folderId, fileName, content) => {
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId]
        })
      })
      
      if (!response.ok) {
        throw new Error('ファイルの作成に失敗しました')
      }
      
      const file = await response.json()
      
      // ファイルの内容を更新
      await updateFileContent(token, file.id, content)
      
      return file
      
    } catch (err) {
      console.error('Failed to create file:', err)
      throw err
    }
  }
  
  const updateFile = async (token, fileId, content) => {
    try {
      await updateFileContent(token, fileId, content)
    } catch (err) {
      console.error('Failed to update file:', err)
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
  
  const deleteFile = async (token, fileId) => {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('ファイルの削除に失敗しました')
      }
      
    } catch (err) {
      console.error('Failed to delete file:', err)
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
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    searchCustomers
  }
}) 