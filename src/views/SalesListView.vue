<template>
  <AppLayout>
    <div class="sales-list">
      <!-- ヘッダー -->
      <div class="header">
        <h1>売上一覧</h1>
      </div>

      <!-- 検索・フィルタ -->
      <div class="search-section">
        <div class="search-form">
          <div class="search-field">
            <label>顧客名</label>
            <select 
              v-model="searchFilters.customerName" 
              :disabled="sales.length === 0"
            >
              <option value="">すべて</option>
              <option 
                v-for="customerName in uniqueCustomerNames" 
                :key="customerName" 
                :value="customerName"
              >
                {{ customerName }}
              </option>
            </select>
          </div>
          <div class="search-field">
            <label>期間</label>
            <div class="date-picker-container">
              <!-- 選択された年月の表示 -->
              <div class="date-display" @click="showDatePicker = true">
                <span v-if="searchFilters.period">
                  {{ formatMonthDisplay(searchFilters.period) }}
                </span>
                <span v-else class="placeholder">年月を選択してください</span>
                <span class="arrow">▼</span>
              </div>
            </div>
          </div>
          
          <!-- モーダル形式のカレンダーUI -->
          <div v-if="showDatePicker" class="date-picker-modal-overlay" @click="showDatePicker = false">
            <div class="date-picker-modal" @click.stop>
              <!-- モーダルヘッダー -->
              <div class="date-picker-modal-header">
                <h3>年月を選択</h3>
                <button type="button" class="close-button" @click="showDatePicker = false">×</button>
              </div>
              
              <!-- カレンダーコンテンツ -->
              <div class="date-picker-content">
                <!-- ヘッダー（年ナビゲーション） -->
                <div class="date-picker-header">
                  <button 
                    type="button" 
                    class="nav-button" 
                    @click="decreaseYear"
                  >
                    ‹
                  </button>
                  <span class="year-display">{{ displayYear }}年</span>
                  <button 
                    type="button" 
                    class="nav-button" 
                    @click="increaseYear"
                  >
                    ›
                  </button>
                </div>
                
                <!-- 月のグリッド -->
                <div class="month-grid">
                  <button
                    v-for="month in 12"
                    :key="month"
                    type="button"
                    class="month-button"
                    :class="{ active: isSelectedMonth(month) }"
                    @click="selectMonth(month)"
                  >
                    {{ month }}月
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button @click="clearFilters" class="btn-secondary">
            クリア
          </button>
        </div>
      </div>

      <!-- 売上一覧 -->
      <div class="sales-list-container">
        <div v-if="isLoading" class="loading">
          <LoadingScreen 
            title="売上データを読み込み中..." 
            message="売上データを取得しています"
          />
        </div>
        
        <div v-else-if="filteredSales.length === 0" class="empty-state">
          <i class="icon-document"></i>
          <p>売上がありません</p>
        </div>
        
        <div v-else class="sales-table-container">
          <table class="sales-table">
            <thead>
              <tr>
                <th>注文日</th>
                <th>顧客名</th>
                <th>金額(税込)</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="sale in filteredSales" 
                :key="sale.id"
                @click="viewSaleDetail(sale)"
                class="clickable-row"
              >
                <td>{{ formatDate(sale.issuedOn) }}</td>
                <td>{{ getCustomerName(sale.customerId) }}</td>
                <td class="amount-cell">¥{{ formatAmount(sale.totals.totalInclTax) }}</td>
                <td>
                  <span :class="['status-badge', sale.isNegative ? 'status-void' : 'status-sale']">
                    {{ sale.isNegative ? '取消' : '売上' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 伝票詳細モーダル -->
      <div v-if="selectedSale" class="modal-overlay" @click="closeSaleDetail">
        <div class="modal modal-large" @click.stop>
          <div class="modal-header">
            <h2>伝票詳細</h2>
            <button @click="closeSaleDetail" class="btn-close">×</button>
          </div>
          <div class="modal-body">
            <SaleDetailView 
              :sale="selectedSale" 
              :customer-name="getCustomerName(selectedSale.customerId)"
              @void-success="handleVoidSuccess"
            />
          </div>
        </div>
      </div>

      <!-- エラーダイアログ -->
      <div v-if="error" class="error-dialog">
        <div class="error-content">
          <h3>エラー</h3>
          <p>{{ error }}</p>
          <button @click="error = null" class="btn-primary">OK</button>
        </div>
      </div>

      <!-- トースト通知 -->
      <div v-if="toast.show" class="toast" :class="toast.type">
        <div class="toast-content">
          <span class="toast-message">{{ toast.message }}</span>
          <button @click="hideToast" class="toast-close">&times;</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppLayout from '../components/AppLayout.vue'
import LoadingScreen from '../components/LoadingScreen.vue'
import SaleDetailView from '../components/SaleDetailView.vue'
import { useSalesStore } from '../stores/sales'
import { useCustomersStore } from '../stores/customers'

const salesStore = useSalesStore()
const customersStore = useCustomersStore()

// State
const isLoading = ref(false)
const showDatePicker = ref(false)
const displayYear = ref(new Date().getFullYear())
const error = ref(null)
const sales = ref([])
const customersMap = ref(new Map()) // 顧客ID → 顧客名のマップ
const selectedSale = ref(null)
const toast = ref({
  show: false,
  message: '',
  type: 'success' // 'success' or 'error'
})

// デフォルト値を現在の月に設定
const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const searchFilters = ref({
  customerName: '',
  period: getCurrentMonth()
})

// Computed
// 表示されている売上からユニークな顧客名のリストを作成
const uniqueCustomerNames = computed(() => {
  const customerNamesSet = new Set()
  sales.value.forEach(sale => {
    const customerName = getCustomerName(sale.customerId)
    if (customerName && customerName !== '不明') {
      customerNamesSet.add(customerName)
    }
  })
  // 顧客名をソートして返す
  return Array.from(customerNamesSet).sort((a, b) => a.localeCompare(b, 'ja'))
})

const filteredSales = computed(() => {
  let result = [...sales.value]
  
  // 顧客名でフィルタリング（完全一致）
  if (searchFilters.value.customerName) {
    result = result.filter(sale => {
      const customerName = getCustomerName(sale.customerId)
      return customerName === searchFilters.value.customerName
    })
  }
  
  return result
})

// Methods
const initializeData = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    // 顧客マスタデータの取得とインメモリ保存
    await customersStore.initializeCustomers()
    customersMap.value = new Map()
    customersStore.customers.forEach(customer => {
      customersMap.value.set(customer.id, customer.name)
    })
    
    // 期間（年月）のフォームにセットされている年月の値に紐づく売上データを取得
    if (searchFilters.value.period) {
      const salesData = await salesStore.loadSalesByYearMonth(searchFilters.value.period)
      sales.value = salesData
    }
    
  } catch (err) {
    console.error('Failed to initialize data:', err)
    error.value = 'データの読み込みに失敗しました'
  } finally {
    isLoading.value = false
  }
}

