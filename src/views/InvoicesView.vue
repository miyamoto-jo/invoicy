<template>
  <AppLayout>
    <div class="invoices">
      <!-- ヘッダー -->
      <div class="header">
        <h1>請求書一覧</h1>
        <button @click="showCreateForm = true" class="btn-primary">
          <i class="icon-plus"></i>
          請求書作成
        </button>
      </div>

      <!-- 検索・フィルタ -->
      <div class="search-section">
        <div class="search-form">
          <div class="search-field">
            <label>顧客名</label>
            <input 
              v-model="searchFilters.customerName" 
              type="text" 
              placeholder="顧客名で検索"
              @input="onSearchChange"
            />
          </div>
          <div class="search-field">
            <label>期間</label>
            <div class="date-picker-container">
              <!-- 選択された年月の表示 -->
              <div class="date-display" @click="showDatePicker = true">
                <span v-if="searchFilters.period">
                  {{ searchFilters.period }}
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
          <button 
            @click="showPdfExport = true" 
            class="btn-pdf-export"
            :disabled="filteredInvoices.length === 0"
          >
            PDFエクスポート
          </button>
        </div>
      </div>

      <!-- 請求書一覧 -->
      <div class="invoices-list">
        <div v-if="invoicesStore.isLoading" class="loading">
          <LoadingScreen 
            title="請求書データを読み込み中..." 
            message="請求書データを取得しています"
          />
        </div>
        
        <div v-else-if="filteredInvoices.length === 0" class="empty-state">
          <i class="icon-document"></i>
          <p>請求書がありません</p>
        </div>
        
        <div v-else class="invoice-cards">
          <div 
            v-for="invoice in filteredInvoices" 
            :key="invoice.id" 
            class="invoice-card"
            @click="viewInvoiceDetail(invoice)"
          >
            <button 
              @click.stop="confirmDeleteInvoice(invoice)" 
              class="btn-delete"
              title="削除"
            >
              🗑️
            </button>
            <div class="invoice-header">
              <h3>{{ invoice.customerName }}</h3>
              <span class="invoice-period">{{ invoice.period }}</span>
            </div>
            <div class="invoice-summary">
              <div class="amount">
                <span class="label">合計金額</span>
                <span class="value">¥{{ invoice.summary.formatTotalInclTax() }}</span>
              </div>
              <div class="details">
                <span>税抜: ¥{{ invoice.summary.formatSubtotal() }}</span>
                <span>税額: ¥{{ invoice.summary.formatTotalTax() }}</span>
              </div>
            </div>
            <div class="invoice-actions">
              <button @click.stop="viewInvoiceDetail(invoice)" class="btn-outline">
                詳細
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 請求書作成フォーム -->
      <div v-if="showCreateForm" class="modal-overlay" @click="closeCreateForm">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h2>請求書作成</h2>
            <button @click="closeCreateForm" class="btn-close">×</button>
          </div>
          <div class="modal-body">
            <InvoiceCreateForm @created="onInvoiceCreated" @cancel="closeCreateForm" />
          </div>
        </div>
      </div>

      <!-- 請求書詳細モーダル -->
      <div v-if="invoicesStore.selectedInvoice" class="modal-overlay" @click="closeInvoiceDetail">
        <div class="modal modal-large" @click.stop>
          <div class="modal-header">
            <h2>請求書詳細</h2>
            <button @click="closeInvoiceDetail" class="btn-close">×</button>
          </div>
          <div class="modal-body">
            <InvoiceDetailView :invoice="invoicesStore.selectedInvoice" />
          </div>
        </div>
      </div>

      <!-- PDFエクスポートモーダル -->
      <div v-if="showPdfExport" class="modal-overlay" @click="closePdfExport">
        <div class="modal modal-large" @click.stop>
          <PdfExportModal 
            :invoices="filteredInvoices"
            :current-period="formatMonth(searchFilters.period)"
            @close="closePdfExport"
          />
        </div>
      </div>

      <!-- 削除確認モーダル -->
      <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
        <div class="modal delete-confirm-modal" @click.stop>
          <div class="modal-header">
            <h2>請求書の削除</h2>
          </div>
          <div class="modal-body">
            <p class="delete-message">本当に削除しますか？この操作はやり直せません。</p>
          </div>
          <div class="modal-footer">
            <button @click="cancelDelete" class="btn-cancel">キャンセル</button>
            <button @click="executeDelete" class="btn-delete-confirm">削除</button>
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
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import InvoiceCreateForm from '../components/InvoiceCreateForm.vue'
import InvoiceDetailView from '../components/InvoiceDetailView.vue'
import LoadingScreen from '../components/LoadingScreen.vue'
import PdfExportModal from '../components/PdfExportModal.vue'
import { useInvoicesStore } from '../stores/invoices'
import { useCustomersStore } from '../stores/customers'
import { useSalesStore } from '../stores/sales'

