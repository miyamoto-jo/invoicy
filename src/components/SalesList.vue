<template>
  <div class="sales-list">
    <!-- フィルタセクション -->
    <div class="filters-section">
      <h3>検索条件</h3>
      <div class="filters-grid">
        <div class="filter-group">
          <label for="fromDate" class="filter-label">期間（開始）</label>
          <input 
            type="date" 
            id="fromDate" 
            v-model="filters.fromDate" 
            class="filter-input"
          >
        </div>
        
        <div class="filter-group">
          <label for="toDate" class="filter-label">期間（終了）</label>
          <input 
            type="date" 
            id="toDate" 
            v-model="filters.toDate" 
            class="filter-input"
          >
        </div>
        
        <div class="filter-group">
          <label for="customerFilter" class="filter-label">顧客</label>
          <select 
            id="customerFilter" 
            v-model="filters.customerId" 
            class="filter-select"
          >
            <option value="">すべての顧客</option>
            <option 
              v-for="customer in customers" 
              :key="customer.id" 
              :value="customer.id"
            >
              {{ customer.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="productFilter" class="filter-label">商品</label>
          <select 
            id="productFilter" 
            v-model="filters.productId" 
            class="filter-select"
          >
            <option value="">すべての商品</option>
            <option 
              v-for="product in products" 
              :key="product.id" 
              :value="product.id"
            >
              {{ product.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-actions">
          <button 
            @click="searchSales" 
            class="btn btn-primary"
          >
            検索
          </button>
          <button 
            @click="clearFilters" 
            class="btn btn-secondary"
          >
            クリア
          </button>
        </div>
      </div>
    </div>

    <!-- エラーメッセージ -->
    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <!-- 売上一覧 -->
    <div class="sales-section">
      <div class="sales-header">
        <h3>売上一覧</h3>
        <div class="sales-count">
          {{ filteredSales.length }}件の売上
        </div>
      </div>

      <div v-if="filteredSales.length === 0" class="empty-state">
        <p>売上データがありません。</p>
        <p>検索条件を変更するか、新しい売上を登録してください。</p>
      </div>

      <div v-else class="sales-table">
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>顧客</th>
              <th>商品数</th>
              <th>税抜合計</th>
              <th>税込合計</th>
              <th>備考</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in filteredSales" :key="sale.id">
              <td>{{ formatDate(sale.issuedOn) }}</td>
              <td>{{ getCustomerName(sale.customerId) }}</td>
              <td>{{ sale.lines.length }}品目</td>
              <td>¥{{ formatNumber(sale.totals.subtotalExclTax) }}</td>
              <td>¥{{ formatNumber(sale.totals.totalInclTax) }}</td>
              <td>
                <span v-if="sale.note" class="note-text" :title="sale.note">
                  {{ truncateText(sale.note, 20) }}
                </span>
                <span v-else class="no-note">-</span>
              </td>
              <td>
                <div class="action-buttons">
                  <button 
                    @click="viewSaleDetails(sale)" 
                    class="btn btn-sm btn-secondary"
                    title="詳細表示"
                  >
                    詳細
                  </button>
                  <button 
                    @click="deleteSale(sale.id)" 
                    class="btn btn-sm btn-danger"
                    title="削除"
                    :disabled="isDeleting === sale.id"
                  >
                    <span v-if="isDeleting === sale.id">削除中...</span>
                    <span v-else>削除</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 売上詳細モーダル -->
    <div v-if="selectedSale" class="modal-overlay" @click="closeSaleDetails">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>売上詳細</h3>
          <button @click="closeSaleDetails" class="modal-close">&times;</button>
        </div>
        
        <div class="modal-body">
          <div class="sale-info">
            <div class="info-row">
              <span class="info-label">伝票ID:</span>
              <span class="info-value">{{ selectedSale.id }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">日付:</span>
              <span class="info-value">{{ formatDate(selectedSale.issuedOn) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">顧客:</span>
              <span class="info-value">{{ getCustomerName(selectedSale.customerId) }}</span>
            </div>
            <div class="info-row" v-if="selectedSale.note">
              <span class="info-label">備考:</span>
              <span class="info-value">{{ selectedSale.note }}</span>
            </div>
          </div>

          <div class="sale-lines">
            <h4>商品明細</h4>
            <table class="lines-table">
              <thead>
                <tr>
                  <th>商品名</th>
                  <th>数量</th>
                  <th>単価（税抜）</th>
                  <th>税率</th>
                  <th>小計（税抜）</th>
                  <th>税額</th>
                  <th>小計（税込）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="line in selectedSale.lines" :key="`${selectedSale.id}-${line.productId}`">
                  <td>{{ line.productName }}</td>
                  <td>{{ line.quantity }}</td>
                  <td>¥{{ formatNumber(line.priceExclTax) }}</td>
                  <td>{{ line.taxRate }}%</td>
                  <td>¥{{ formatNumber(line.quantity * line.priceExclTax) }}</td>
                  <td>¥{{ formatNumber(Math.floor((line.quantity * line.priceExclTax) * (line.taxRate / 100))) }}</td>
                  <td>¥{{ formatNumber((line.quantity * line.priceExclTax) + Math.floor((line.quantity * line.priceExclTax) * (line.taxRate / 100))) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="sale-totals">
            <div class="total-row">
              <span class="total-label">税抜合計:</span>
              <span class="total-value">¥{{ formatNumber(selectedSale.totals.subtotalExclTax) }}</span>
            </div>
            <div v-for="(taxAmount, rate) in selectedSale.totals.taxByRate" :key="rate" class="total-row">
              <span class="total-label">消費税（{{ rate }}%）:</span>
              <span class="total-value">¥{{ formatNumber(taxAmount) }}</span>
            </div>
            <div class="total-row total-row-main">
              <span class="total-label">税込合計:</span>
              <span class="total-value">¥{{ formatNumber(selectedSale.totals.totalInclTax) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSalesStore } from '../stores/sales'
import { useCustomersStore } from '../stores/customers'
import { useProductsStore } from '../stores/products'
import { useLoading } from '../composables/useLoading'

// Props
const props = defineProps({
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

// Emits
const emit = defineEmits(['refresh'])

// Stores
const salesStore = useSalesStore()
const customersStore = useCustomersStore()
const productsStore = useProductsStore()
const { setLoading, clearLoading } = useLoading()

// Reactive data
const filters = ref({
  fromDate: '',
  toDate: '',
  customerId: '',
  productId: ''
})

const filteredSales = ref([])
const selectedSale = ref(null)
// isLoadingは共通のローディング画面を使用するため削除
const isDeleting = ref(null)
const error = ref('')

// Computed
const customers = computed(() => customersStore.sortedCustomers)
const products = computed(() => productsStore.sortedProducts)

// Methods
const initializeData = async () => {
  try {
    setLoading(true, 'データを初期化中...', '顧客・商品・売上データを読み込んでいます')
    
    // 各ストアの初期化
    await Promise.all([
      customersStore.initializeCustomers(),
      productsStore.initializeProducts(),
      salesStore.initializeSales()
    ])
    
    // 初期データの読み込み
    await loadSales()
  } catch (err) {
    console.error('Failed to initialize data:', err)
    error.value = 'データの初期化に失敗しました'
  } finally {
    clearLoading()
  }
}

const loadSales = async () => {
  try {
    setLoading(true, '売上データを読み込み中...', '売上情報を取得しています')
    error.value = ''
    
    // 全売上データを取得
    const sales = await salesStore.searchSales()
    filteredSales.value = sales
    
  } catch (err) {
    console.error('Failed to load sales:', err)
    error.value = '売上データの読み込みに失敗しました'
  } finally {
    clearLoading()
  }
}

const searchSales = async () => {
  try {
    setLoading(true, '検索中...', '売上データを検索しています')
    error.value = ''
    
    // フィルタ条件で検索
    const sales = await salesStore.searchSales(filters.value)
    filteredSales.value = sales
    
  } catch (err) {
    console.error('Failed to search sales:', err)
    error.value = '売上データの検索に失敗しました'
  } finally {
    clearLoading()
  }
}

const clearFilters = () => {
  filters.value = {
    fromDate: '',
    toDate: '',
    customerId: '',
    productId: ''
  }
  loadSales()
}

const viewSaleDetails = (sale) => {
  selectedSale.value = sale
}

const closeSaleDetails = () => {
  selectedSale.value = null
}

const deleteSale = async (saleId) => {
  if (!confirm('この売上を削除しますか？この操作は取り消せません。')) {
    return
  }
  
  try {
    setLoading(true, '削除中...', '売上を削除しています')
    isDeleting.value = saleId
    error.value = ''
    
    await salesStore.deleteSale(saleId)
    
    // 一覧を更新
    await loadSales()
    
    // 親コンポーネントに更新を通知
    emit('refresh')
    
  } catch (err) {
    console.error('Failed to delete sale:', err)
    error.value = '売上の削除に失敗しました'
  } finally {
    clearLoading()
    isDeleting.value = null
  }
}

const getCustomerName = (customerId) => {
  const customer = customers.value.find(c => c.id === customerId)
  return customer ? customer.name : '不明な顧客'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP')
}

const formatNumber = (num) => {
  return new Intl.NumberFormat('ja-JP').format(num)
}

const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + '...'
}

// Lifecycle
onMounted(() => {
  initializeData()
})

// Watch for refresh trigger
watch(() => props.refreshTrigger, () => {
  if (props.refreshTrigger > 0) {
    loadSales()
  }
})
</script>

<style scoped>
.sales-list {
  max-width: 1200px;
  margin: 0 auto;
}

.filters-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.filters-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.25rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #666;
  margin-bottom: 0.25rem;
}

.filter-input,
.filter-select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
}

.filter-actions {
  display: flex;
  gap: 0.5rem;
}

.sales-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sales-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.sales-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.25rem;
}

.sales-count {
  color: #666;
  font-size: 0.875rem;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.sales-table {
  overflow-x: auto;
}

.sales-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.sales-table th,
.sales-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.sales-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.sales-table tr:hover {
  background: #f8f9fa;
}

.note-text {
  color: #666;
  cursor: help;
}

.no-note {
  color: #ccc;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.error-banner {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #f5c6cb;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

.sale-info {
  margin-bottom: 2rem;
}

.info-row {
  display: flex;
  margin-bottom: 0.5rem;
}

.info-label {
  font-weight: 600;
  color: #666;
  width: 100px;
  flex-shrink: 0;
}

.info-value {
  color: #333;
}

.sale-lines {
  margin-bottom: 2rem;
}

.sale-lines h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.lines-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.lines-table th,
.lines-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.lines-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.sale-totals {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.total-row:last-child {
  margin-bottom: 0;
}

.total-row-main {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  border-top: 1px solid #e0e0e0;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}

.total-label {
  color: #666;
}

.total-value {
  font-weight: 600;
  color: #333;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-actions {
    grid-column: 1 / -1;
  }
  
  .sales-table {
    font-size: 0.75rem;
  }
  
  .sales-table th,
  .sales-table td {
    padding: 0.5rem 0.25rem;
  }
  
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
  
  .lines-table {
    font-size: 0.75rem;
  }
  
  .lines-table th,
  .lines-table td {
    padding: 0.25rem;
  }
}
</style> 