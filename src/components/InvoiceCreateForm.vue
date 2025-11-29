<template>
  <div class="invoice-create-form">
    <!-- ローディング表示 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <p>請求書を作成中...</p>
        <p class="loading-detail">{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- フォーム -->
    <form @submit.prevent="createInvoices" class="form">
      <!-- 対象月選択 -->
      <div class="form-group">
        <label>対象年月</label>
        <div class="date-picker-container">
          <!-- 選択された年月の表示 -->
          <div class="date-display" @click="showDatePicker = true">
            <span v-if="formData.targetYear && formData.targetMonth">
              {{ formData.targetYear }}-{{ String(formData.targetMonth).padStart(2, '0') }}
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
                :disabled="isLoading"
              >
                ‹
              </button>
              <span class="year-display">{{ displayYear }}年</span>
              <button 
                type="button" 
                class="nav-button" 
                @click="increaseYear"
                :disabled="isLoading"
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
                :class="{ active: formData.targetYear === displayYear && formData.targetMonth === month }"
                @click="selectMonth(month)"
                :disabled="isLoading"
              >
                {{ month }}月
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ローディング表示（対象月選択時のsalesデータ読み込み中） -->
      <div v-if="isSalesLoading" class="loading-message">
        <p>売上データを読み込み中...</p>
      </div>

      <!-- 顧客選択 -->
      <div v-if="formData.targetYear && formData.targetMonth && !isSalesLoading" class="form-group">
        <label>顧客選択</label>
        <div v-if="filteredCustomers.length === 0" class="no-customers-message">
          対象期間に売上データがある顧客がありません。
        </div>
        <div v-else class="customer-selection">
          <div class="select-all">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="selectAll" 
                @change="toggleSelectAll"
                :disabled="isLoading"
              />
              <span class="checkmark"></span>
              全選択
            </label>
          </div>
          <div class="customer-list">
            <label 
              v-for="customer in filteredCustomers" 
              :key="customer.id" 
              class="checkbox-label customer-item"
            >
              <input 
                type="checkbox" 
                :value="customer.id" 
                v-model="formData.selectedCustomers"
                :disabled="isLoading"
              />
              <span class="checkmark"></span>
              <div class="customer-info">
                <div class="customer-name">{{ customer.name }}</div>
                <div class="customer-details">
                  <span class="closing-day">締め日: {{ customer.closingDay }}</span>
                  <span class="payment-method">{{ customer.paymentMethod }}</span>
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- 選択された顧客のプレビュー -->
      <div v-if="formData.selectedCustomers.length > 0" class="preview-section">
        <h3>請求書プレビュー</h3>
        <div class="preview-list">
          <div 
            v-for="customerId in formData.selectedCustomers" 
            :key="customerId"
            class="preview-item"
          >
            <div class="customer-preview">
              <div class="customer-name">{{ getCustomerName(customerId) }}</div>
              <div class="customer-period">
                {{ formData.targetYear }}年{{ formData.targetMonth }}月分
                (締め日: {{ getCustomerClosingDay(customerId) }})
              </div>
              <div class="sales-summary">
                <span v-if="getSalesCount(customerId) > 0">
                  {{ getSalesCount(customerId) }}件の売上データ
                </span>
                <span v-else class="no-sales">
                  売上データなし
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- エラー表示 -->
      <div v-if="error" class="error-message">
        <i class="icon-warning"></i>
        {{ error }}
      </div>

      <!-- ボタン -->
      <div class="form-actions">
        <button 
          type="button" 
          @click="$emit('cancel')" 
          class="btn-secondary"
          :disabled="isLoading"
        >
          キャンセル
        </button>
        <button 
          type="submit" 
          class="btn-primary"
          :disabled="!canCreate || isLoading"
        >
          <i class="icon-plus"></i>
          請求書を作成
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useInvoicesStore } from '../stores/invoices'
import { useCustomersStore } from '../stores/customers'
import { useSalesStore } from '../stores/sales'

const emit = defineEmits(['created', 'cancel'])

const invoicesStore = useInvoicesStore()
const customersStore = useCustomersStore()
const salesStore = useSalesStore()

// State
const isLoading = ref(false)
const error = ref('')
const loadingMessage = ref('')
const selectAll = ref(false)
const showDatePicker = ref(false)
const displayYear = ref(new Date().getFullYear())

const formData = ref({
  targetYear: '',
  targetMonth: '',
  selectedCustomers: []
})

// 対象月が変更された時の処理用
const isSalesLoading = ref(false)
const availableCustomersForMonth = ref([])
// 売上データの件数をキャッシュ（customerId -> count）
const salesCountCache = ref(new Map())

// Computed
const customers = computed(() => customersStore.customers)
const sales = computed(() => salesStore.sales)

