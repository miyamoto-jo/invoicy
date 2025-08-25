<template>
  <div class="sales-analysis">
    <!-- フィルタセクション -->
    <div class="filters-section">
      <div class="filters-header">
        <h3>売上分析</h3>
        <div class="filter-controls">
          <button 
            @click="toggleFilters" 
            class="btn btn-sm btn-secondary"
          >
            {{ showFilters ? 'フィルタを隠す' : 'フィルタを表示' }}
          </button>
        </div>
      </div>
      
      <div v-if="showFilters" class="filters-content">
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
          
          <div class="filter-actions">
            <button 
              @click="searchSales" 
              class="btn btn-primary btn-sm"
              :disabled="isLoading"
            >
              <span v-if="isLoading">検索中...</span>
              <span v-else>検索</span>
            </button>
            <button 
              @click="clearFilters" 
              class="btn btn-secondary btn-sm"
              :disabled="isLoading"
            >
              クリア
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- エラーメッセージ -->
    <div v-if="error" class="error-banner">
      {{ error }}
    </div>

    <!-- 売上サマリー -->
    <div class="sales-summary">
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">売上件数</div>
          <div class="summary-value">{{ filteredSales.length }}件</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">税抜合計</div>
          <div class="summary-value">¥{{ formatNumber(summary.subtotalExclTax) }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">税込合計</div>
          <div class="summary-value">¥{{ formatNumber(summary.totalInclTax) }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">平均単価</div>
          <div class="summary-value">¥{{ formatNumber(summary.averagePrice) }}</div>
        </div>
      </div>
    </div>

    <!-- 売上一覧 -->
    <div class="sales-section">
      <div class="sales-header">
        <h4>売上一覧</h4>
        <router-link to="/sales" class="btn btn-sm btn-primary">
          詳細表示
        </router-link>
      </div>

      <div v-if="isLoading" class="loading">
        データを読み込み中...
      </div>

      <div v-else-if="filteredSales.length === 0" class="empty-state">
        <p>売上データがありません。</p>
      </div>

      <div v-else class="sales-table">
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>顧客</th>
              <th>商品数</th>
              <th>税込合計</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in limitedSales" :key="sale.id">
              <td>{{ formatDate(sale.issuedOn) }}</td>
              <td>{{ getCustomerName(sale.customerId) }}</td>
              <td>{{ sale.lines.length }}品目</td>
              <td>¥{{ formatNumber(sale.totals.totalInclTax) }}</td>
              <td>
                <button 
                  @click="viewSaleDetails(sale)" 
                  class="btn btn-sm btn-secondary"
                  title="詳細表示"
                >
                  詳細
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div v-if="filteredSales.length > 5" class="more-link">
          <router-link to="/sales" class="btn btn-sm btn-secondary">
            すべて表示 ({{ filteredSales.length }}件)
          </router-link>
        </div>
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
                  <th>小計（税込）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="line in selectedSale.lines" :key="`${selectedSale.id}-${line.productId}`">
                  <td>{{ line.productName }}</td>
                  <td>{{ line.quantity }}</td>
                  <td>¥{{ formatNumber(line.priceExclTax) }}</td>
                  <td>{{ line.taxRate }}%</td>
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

// Reactive data
const filters = ref({
  fromDate: '',
  toDate: '',
  customerId: '',
  productId: ''
})

const filteredSales = ref([])
const selectedSale = ref(null)
const isLoading = ref(false)
const error = ref('')
const showFilters = ref(false)

// Computed
const customers = computed(() => customersStore.sortedCustomers)
const products = computed(() => productsStore.sortedProducts)

// 最新5件のみ表示
const limitedSales = computed(() => {
  return filteredSales.value.slice(0, 5)
})

// サマリー計算
const summary = computed(() => {
  const sales = filteredSales.value
  if (sales.length === 0) {
    return {
      subtotalExclTax: 0,
      totalInclTax: 0,
      averagePrice: 0
    }
  }
  
  const subtotalExclTax = sales.reduce((sum, sale) => sum + sale.totals.subtotalExclTax, 0)
  const totalInclTax = sales.reduce((sum, sale) => sum + sale.totals.totalInclTax, 0)
  const averagePrice = totalInclTax / sales.length
  
  return {
    subtotalExclTax,
    totalInclTax,
    averagePrice: Math.round(averagePrice)
  }
})

// Methods
const initializeData = async () => {
  try {
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
  }
}

const loadSales = async () => {
  try {
    isLoading.value = true
    error.value = ''
    
    // 全売上データを取得
    const sales = await salesStore.searchSales()
    filteredSales.value = sales
    
  } catch (err) {
    console.error('Failed to load sales:', err)
    error.value = '売上データの読み込みに失敗しました'
  } finally {
    isLoading.value = false
  }
}

const searchSales = async () => {
  try {
    isLoading.value = true
    error.value = ''
    
    // フィルタ条件で検索
    const sales = await salesStore.searchSales(filters.value)
    filteredSales.value = sales
    
  } catch (err) {
    console.error('Failed to search sales:', err)
    error.value = '売上データの検索に失敗しました'
  } finally {
    isLoading.value = false
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

const toggleFilters = () => {
  showFilters.value = !showFilters.value
}

const viewSaleDetails = (sale) => {
  selectedSale.value = sale
}

const closeSaleDetails = () => {
  selectedSale.value = null
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
.sales-analysis {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.filters-section {
  border-bottom: 1px solid #e0e0e0;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
}

.filters-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.125rem;
}

.filters-content {
  padding: 0 1.5rem 1.5rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-label {
  font-size: 0.75rem;
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

.sales-summary {
  padding: 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.summary-item {
  text-align: center;
}

.summary-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
}

.sales-section {
  padding: 1.5rem;
}

.sales-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sales-header h4 {
  margin: 0;
  color: #333;
  font-size: 1rem;
}

.loading,
.empty-state {
  text-align: center;
  padding: 2rem;
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
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.sales-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  font-size: 0.75rem;
}

.sales-table tr:hover {
  background: #f8f9fa;
}

.more-link {
  text-align: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.error-banner {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem;
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
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
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
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  margin-bottom: 0.5rem;
}

.info-label {
  font-weight: 600;
  color: #666;
  width: 80px;
  flex-shrink: 0;
  font-size: 0.875rem;
}

.info-value {
  color: #333;
  font-size: 0.875rem;
}

.sale-lines {
  margin-bottom: 1.5rem;
}

.sale-lines h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.lines-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.75rem;
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
  font-size: 0.875rem;
}

.total-row:last-child {
  margin-bottom: 0;
}

.total-row-main {
  font-size: 1rem;
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
  
  .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .sales-table {
    font-size: 0.75rem;
  }
  
  .sales-table th,
  .sales-table td {
    padding: 0.25rem;
  }
  
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
  
  .lines-table {
    font-size: 0.7rem;
  }
  
  .lines-table th,
  .lines-table td {
    padding: 0.25rem;
  }
}
</style> 