// 顧客名フィルタリングはcomputedで処理されるため、特に処理なし

const clearFilters = () => {
  searchFilters.value = {
    customerName: '',
    period: getCurrentMonth()
  }
  // 期間を変更したので、売上データを再取得
  loadSalesForPeriod(searchFilters.value.period)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatAmount = (amount) => {
  return amount.toLocaleString()
}

const formatMonthDisplay = (yearMonth) => {
  const [year, month] = yearMonth.split('-')
  return `${year}年${parseInt(month)}月`
}

const getCustomerName = (customerId) => {
  return customersMap.value.get(customerId) || '不明'
}

// 年月選択のメソッド
const decreaseYear = () => {
  displayYear.value--
}

const increaseYear = () => {
  displayYear.value++
}

const selectMonth = async (month) => {
  const yearMonth = `${displayYear.value}-${String(month).padStart(2, '0')}`
  searchFilters.value.period = yearMonth
  showDatePicker.value = false
  
  // 期間変更時に売上データを取得
  await loadSalesForPeriod(yearMonth)
}

const isSelectedMonth = (month) => {
  if (!searchFilters.value.period) return false
  const [year, monthNum] = searchFilters.value.period.split('-')
  return parseInt(year) === displayYear.value && parseInt(monthNum) === month
}

const loadSalesForPeriod = async (yearMonth) => {
  try {
    isLoading.value = true
    error.value = null
    const salesData = await salesStore.loadSalesByYearMonth(yearMonth)
    sales.value = salesData
  } catch (err) {
    console.error('Failed to load sales for period:', err)
    error.value = '売上データの読み込みに失敗しました'
  } finally {
    isLoading.value = false
  }
}

const viewSaleDetail = (sale) => {
  selectedSale.value = sale
}

const closeSaleDetail = () => {
  selectedSale.value = null
}

const handleVoidSuccess = async (yearMonth) => {
  // モーダルを閉じる
  closeSaleDetail()
  
  // トーストを表示
  showToast('処理が成功しました', 'success')
  
  // systemDate.valueの年月の状態で売上一覧画面を表示
  if (yearMonth) {
    searchFilters.value.period = yearMonth
    await loadSalesForPeriod(yearMonth)
  }
}

const showToast = (message, type = 'success') => {
  toast.value = {
    show: true,
    message,
    type
  }
  
  // 3秒後に自動で非表示
  setTimeout(() => {
    hideToast()
  }, 3000)
}

const hideToast = () => {
  toast.value.show = false
}

// 選択された期間が変更されたときにdisplayYearも更新
watch(() => searchFilters.value.period, (newPeriod) => {
  if (newPeriod) {
    const [year] = newPeriod.split('-')
    displayYear.value = parseInt(year)
  }
})

// Lifecycle
onMounted(() => {
  initializeData()
})
</script>

<style scoped>
.sales-list {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0 0.5rem;
}

.header h1 {
  color: #333;
  font-size: 1.5rem;
  margin: 0;
  text-align: center;
}

.search-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.search-form {
  display: flex;
  gap: 1rem;
  align-items: end;
  flex-wrap: nowrap;
}

.search-field {
  flex: 1;
  min-width: 0;
}

.search-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.search-field input,
.search-field select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.search-field select:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 年月選択UI */
.date-picker-container {
  position: relative;
  width: 100%;
}

.date-display {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.2s;
}

.date-display:hover {
  border-color: #007bff;
}

.date-display .placeholder {
  color: #999;
}

.date-display .arrow {
  color: #666;
  font-size: 0.8rem;
}

/* モーダルオーバーレイ */
.date-picker-modal-overlay {
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
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* モーダル本体 */
.date-picker-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.date-picker-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.date-picker-modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: #f0f0f0;
}

.date-picker-content {
  padding: 1.5rem;
  overflow-y: auto;
}

.date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.nav-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #007bff;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.nav-button:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.nav-button:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.year-display {
  font-weight: 500;
  font-size: 1rem;
  color: #333;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.month-button {
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  color: #333;
  transition: all 0.2s;
}