// 年月選択のメソッド
const decreaseYear = () => {
  displayYear.value--
}

const increaseYear = () => {
  displayYear.value++
}

const selectMonth = (month) => {
  formData.value.targetYear = displayYear.value
  formData.value.targetMonth = month
  showDatePicker.value = false
  onTargetMonthChange()
}

// 対象月に該当する顧客のみを表示
const filteredCustomers = computed(() => {
  if (!formData.value.targetYear || !formData.value.targetMonth) {
    return []
  }
  return availableCustomersForMonth.value
})

const canCreate = computed(() => {
  return formData.value.targetYear && formData.value.targetMonth && formData.value.selectedCustomers.length > 0
})

// Methods
const initializeData = async () => {
  try {
    // 顧客データのみ読み込み
    await customersStore.initializeCustomers()
  } catch (err) {
    console.error('Failed to initialize data:', err)
    error.value = 'データの読み込みに失敗しました'
  }
}

// 対象月が変更された時の処理
const onTargetMonthChange = async () => {
  if (!formData.value.targetYear || !formData.value.targetMonth) {
    availableCustomersForMonth.value = []
    formData.value.selectedCustomers = []
    return
  }

  try {
    isSalesLoading.value = true
    error.value = ''

    // salesデータを読み込み（まだ読み込まれていない場合）
    if (sales.value.length === 0) {
      await salesStore.initializeSales()
    }

    // 対象年月をYYYY-MM形式に変換
    const targetYearMonth = `${formData.value.targetYear}-${String(formData.value.targetMonth).padStart(2, '0')}`

    // 売上データを顧客IDでインデックス化（パフォーマンス向上）
    const salesByCustomer = new Map()
    sales.value.forEach(sale => {
      if (!salesByCustomer.has(sale.customerId)) {
        salesByCustomer.set(sale.customerId, [])
      }
      salesByCustomer.get(sale.customerId).push(sale)
    })

    // 各顧客の締日を考慮して、対象期間に該当する売上データがある顧客を抽出
    const customersWithSales = new Set()
    const salesCountMap = new Map() // 売上件数のキャッシュ

    customers.value.forEach(customer => {
      // 締日に基づいて対象期間を計算
      const period = calculateClosingPeriod(customer.closingDay, targetYearMonth)
      
      // 該当顧客の売上データのみをチェック（全売上データをループしない）
      const customerSales = salesByCustomer.get(customer.id) || []
      const matchingSales = customerSales.filter(sale => {
        const saleDate = sale.issuedOn
        return saleDate >= period.from && saleDate <= period.to
      })

      if (matchingSales.length > 0) {
        customersWithSales.add(customer.id)
        // 売上件数をキャッシュ
        salesCountMap.set(customer.id, matchingSales.length)
      }
    })

    // 該当する顧客のみを表示
    availableCustomersForMonth.value = customers.value.filter(c => customersWithSales.has(c.id))
    
    // 売上件数のキャッシュを更新
    salesCountCache.value = salesCountMap
    
    // 選択をリセット
    formData.value.selectedCustomers = []
    selectAll.value = false

  } catch (err) {
    console.error('Failed to load sales for target month:', err)
    error.value = '売上データの取得に失敗しました'
  } finally {
    isSalesLoading.value = false
  }
}

const toggleSelectAll = () => {
  if (selectAll.value) {
    formData.value.selectedCustomers = filteredCustomers.value.map(c => c.id)
  } else {
    formData.value.selectedCustomers = []
  }
}

const getCustomerName = (customerId) => {
  const customer = customers.value.find(c => c.id === customerId)
  return customer ? customer.name : '不明な顧客'
}

const getCustomerClosingDay = (customerId) => {
  const customer = customers.value.find(c => c.id === customerId)
  return customer ? customer.closingDay : '不明'
}

const getSalesCount = (customerId) => {
  if (!formData.value.targetYear || !formData.value.targetMonth) return 0
  
  // キャッシュから取得（計算済みの場合は再利用）
  if (salesCountCache.value.has(customerId)) {
    return salesCountCache.value.get(customerId)
  }
  
  // キャッシュにない場合のみ計算（フォールバック）
  const customer = customers.value.find(c => c.id === customerId)
  if (!customer) return 0

  // 対象年月をYYYY-MM形式に変換
  const targetYearMonth = `${formData.value.targetYear}-${String(formData.value.targetMonth).padStart(2, '0')}`

  // 締日に基づいて対象期間を計算
  const period = calculateClosingPeriod(customer.closingDay, targetYearMonth)
  
  // 対象期間の売上データをカウント
  const count = sales.value.filter(sale => {
    const saleDate = sale.issuedOn
    return sale.customerId === customerId && 
           saleDate >= period.from && 
           saleDate <= period.to
  }).length
  
  // キャッシュに保存
  salesCountCache.value.set(customerId, count)
  return count
}

