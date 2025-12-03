import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { APP_CONFIG } from '../config/api.js'
import { googleApiClient } from '../services/googleApi.js'
import { Product } from '../models/Product.js'

export const useProductsStore = defineStore('products', () => {
  // State
  const products = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const selectedProduct = ref(null)
  
  // Computed
  const productsCount = computed(() => products.value.length)
  const sortedProducts = computed(() => {
    return [...products.value].sort((a, b) => {
      return a.name.localeCompare(b.name, 'ja')
    })
  })
  
  // Google Drive API設定
  const PRODUCTS_FILE = `masters/${APP_CONFIG.FILES.PRODUCTS}`
  
  // Actions
  const initializeProducts = async () => {
    try {
      isLoading.value = true
      error.value = null
      await loadProducts()
    } catch (err) {
      console.error('Failed to initialize products:', err)
      error.value = '商品データの初期化に失敗しました'
    } finally {
      isLoading.value = false
    }
  }
  
  const loadProducts = async () => {
    try {
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // アプリフォルダの取得（認証ストアから）
      const appFolder = await authStore.getAppFolderId()
      
      // 商品ファイルの取得または作成
      const productsFile = await getOrCreateProductsFile(token, appFolder.id)
      
      // ファイルの内容を取得
      const content = await googleApiClient.getFileContent(token, productsFile.id)
      
      if (content && typeof content === 'string' && content.trim()) {
        // JSONL形式の文字列を行ごとにパース
        const lines = content.trim().split('\n')
        const parsedProducts = []
        for (const line of lines) {
          if (line.trim()) {
            try {
              const productData = JSON.parse(line)
              // Productインスタンスに変換
              const product = Product.fromData(productData)
              parsedProducts.push(product)
            } catch (err) {
              console.warn('Invalid JSON line in products.jsonl:', line, err)
            }
          }
        }
        products.value = parsedProducts
      } else {
        products.value = []
      }
      
    } catch (err) {
      console.error('Failed to load products:', err)
      throw err
    }
  }
  
  const createProduct = async (productData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 商品IDの生成
      const productId = `prd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 商品データの作成
      const productDataWithId = {
        id: productId,
        name: productData.name.trim(),
        alias: productData.alias?.trim() || '',
        priceExclTax: Number(productData.price),
        usedByCustomerIds: productData.customerId ? [productData.customerId] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Productインスタンスを作成
      const newProduct = new Product(productDataWithId)
      
      // バリデーション
      newProduct.validateName()
      newProduct.validatePrice()
      
      // ローカル状態を更新
      products.value.push(newProduct)
      
      // ファイルを更新
      await saveProductsToFile(token)
      
      return newProduct
      
    } catch (err) {
      console.error('Failed to create product:', err)
      error.value = err.message || '商品の作成に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const bulkCreateProducts = async (productsData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      if (!Array.isArray(productsData) || productsData.length === 0) {
        throw new Error('商品データが正しくありません')
      }
      
      // バリデーション
      const validationErrors = []
      productsData.forEach((productData, index) => {
        if (!productData.name || productData.name.trim() === '') {
          validationErrors.push(`商品${index + 1}: 商品名は必須です`)
        }
        
        if (!productData.price || isNaN(productData.price) || Number(productData.price) < 0) {
          validationErrors.push(`商品${index + 1}: 税抜金額は0以上の数値を入力してください`)
        }
      })
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'))
      }
      
      // 各商品を作成
      const createdProducts = []
      for (const productData of productsData) {
        try {
          // 商品IDの生成
          const productId = `prd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          
          // 商品データの作成
          const productDataWithId = {
            id: productId,
            name: productData.name.trim(),
            alias: productData.alias?.trim() || '',
            priceExclTax: Number(productData.price),
            usedByCustomerIds: productData.customerId ? [productData.customerId] : [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          // Productインスタンスを作成
          const newProduct = new Product(productDataWithId)
          
          // バリデーション
          newProduct.validateName()
          newProduct.validatePrice()
          
          // ローカル状態を更新
          products.value.push(newProduct)
          createdProducts.push(newProduct)
          
        } catch (err) {
          console.error(`Failed to create product ${productData.name}:`, err)
          throw new Error(`商品「${productData.name}」の作成に失敗しました: ${err.message}`)
        }
      }
      
      // ファイルを更新
      await saveProductsToFile(token)
      
      return createdProducts
      
    } catch (err) {
      console.error('Failed to bulk create products:', err)
      error.value = err.message || '商品の一括作成に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const updateProduct = async (productId, productData) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 既存の商品を検索
      const existingProduct = products.value.find(p => p.id === productId)
      if (!existingProduct) {
        throw new Error('商品が見つかりません')
      }
      
      // 既存の商品データを取得して更新
      const updatedProductData = {
        ...existingProduct.toJSON(),
        name: productData.name.trim(),
        alias: productData.alias?.trim() || '',
        priceExclTax: Number(productData.price),
        usedByCustomerIds: productData.customerId ? [productData.customerId] : [],
        updatedAt: new Date().toISOString()
      }
      
      // Productインスタンスを作成
      const updatedProduct = new Product(updatedProductData)
      
      // バリデーション
      updatedProduct.validateName()
      updatedProduct.validatePrice()
      
      // ローカル状態を更新
      const index = products.value.findIndex(p => p.id === productId)
      if (index !== -1) {
        products.value[index] = updatedProduct
      }
      
      // ファイルを更新
      await saveProductsToFile(token)
      
      return updatedProduct
      
    } catch (err) {
      console.error('Failed to update product:', err)
      error.value = err.message || '商品の更新に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const deleteProduct = async (productId) => {
    try {
      isLoading.value = true
      error.value = null
      
      const authStore = useAuthStore()
      const token = authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンがありません')
      }
      
      // 既存の商品を検索
      const existingProduct = products.value.find(p => p.id === productId)
      if (!existingProduct) {
        throw new Error('商品が見つかりません')
      }
      
      // ローカル状態を更新
      const index = products.value.findIndex(p => p.id === productId)
      if (index !== -1) {
        products.value.splice(index, 1)
      }
      
      // ファイルを更新
      await saveProductsToFile(token)
      
    } catch (err) {
      console.error('Failed to delete product:', err)
      error.value = err.message || '商品の削除に失敗しました'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  const getProductById = (productId) => {
    return products.value.find(p => p.id === productId)
  }
  
  const searchProducts = (query) => {
    if (!query || query.trim() === '') {
      return sortedProducts.value
    }
    
    const searchTerm = query.toLowerCase()
    return sortedProducts.value.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.alias.toLowerCase().includes(searchTerm)
    )
  }
  
  const getProductsByCustomer = (customerId) => {
    return products.value.filter(product => product.customerId === customerId)
  }
  
  // Google Drive API ヘルパー関数
  const getOrCreateProductsFile = async (token, appFolderId) => {
    try {
      // mastersフォルダの取得または作成
      const mastersFolder = await getOrCreateFolder(token, appFolderId, 'masters')
      
      // products.jsonlファイルを検索
      const query = `name='${APP_CONFIG.FILES.PRODUCTS}' and '${mastersFolder.id}' in parents and trashed=false`
      const searchResult = await googleApiClient.searchFiles(token, query)
      
      if (searchResult.files && searchResult.files.length > 0) {
        return searchResult.files[0]
      }
      
      // products.jsonlファイルを作成
      const fileData = {
        name: APP_CONFIG.FILES.PRODUCTS,
        parents: [mastersFolder.id]
      }
      const createResponse = await googleApiClient.createFile(token, fileData)
      const file = await createResponse.json()
      
      // 初期データ（空のJSONLファイル）を設定
      await googleApiClient.updateFileContent(token, file.id, '')
      
      return file
      
    } catch (err) {
      console.error('Failed to get or create products file:', err)
      throw err
    }
  }
  
  const saveProductsToFile = async (token) => {
    try {
      const authStore = useAuthStore()
      const appFolder = await authStore.getAppFolderId()
      const productsFile = await getOrCreateProductsFile(token, appFolder.id)
      
      // ファイルの内容を更新（JSONL形式、ProductインスタンスをJSONに変換）
      const jsonlContent = products.value.map(product => JSON.stringify(product.toJSON())).join('\n')
      await googleApiClient.updateFileContent(token, productsFile.id, jsonlContent)
      
    } catch (err) {
      console.error('Failed to save products to file:', err)
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
    products,
    isLoading,
    error,
    selectedProduct,
    
    // Computed
    productsCount,
    sortedProducts,
    
    // Actions
    initializeProducts,
    loadProducts,
    createProduct,
    bulkCreateProducts,
    updateProduct,
    deleteProduct,
    getProductById,
    searchProducts,
    getProductsByCustomer
  }
}) 