const router = useRouter()
const invoicesStore = useInvoicesStore()
const customersStore = useCustomersStore()
const salesStore = useSalesStore()

// State
const showCreateForm = ref(false)
const showPdfExport = ref(false)
const showDatePicker = ref(false)
const displayYear = ref(new Date().getFullYear())
const showDeleteConfirm = ref(false)
const invoiceToDelete = ref(null)
const error = ref(null)

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
const filteredInvoices = computed(() => {
  let result = invoicesStore.sortedInvoices
  
  if (searchFilters.value.customerName) {
    result = result.filter(invoice => 
      invoice.customerName.includes(searchFilters.value.customerName)
    )
  }
  
  if (searchFilters.value.period) {
    result = result.filter(invoice => {
      // 請求書の期間をYYYY-MM形式に変換して比較
      if (!invoice.period) {
        console.warn('⚠️ Invoice missing period property:', invoice)
        return false // periodが存在しない場合はフィルタから除外
      }
      const invoiceYearMonth = invoice.period.replace('年', '-').replace('月分', '')
      // 月をゼロ埋めして正規化
      const [year, month] = invoiceYearMonth.split('-')
      const normalizedInvoiceYearMonth = `${year}-${String(parseInt(month)).padStart(2, '0')}`
      return normalizedInvoiceYearMonth === searchFilters.value.period
    })
  }
  
  return result
})

const availableMonths = computed(() => {
  const months = new Set()
  
  // 請求書データから月を取得
  invoicesStore.invoices.forEach(invoice => {
    const period = invoice.period
    if (period) {
      const yearMonth = period.replace('年', '-').replace('月分', '')
      months.add(yearMonth)
    }
  })
  
  // 売上データからも月を取得
  salesStore.sales.forEach(sale => {
    const yearMonth = sale.issuedOn.substring(0, 7) // YYYY-MM
    months.add(yearMonth)
  })
  
  // 現在の月を追加（デフォルト値として）
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  months.add(currentMonth)
  
  return Array.from(months).sort().reverse()
})

// Methods
const initializeData = async () => {
  try {
    // ローディング状態を開始
    invoicesStore.isLoading = true
    
    // システム日の年を取得
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    
    // 期間フォームにシステム日の年月をSET
    searchFilters.value.period = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    
    await Promise.all([
      invoicesStore.initializeInvoices(currentYear), // システム日の年分のデータを取得
      customersStore.initializeCustomers(),
      salesStore.initializeSales()
    ])
  } catch (err) {
    console.error('Failed to initialize data:', err)
    invoicesStore.error = 'データの読み込みに失敗しました'
  } finally {
    // ローディング状態を終了
    invoicesStore.isLoading = false
  }
}

const onSearchChange = () => {
  // 検索フィルタが変更された時の処理
  // リアルタイム検索の場合はここで検索実行
}

const clearFilters = () => {
  searchFilters.value = {
    customerName: '',
    period: getCurrentMonth()
  }
}