// formatMonth関数は削除（使用されていない）

const calculateInvoiceData = async (customerId) => {
  const customer = customers.value.find(c => c.id === customerId)
  if (!customer) throw new Error('顧客が見つかりません')

  // 対象年月をYYYY-MM形式に変換
  const targetYearMonth = `${formData.value.targetYear}-${String(formData.value.targetMonth).padStart(2, '0')}`

  // 締め日計算
  const period = calculateClosingPeriod(customer.closingDay, targetYearMonth)
  
  // 対象期間の売上データを取得
  const targetSales = sales.value.filter(sale => {
    const saleDate = sale.issuedOn
    return sale.customerId === customerId && 
           saleDate >= period.from && 
           saleDate <= period.to
  })

  if (targetSales.length === 0) {
    throw new Error(`${customer.name}の対象期間に売上データがありません`)
  }

  // 明細データの生成
  const details = []
  targetSales.forEach(sale => {
    sale.lines.forEach(line => {
      details.push({
        orderDate: sale.issuedOn,
        productName: line.productName,
        quantity: line.quantity,
        unitPriceExclTax: line.priceExclTax,
        subtotalExclTax: line.quantity * line.priceExclTax
      })
    })
  })

  // 集計計算
  const subtotalExclTax = details.reduce((sum, detail) => sum + detail.subtotalExclTax, 0)
  const totalTax = Math.floor(subtotalExclTax * 0.1) // 10%税率を仮定
  const totalInclTax = subtotalExclTax + totalTax

  return {
    customerId: customer.id,
    customerName: customer.name,
    period: `${formData.value.targetYear}年${formData.value.targetMonth}月分`,
    closingDay: customer.closingDay,
    paymentMethod: customer.paymentMethod,
    summary: {
      subtotalExclTax,
      totalTax,
      totalInclTax
    },
    details
  }
}

const calculateClosingPeriod = (closingDay, targetMonth) => {
  if (closingDay === '末日') {
    // 月末締めの場合：当月1日〜当月末日
    // 例：1月分 → 1/1 ~ 1/31
    return {
      from: `${targetMonth}-01`,
      to: getLastDayOfMonth(targetMonth)
    }
  } else {
    // 数字の締日（例：20日締め、25日締め）の場合
    // 前月の締日の翌日〜当月の締日
    // 例：1月分で20日締め → 12/21 ~ 1/20
    const day = parseInt(closingDay)
    const [year, month] = targetMonth.split('-')
    
    // 当月の締日
    const toDate = `${targetMonth}-${String(day).padStart(2, '0')}`
    
    // 前月の締日を計算
    const targetDate = new Date(year, month - 1, day) // 当月の締日
    const prevMonthDate = new Date(targetDate)
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1) // 前月に移動
    const prevYear = prevMonthDate.getFullYear()
    const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0')
    
    // 前月の締日の翌日を計算
    const prevClosingDate = new Date(prevYear, prevMonthDate.getMonth(), day)
    const nextDay = new Date(prevClosingDate)
    nextDay.setDate(nextDay.getDate() + 1) // 翌日
    
    const fromYear = nextDay.getFullYear()
    const fromMonth = String(nextDay.getMonth() + 1).padStart(2, '0')
    const fromDay = String(nextDay.getDate()).padStart(2, '0')
    
    const fromDate = `${fromYear}-${fromMonth}-${fromDay}`
    
    return {
      from: fromDate,
      to: toDate
    }
  }
}

const getLastDayOfMonth = (yearMonth) => {
  const [year, month] = yearMonth.split('-')
  const date = new Date(year, month, 0) // 翌月の0日 = 当月の最終日
  return `${yearMonth}-${String(date.getDate()).padStart(2, '0')}`
}

const createInvoices = async () => {
  if (!canCreate.value) return

  try {
    isLoading.value = true
    error.value = ''
    loadingMessage.value = '請求書データを準備中...'

    const invoicesData = []
    
    for (let i = 0; i < formData.value.selectedCustomers.length; i++) {
      const customerId = formData.value.selectedCustomers[i]
      loadingMessage.value = `請求書データを準備中... (${i + 1}/${formData.value.selectedCustomers.length})`
      
      try {
        const invoiceData = await calculateInvoiceData(customerId)
        invoicesData.push(invoiceData)
      } catch (err) {
        console.warn(`Failed to calculate invoice for customer ${customerId}:`, err)
        // 個別のエラーは警告として扱い、処理を続行
      }
    }

    if (invoicesData.length === 0) {
      throw new Error('作成可能な請求書がありません')
    }

    loadingMessage.value = '請求書を保存中...'
    
    // 請求書を一括作成
    await invoicesStore.bulkCreateInvoices(invoicesData)
    
    emit('created')
    
  } catch (err) {
    console.error('Failed to create invoices:', err)
    error.value = err.message || '請求書の作成に失敗しました'
  } finally {
    isLoading.value = false
    loadingMessage.value = ''
  }
}

