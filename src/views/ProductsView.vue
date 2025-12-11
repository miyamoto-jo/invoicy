<template>
  <AppLayout>
    <div class="products-header">
      <h1>商品管理</h1>
      <div class="header-actions">
        <button
          @click="showAddForm"
          class="btn btn-primary"
          :disabled="isLoading"
        >
          新規登録
        </button>
        <button
          @click="showBulkCreateForm"
          class="btn btn-outline"
          :disabled="isLoading"
        >
          一括登録
        </button>
      </div>
    </div>
    
    <div class="products-content">
        <!-- 商品一覧 -->
        <div v-if="!showForm && !showBulkCreate" class="card">
          <ProductList
            :products="products"
            :is-loading="isLoading"
            :error="error"
            @add="showAddForm"
            @edit="showEditForm"
            @delete="handleDelete"
            @bulk-create="showBulkCreateForm"
          />
        </div>

        <!-- 商品フォーム -->
        <div v-else-if="showForm" class="card">
          <div class="card-header">
            <h2>{{ isEdit ? '商品編集' : '商品登録' }}</h2>
            <button
              @click="hideForm"
              class="btn btn-secondary"
            >
              一覧に戻る
            </button>
          </div>
          
          <ProductForm
            :product="editingProduct"
            :is-loading="isLoading"
            @submit="handleSubmit"
            @cancel="hideForm"
          />
        </div>

        <!-- 一括登録フォーム -->
        <div v-else-if="showBulkCreate" class="card">
          <div class="card-header">
            <h2>商品一括登録</h2>
            <button
              @click="hideBulkCreateForm"
              class="btn btn-secondary"
            >
              一覧に戻る
            </button>
          </div>
          
          <ProductBulkCreate
            :is-loading="isLoading"
            @submit="handleBulkSubmit"
            @cancel="hideBulkCreateForm"
          />
        </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductsStore } from '../stores/products'
import { useCustomersStore } from '../stores/customers'
import { useLoading } from '../composables/useLoading'
import ProductList from '../components/ProductList.vue'
import ProductForm from '../components/ProductForm.vue'
import ProductBulkCreate from '../components/ProductBulkCreate.vue'
import AppLayout from '../components/AppLayout.vue'

const productsStore = useProductsStore()
const customersStore = useCustomersStore()
const { setLoading, clearLoading } = useLoading()

// ローカル状態
const showForm = ref(false)
const showBulkCreate = ref(false)
const editingProduct = ref(null)

// ストアから状態を取得
const products = computed(() => productsStore.sortedProducts)
const isLoading = computed(() => productsStore.isLoading)
const error = computed(() => productsStore.error)
const productsCount = computed(() => productsStore.productsCount)

// 計算プロパティ
const isEdit = computed(() => !!editingProduct.value)

// 初期化
onMounted(async () => {
  try {
    setLoading(true, 'データを読み込み中...', '商品情報と顧客情報を取得しています')
    
    // 商品データと顧客データを並列で読み込む
    await Promise.all([
      productsStore.initializeProducts(),
      // 顧客データも事前に読み込んでおく（ProductFormで使用するため）
      customersStore.customers.length === 0 
        ? customersStore.initializeCustomers() 
        : Promise.resolve()
    ])
  } catch (err) {
    console.error('Failed to initialize products:', err)
  } finally {
    clearLoading()
  }
})

// フォーム表示制御
const showAddForm = () => {
  editingProduct.value = null
  showForm.value = true
  showBulkCreate.value = false
}

const showEditForm = (product) => {
  editingProduct.value = product
  showForm.value = true
  showBulkCreate.value = false
}

const hideForm = () => {
  showForm.value = false
  editingProduct.value = null
}

const showBulkCreateForm = () => {
  showForm.value = false
  showBulkCreate.value = true
}

const hideBulkCreateForm = () => {
  showBulkCreate.value = false
}

// フォーム送信処理
const handleSubmit = async (productData) => {
  try {
    setLoading(true, '保存中...', '商品情報を保存しています')
    
    if (isEdit.value) {
      await productsStore.updateProduct(editingProduct.value.id, productData)
    } else {
      await productsStore.createProduct(productData)
    }
    
    // 成功時は一覧に戻る
    hideForm()
  } catch (err) {
    // エラーはストアで管理されるため、ここでは何もしない
    console.error('Product operation failed:', err)
  } finally {
    clearLoading()
  }
}

// 一括登録処理
const handleBulkSubmit = async (productsData) => {
  try {
    setLoading(true, '一括登録中...', `${productsData.length}件の商品を登録しています`)
    
    await productsStore.bulkCreateProducts(productsData)
    
    // 成功時は一覧に戻る
    hideBulkCreateForm()
  } catch (err) {
    console.error('Bulk product operation failed:', err)
  } finally {
    clearLoading()
  }
}

// 削除処理
const handleDelete = async (productId) => {
  try {
    setLoading(true, '削除中...', '商品を削除しています')
    
    await productsStore.deleteProduct(productId)
  } catch (err) {
    console.error('Product deletion failed:', err)
  } finally {
    clearLoading()
  }
}
</script>

<style scoped>
.products-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.products-header h1 {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.products-content {
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.card-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.25rem;
  font-weight: 600;
}

.card-stats {
  display: flex;
  gap: 1rem;
}

.stat {
  color: #666;
  font-size: 0.875rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.btn-outline {
  background-color: #ffe0e0;
  color: #c82333;
  border: 1px solid #f5c6cb;
}

.btn-outline:hover:not(:disabled) {
  background-color: #ffcccc;
  border-color: #f5c6cb;
}

.btn-outline:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .products-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .card-stats {
    justify-content: center;
  }
}
</style> 