.month-button:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #007bff;
}

.month-button.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
  font-weight: 500;
}

.month-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  height: fit-content;
}

.btn-secondary:hover {
  background: #545b62;
}

.sales-list-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: #666;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ccc;
}

.sales-table-container {
  overflow-x: auto;
}

.sales-table {
  width: 100%;
  border-collapse: collapse;
}

.sales-table thead {
  background-color: #f8f9fa;
}

.sales-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
}

.sales-table td {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  color: #333;
}

.sales-table tbody tr:hover {
  background-color: #f8f9fa;
}

.clickable-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.clickable-row:hover {
  background-color: #e3f2fd !important;
}

.amount-cell {
  text-align: right;
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-sale {
  background-color: #d4edda;
  color: #155724;
}

.status-void {
  background-color: #f8d7da;
  color: #721c24;
}

.error-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.error-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.error-content h3 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-content p {
  color: #666;
  margin-bottom: 1.5rem;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-primary:hover {
  background: #0056b3;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .sales-list {
    padding: 0;
    min-height: 100vh;
    background-color: #f5f5f5;
  }
  
  .header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    margin-bottom: 0;
    padding: 1rem;
    background: white;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .header h1 {
    font-size: 1.5rem;
    text-align: center;
    margin: 0;
    font-weight: bold;
    color: #333;
  }
  
  .search-section {
    padding: 1.5rem;
    margin: 0;
    background: white;
    border-radius: 0;
    box-shadow: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .search-form {
    flex-direction: row;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  
  .search-field {
    min-width: auto;
    flex: 1 1 calc(50% - 0.375rem);
  }
  
  .search-field label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #333;
    margin-bottom: 0.5rem;
    display: block;
  }
  
  .search-field input,
  .search-field select {
    padding: 1rem;
    font-size: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
    width: 100%;
  }
  
  .date-display {
    padding: 1rem;
    font-size: 1rem;
    border-radius: 8px;
  }
  
  .date-picker-modal {
    width: 95%;
    max-width: 360px;
  }
  
  .date-picker-content {
    padding: 1rem;
  }
  
  .month-grid {
    gap: 0.75rem;
  }
  
  .month-button {
    padding: 1rem;
    font-size: 1rem;
  }
  
  .btn-secondary {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    border-radius: 8px;
    background: #6c757d;
    border: none;
    color: white;
    font-weight: 500;
  }
  
  .sales-list-container {
    border-radius: 0;
    box-shadow: none;
    background: white;
    margin: 0;
  }
  
  .sales-table {
    font-size: 0.9rem;
  }
  
  .sales-table th,
  .sales-table td {
    padding: 0.75rem 0.5rem;
  }
}

/* モーダルスタイル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
}

/* トースト通知 */
.toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1002;
  min-width: 300px;
  max-width: 500px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast.success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.toast.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.toast-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
}

.toast-message {
  flex: 1;
  font-weight: 500;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: inherit;
  opacity: 0.7;
  padding: 0;
  margin-left: 1rem;
  line-height: 1;
}

.toast-close:hover {
  opacity: 1;
}
</style>