// Watch for select all changes
watch(() => formData.value.selectedCustomers.length, (newLength) => {
  selectAll.value = newLength === filteredCustomers.value.length && newLength > 0
})

// 選択された年月が変更されたときにdisplayYearも更新
watch(() => formData.value.targetYear, (newYear) => {
  if (newYear) {
    displayYear.value = newYear
  }
})

// Lifecycle
onMounted(() => {
  initializeData()
})
</script>

<style scoped>
.invoice-create-form {
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 8px;
}

.loading-content {
  text-align: center;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-detail {
  font-size: 0.9rem;
  color: #999;
  margin-top: 0.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
}

.form-group select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background: white;
}

/* 年月選択UI */
.date-picker-container {
  position: relative;
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

.customer-selection {
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.select-all {
  background: #f8f9fa;
  padding: 0.75rem;
  border-bottom: 1px solid #ddd;
}

.customer-list {
  max-height: 300px;
  overflow-y: auto;
}

.checkbox-label {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.checkbox-label:hover {
  background-color: #f8f9fa;
}

.checkbox-label input[type="checkbox"] {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 3px;
  margin-right: 0.75rem;
  position: relative;
  flex-shrink: 0;
}

.checkbox-label input[type="checkbox"]:checked + .checkmark {
  background: #007bff;
  border-color: #007bff;
}

.checkbox-label input[type="checkbox"]:checked + .checkmark::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 2px;
  width: 6px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.customer-item {
  align-items: flex-start;
}

.customer-info {
  flex: 1;
}

.customer-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.customer-details {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #666;
}

.closing-day {
  color: #007bff;
}

.payment-method {
  color: #28a745;
}

.preview-section {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 1rem;
}

.preview-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-item {
  background: white;
  border-radius: 4px;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
}

.customer-preview {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.customer-preview .customer-name {
  font-weight: 500;
  color: #333;
}

.customer-period {
  font-size: 0.8rem;
  color: #666;
}

.sales-summary {
  font-size: 0.8rem;
  color: #007bff;
}

.no-sales {
  color: #dc3545;
}

.loading-message {
  background: #e7f3ff;
  color: #0066cc;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #b3d9ff;
  text-align: center;
  margin: 1rem 0;
}

.no-customers-message {
  background: #fff3cd;
  color: #856404;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #ffeaa7;
  text-align: center;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-secondary:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .form {
    gap: 1rem;
  }
  
  .form-group label {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .form-group select {
    padding: 1rem;
    font-size: 1rem;
    border-radius: 8px;
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
  
  .customer-selection {
    border-radius: 8px;
  }
  
  .select-all {
    padding: 1rem;
  }
  
  .checkbox-label {
    padding: 1rem;
    font-size: 0.9rem;
  }
  
  .checkmark {
    width: 24px;
    height: 24px;
    margin-right: 1rem;
  }
  
  .customer-name {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .customer-details {
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
  }
  
  .preview-section {
    padding: 1rem;
    border-radius: 8px;
  }
  
  .preview-section h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }
  
  .preview-item {
    padding: 1rem;
    border-radius: 6px;
  }
  
  .customer-preview .customer-name {
    font-size: 1rem;
  }
  
  .customer-period {
    font-size: 0.9rem;
  }
  
  .sales-summary {
    font-size: 0.9rem;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 0.75rem;
    padding-top: 1.5rem;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    justify-content: center;
  }
  
  .error-message {
    padding: 1rem;
    font-size: 0.9rem;
    border-radius: 6px;
  }
}

/* より小さいスマホサイズ */
@media (max-width: 480px) {
  .form {
    gap: 0.75rem;
  }
  
  .form-group select {
    padding: 0.875rem;
  }
  
  .checkbox-label {
    padding: 0.875rem;
    font-size: 0.85rem;
  }
  
  .checkmark {
    width: 20px;
    height: 20px;
    margin-right: 0.75rem;
  }
  
  .customer-name {
    font-size: 0.9rem;
  }
  
  .customer-details {
    font-size: 0.75rem;
  }
  
  .preview-section {
    padding: 0.75rem;
  }
  
  .preview-item {
    padding: 0.75rem;
  }
  
  .customer-preview .customer-name {
    font-size: 0.9rem;
  }
  
  .customer-period {
    font-size: 0.8rem;
  }
  
  .sales-summary {
    font-size: 0.8rem;
  }
  
  .form-actions {
    padding-top: 1rem;
  }
  
  .btn-primary,
  .btn-secondary {
    padding: 0.875rem;
    font-size: 0.9rem;
  }
}
</style>