const viewInvoiceDetail = (invoice) => {
  invoicesStore.selectedInvoice = invoice
}

const closeInvoiceDetail = () => {
  invoicesStore.selectedInvoice = null
}

const closeCreateForm = () => {
  showCreateForm.value = false
}

const closePdfExport = () => {
  showPdfExport.value = false
}

const onInvoiceCreated = () => {
  showCreateForm.value = false
  // 請求書作成時は既にキャッシュが更新されているため、再読み込みは不要
  // ただし、表示中の年がキャッシュされている年と異なる場合は再読み込み
  if (searchFilters.value.period) {
    const [year] = searchFilters.value.period.split('-')
    const currentYear = parseInt(year)
    if (invoicesStore.cachedYear !== currentYear) {
      invoicesStore.initializeInvoices(currentYear)
    }
  }
}


const formatNumber = (num) => {
  return num.toLocaleString()
}

const formatMonth = (month) => {
  const [year, monthNum] = month.split('-')
  return `${year}年${parseInt(monthNum)}月`
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
  const selectedYear = displayYear.value
  
  // 現在キャッシュされている年を確認
  const currentCachedYear = invoicesStore.cachedYear
  
  // 違う年が選択された場合、データ取得し直し
  if (currentCachedYear !== selectedYear) {
    try {
      invoicesStore.isLoading = true
      await invoicesStore.initializeInvoices(selectedYear)
    } catch (err) {
      console.error('Failed to load invoices for year:', err)
      invoicesStore.error = '請求書データの読み込みに失敗しました'
    } finally {
      invoicesStore.isLoading = false
    }
  }
  // 同じ年内で月だけ変化した場合は、既に取得済みのデータを活用（何もしない）
  
  searchFilters.value.period = yearMonth
  showDatePicker.value = false
  onSearchChange()
}

const isSelectedMonth = (month) => {
  if (!searchFilters.value.period) return false
  const [year, monthNum] = searchFilters.value.period.split('-')
  return parseInt(year) === displayYear.value && parseInt(monthNum) === month
}

const confirmDeleteInvoice = (invoice) => {
  invoiceToDelete.value = invoice
  showDeleteConfirm.value = true
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  invoiceToDelete.value = null
}

const executeDelete = async () => {
  if (!invoiceToDelete.value) return
  
  try {
    await invoicesStore.deleteInvoice(invoiceToDelete.value.id)
    showDeleteConfirm.value = false
    invoiceToDelete.value = null
  } catch (err) {
    console.error('Failed to delete invoice:', err)
    error.value = '請求書の削除に失敗しました: ' + (err.message || '不明なエラー')
    showDeleteConfirm.value = false
    invoiceToDelete.value = null
  }
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

// Watch for store errors
watch(() => invoicesStore.error, (newError) => {
  if (newError) {
    // エラーダイアログは既にテンプレートで表示
  }
})
</script>

<style scoped>
.invoices {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0 0.5rem;
}

.header h1 {
  color: #333;
  font-size: 1.5rem;
  margin: 0;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover {
  background: #0056b3;
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

.btn-pdf-export {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  height: fit-content;
  transition: background-color 0.2s;
}

.btn-pdf-export:hover:not(:disabled) {
  background: #218838;
}

.btn-pdf-export:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.invoices-list {
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

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

.invoice-cards {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.invoice-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.invoice-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.btn-delete {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.btn-delete:hover {
  background: rgba(220, 53, 69, 0.1);
  transform: scale(1.1);
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.invoice-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.1rem;
}

.invoice-period {
  background: #e9ecef;
  color: #495057;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.invoice-summary {
  margin-bottom: 1rem;
}

.amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.amount .label {
  color: #666;
  font-size: 0.9rem;
}

.amount .value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #007bff;
}

.details {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #666;
}

.invoice-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-outline {
  background: transparent;
  color: #007bff;
  border: 1px solid #007bff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-outline:hover {
  background: #007bff;
  color: white;
}


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

.delete-confirm-modal {
  max-width: 400px;
}

.delete-message {
  color: #333;
  font-size: 1rem;
  margin: 0;
  text-align: center;
  padding: 1rem 0;
}

.modal-footer {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.btn-cancel {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-cancel:hover {
  background: #545b62;
}

.btn-delete-confirm {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn-delete-confirm:hover {
  background: #c82333;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .invoices {
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
  
  .btn-primary {
    width: 100%;
    justify-content: center;
    padding: 1rem;
    font-size: 1rem;
    border-radius: 8px;
    background: #007bff;
    border: none;
    color: white;
    font-weight: 500;
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
  
  .search-field input:focus,
  .search-field select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
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
  
  .btn-pdf-export {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    border-radius: 8px;
    background: #28a745;
    border: none;
    color: white;
    font-weight: 500;
  }
  
  .btn-pdf-export:disabled {
    background: #6c757d;
    opacity: 0.6;
  }
  
  .invoices-list {
    border-radius: 0;
    box-shadow: none;
    background: white;
    margin: 0;
  }
  
  .invoice-cards {
    padding: 1rem;
    gap: 1rem;
  }
  
  .invoice-card {
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    position: relative;
  }

  .btn-delete {
    top: 0.5rem;
    right: 0.5rem;
    width: 36px;
    height: 36px;
    font-size: 1.3rem;
  }
  
  .invoice-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .invoice-header h3 {
    font-size: 1.1rem;
    line-height: 1.4;
    font-weight: 600;
    color: #333;
  }
  
  .invoice-period {
    align-self: flex-start;
    font-size: 0.8rem;
    padding: 0.25rem 0.75rem;
    background: #e9ecef;
    color: #495057;
    border-radius: 12px;
  }
  
  .invoice-summary {
    margin-bottom: 1rem;
  }
  
  .amount {
    margin-bottom: 0.5rem;
  }
  
  .amount .value {
    font-size: 1.2rem;
    font-weight: bold;
    color: #007bff;
  }
  
  .details {
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: #666;
  }
  
  .invoice-actions {
    flex-direction: row;
    gap: 0.5rem;
    justify-content: stretch;
  }
  
  .btn-outline {
    flex: 1;
    padding: 0.75rem;
    font-size: 0.9rem;
    text-align: center;
    border-radius: 6px;
    background: transparent;
    color: #007bff;
    border: 1px solid #007bff;
  }
  
  .modal {
    margin: 0.5rem;
    max-height: 95vh;
    border-radius: 12px;
  }
  
  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .modal-header h2 {
    font-size: 1.2rem;
    font-weight: 600;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .error-content {
    padding: 2rem;
    margin: 1rem;
    border-radius: 12px;
  }
  
  .error-content h3 {
    font-size: 1.2rem;
    color: #dc3545;
  }
  
  .error-content p {
    font-size: 1rem;
    color: #666;
  }
}

/* より小さいスマホサイズ */
@media (max-width: 480px) {
  .invoices {
    padding: 0;
  }
  
  .header {
    padding: 0.75rem;
  }
  
  .header h1 {
    font-size: 1.25rem;
  }
  
  .btn-primary {
    padding: 0.875rem;
    font-size: 0.95rem;
  }
  
  .search-section {
    padding: 1rem;
  }
  
  .search-field input,
  .search-field select {
    padding: 0.875rem;
    font-size: 0.95rem;
  }
  
  .btn-secondary {
    padding: 0.875rem;
    font-size: 0.95rem;
  }
  
  .invoice-cards {
    padding: 0.75rem;
  }
  
  .invoice-card {
    padding: 1rem;
  }
  
  .invoice-header h3 {
    font-size: 1rem;
  }
  
  .amount .value {
    font-size: 1.1rem;
  }
  
  .details {
    font-size: 0.75rem;
  }
  
  .btn-outline {
    padding: 0.625rem;
    font-size: 0.85rem;
  }
}
</style> 