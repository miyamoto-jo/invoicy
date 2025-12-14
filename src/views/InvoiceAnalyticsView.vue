<template>
  <AppLayout>
    <div class="invoice-analytics">
      <div class="header">
        <h1>請求書分析</h1>
      </div>

      <!-- 請求モード選択 -->
      <div class="mode-selection">
        <label class="radio-label">
          <input 
            type="radio" 
            value="yearly" 
            v-model="selectedMode"
            @change="onModeChange"
          />
          <span>年間請求</span>
        </label>
        <label class="radio-label">
          <input 
            type="radio" 
            value="monthly" 
            v-model="selectedMode"
            @change="onModeChange"
          />
          <span>月間請求</span>
        </label>
      </div>

      <!-- ローディング表示 -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-content">
          <div class="spinner"></div>
          <p>データを分析中...</p>
        </div>
      </div>

      <!-- エラーメッセージ -->
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <!-- 年間請求モード -->
      <div v-if="selectedMode === 'yearly' && !isLoading && !error" class="analytics-content">
        <!-- 年選択 -->
        <div class="date-selection">
          <label>表示する年</label>
          <input 
            type="number" 
            v-model.number="selectedYear"
            @change="loadYearlyData"
            class="year-input"
          />
        </div>

        <div class="summary-row">
          <div class="summary-item">
            <span class="summary-label">年間請求金額（税込）</span>
            <span class="summary-value">¥{{ formatNumber(yearlyTotalInclTax) }}</span>
          </div>
        </div>

        <!-- グラフ分析 -->
        <div class="chart-section">
          <h2>グラフ分析</h2>
          <div class="chart-container">
            <div class="chart-inner">
              <Line :data="yearlyChartData" :options="chartOptions" />
            </div>
          </div>
        </div>

        <!-- 顧客分析 -->
        <div class="customer-analysis-section">
          <h2>顧客分析</h2>
          
          <div class="customer-grouping">
            <!-- 現金支払い -->
            <div v-if="Object.keys(cashGroupedCustomers).length > 0" class="payment-group">
              <h3 class="payment-group-title">
                現金支払い：合計 ¥{{ formatNumber(yearlyCashTotalInclTax) }}円
              </h3>
              <div 
                v-for="(group, closingDay) in cashGroupedCustomers" 
                :key="`cash-${closingDay}`"
                class="closing-day-group"
              >
                <h4 class="closing-day-title">{{ formatClosingDay(closingDay) }}〆</h4>
                <div class="customer-list">
                  <div 
                    v-for="customer in group" 
                    :key="customer.customerName"
                    class="customer-item"
                  >
                    <span class="customer-name">{{ customer.customerName }}:</span>
                    <span class="customer-amount">¥{{ formatNumber(customer.totalInclTax) }}円</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 振込支払い -->
            <div v-if="Object.keys(transferGroupedCustomers).length > 0" class="payment-group">
              <h3 class="payment-group-title">
                振込支払い：合計 ¥{{ formatNumber(yearlyTransferTotalInclTax) }}円
              </h3>
              <div 
                v-for="(group, closingDay) in transferGroupedCustomers" 
                :key="`transfer-${closingDay}`"
                class="closing-day-group"
              >
                <h4 class="closing-day-title">{{ formatClosingDay(closingDay) }}〆</h4>
                <div class="customer-list">
                  <div 
                    v-for="customer in group" 
                    :key="customer.customerName"
                    class="customer-item"
                  >
                    <span class="customer-name">{{ customer.customerName }}:</span>
                    <span class="customer-amount">¥{{ formatNumber(customer.totalInclTax) }}円</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- データがない場合 -->
            <div v-if="Object.keys(cashGroupedCustomers).length === 0 && Object.keys(transferGroupedCustomers).length === 0" class="no-data-message">
              データがありません
            </div>
          </div>
        </div>
      </div>

      <!-- 月間請求モード -->
      <div v-if="selectedMode === 'monthly' && !isLoading && !error" class="analytics-content">
        <!-- 年月選択 -->
        <div class="date-selection">
          <label>表示する年月</label>
          <div class="date-picker-container">
            <div class="date-display" @click="showDatePicker = true">
              <span v-if="selectedYearMonth">
                {{ selectedYearMonth }}
              </span>
              <span v-else class="placeholder">年月を選択してください</span>
              <span class="arrow">▼</span>
            </div>
          </div>
        </div>

        <!-- モーダル形式のカレンダーUI -->
        <div v-if="showDatePicker" class="date-picker-modal-overlay" @click="showDatePicker = false">
          <div class="date-picker-modal" @click.stop>
            <div class="date-picker-modal-header">
              <h3>年月を選択</h3>
              <button type="button" class="close-button" @click="showDatePicker = false">×</button>
            </div>
            
            <div class="date-picker-content">
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
              
              <div class="month-grid">
                <button
                  v-for="month in 12"
                  :key="month"
                  type="button"
                  class="month-button"
                  :class="{ active: selectedYear === displayYear && selectedMonth === month }"
                  @click="selectMonth(month)"
                  :disabled="isLoading"
                >
                  {{ month }}月
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 年月が選択されていない場合のメッセージ -->
        <div v-if="!selectedYearMonth" class="empty-state">
          <p>年月を選択してください</p>
        </div>

        <div v-if="selectedYearMonth" class="summary-row">
          <div class="summary-item">
            <span class="summary-label">月間請求金額（税込）</span>
            <span class="summary-value">¥{{ formatNumber(monthlyTotalInclTax) }}</span>
          </div>
        </div>

        <!-- 顧客分析 -->
        <div v-if="selectedYearMonth" class="customer-analysis-section">
          <h2>顧客分析</h2>
          
          <div class="customer-grouping">
            <!-- 現金支払い -->
            <div v-if="Object.keys(monthlyCashGroupedCustomers).length > 0" class="payment-group">
              <h3 class="payment-group-title">
                現金支払い：合計 ¥{{ formatNumber(monthlyCashTotalInclTax) }}円
              </h3>
              <div 
                v-for="(group, closingDay) in monthlyCashGroupedCustomers" 
                :key="`cash-${closingDay}`"
                class="closing-day-group"
              >
                <h4 class="closing-day-title">{{ formatClosingDay(closingDay) }}〆</h4>
                <div class="customer-list">
                  <div 
                    v-for="customer in group" 
                    :key="customer.customerName"
                    class="customer-item"
                  >
                    <span class="customer-name">{{ customer.customerName }}:</span>
                    <span class="customer-amount">¥{{ formatNumber(customer.totalInclTax) }}円</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 振込支払い -->
            <div v-if="Object.keys(monthlyTransferGroupedCustomers).length > 0" class="payment-group">
              <h3 class="payment-group-title">
                振込支払い：合計 ¥{{ formatNumber(monthlyTransferTotalInclTax) }}円
              </h3>
              <div 
                v-for="(group, closingDay) in monthlyTransferGroupedCustomers" 
                :key="`transfer-${closingDay}`"
                class="closing-day-group"
              >
                <h4 class="closing-day-title">{{ formatClosingDay(closingDay) }}〆</h4>
                <div class="customer-list">
                  <div 
                    v-for="customer in group" 
                    :key="customer.customerName"
                    class="customer-item"
                  >
                    <span class="customer-name">{{ customer.customerName }}:</span>
                    <span class="customer-amount">¥{{ formatNumber(customer.totalInclTax) }}円</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- データがない場合 -->
            <div v-if="Object.keys(monthlyCashGroupedCustomers).length === 0 && Object.keys(monthlyTransferGroupedCustomers).length === 0" class="no-data-message">
              データがありません
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import AppLayout from '../components/AppLayout.vue'
import { useInvoicesStore } from '../stores/invoices'

// Chart.jsの登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

// Stores
const invoicesStore = useInvoicesStore()

// Reactive data
const selectedMode = ref('') // 'yearly' or 'monthly' or ''
const selectedYear = ref(new Date().getFullYear())
const selectedYearMonth = ref('') // 'YYYY-MM' format
const selectedMonth = ref(null)
const displayYear = ref(new Date().getFullYear())
const showDatePicker = ref(false)

// インメモリデータ
const inMemoryInvoices = ref([])

const isLoading = ref(false)
const error = ref('')

// Computed
const yearlyChartData = computed(() => {
  if (selectedMode.value !== 'yearly' || inMemoryInvoices.value.length === 0) {
    return {
      labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      datasets: [{
        label: '請求金額（税込）',
        data: Array(12).fill(0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    }
  }

  // 月別に集計（periodから月を抽出）
  const monthlyTotals = Array(12).fill(0)
  inMemoryInvoices.value.forEach(invoice => {
    // period形式: "2025年1月分" から月を抽出
    const monthMatch = invoice.period.match(/(\d+)月分/)
    if (monthMatch) {
      const month = parseInt(monthMatch[1]) - 1 // 0-11に変換
      if (month >= 0 && month < 12) {
        monthlyTotals[month] += invoice.summary.totalInclTax
      }
    }
  })

  return {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    datasets: [{
      label: '請求金額（税込）',
      data: monthlyTotals,
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  }
})

const monthlyChartData = computed(() => {
  if (selectedMode.value !== 'monthly' || !selectedYearMonth.value || inMemoryInvoices.value.length === 0) {
    return {
      labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      datasets: [{
        label: '請求金額（税込）',
        data: Array(12).fill(0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    }
  }

  // 選択された年月の請求書をフィルタ
  const [year, month] = selectedYearMonth.value.split('-').map(Number)
  const filteredInvoices = inMemoryInvoices.value.filter(invoice => {
    const periodMatch = invoice.period.match(/(\d+)年(\d+)月分/)
    if (periodMatch) {
      const invoiceYear = parseInt(periodMatch[1])
      const invoiceMonth = parseInt(periodMatch[2])
      return invoiceYear === year && invoiceMonth === month
    }
    return false
  })

  // 1月〜12月の配列を作成（選択された月の請求額をその月の位置に配置）
  const monthlyTotals = Array(12).fill(0)
  filteredInvoices.forEach(invoice => {
    const monthMatch = invoice.period.match(/(\d+)月分/)
    if (monthMatch) {
      const invoiceMonth = parseInt(monthMatch[1]) - 1 // 0-11に変換
      if (invoiceMonth >= 0 && invoiceMonth < 12) {
        monthlyTotals[invoiceMonth] += invoice.summary.totalInclTax
      }
    }
  })

  return {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    datasets: [{
      label: '請求金額（税込）',
      data: monthlyTotals,
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top'
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          return `¥${new Intl.NumberFormat('ja-JP').format(context.parsed.y)}`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value) {
          return '¥' + new Intl.NumberFormat('ja-JP').format(value)
        }
      }
    }
  }
}))

const yearlyTotalInclTax = computed(() => {
  if (selectedMode.value !== 'yearly' || inMemoryInvoices.value.length === 0) {
    return 0
  }

  return inMemoryInvoices.value.reduce((sum, invoice) => {
    return sum + (invoice.summary?.totalInclTax ?? 0)
  }, 0)
})

const yearlyCashTotalInclTax = computed(() => {
  if (selectedMode.value !== 'yearly' || inMemoryInvoices.value.length === 0) {
    return 0
  }

  return inMemoryInvoices.value
    .filter(inv => inv.paymentMethod === '現金')
    .reduce((sum, invoice) => sum + (invoice.summary?.totalInclTax ?? 0), 0)
})

const yearlyTransferTotalInclTax = computed(() => {
  if (selectedMode.value !== 'yearly' || inMemoryInvoices.value.length === 0) {
    return 0
  }

  return inMemoryInvoices.value
    .filter(inv => inv.paymentMethod === '振込')
    .reduce((sum, invoice) => sum + (invoice.summary?.totalInclTax ?? 0), 0)
})

const monthlyTotalInclTax = computed(() => {
  if (selectedMode.value !== 'monthly' || !selectedYearMonth.value || inMemoryInvoices.value.length === 0) {
    return 0
  }

  return inMemoryInvoices.value.reduce((sum, invoice) => {
    return sum + (invoice.summary?.totalInclTax ?? 0)
  }, 0)
})

const monthlyCashTotalInclTax = computed(() => {
  if (selectedMode.value !== 'monthly' || !selectedYearMonth.value || inMemoryInvoices.value.length === 0) {
    return 0
  }

  return inMemoryInvoices.value
    .filter(inv => inv.paymentMethod === '現金')
    .reduce((sum, invoice) => sum + (invoice.summary?.totalInclTax ?? 0), 0)
})

const monthlyTransferTotalInclTax = computed(() => {
  if (selectedMode.value !== 'monthly' || !selectedYearMonth.value || inMemoryInvoices.value.length === 0) {
    return 0
  }

  return inMemoryInvoices.value
    .filter(inv => inv.paymentMethod === '振込')
    .reduce((sum, invoice) => sum + (invoice.summary?.totalInclTax ?? 0), 0)
})

// 現金支払いの顧客を締日ごとにグループ化
const cashGroupedCustomers = computed(() => {
  if (selectedMode.value !== 'yearly' || inMemoryInvoices.value.length === 0) {
    return {}
  }

  // 現金支払いの請求書のみをフィルタ
  const cashInvoices = inMemoryInvoices.value.filter(inv => inv.paymentMethod === '現金')
  
  // 顧客名と締日ごとに集計
  const customerMap = new Map()
  
  cashInvoices.forEach(invoice => {
    const key = `${invoice.customerName}_${invoice.closingDay}`
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerName: invoice.customerName,
        closingDay: invoice.closingDay,
        totalInclTax: 0
      })
    }
    const customerData = customerMap.get(key)
    customerData.totalInclTax += invoice.summary.totalInclTax
  })

  // 締日ごとにグループ化
  const grouped = {}
  customerMap.forEach((customerData, key) => {
    const closingDay = customerData.closingDay
    if (!grouped[closingDay]) {
      grouped[closingDay] = []
    }
    grouped[closingDay].push(customerData)
  })

  // 締日でソート（数値の場合は数値順、'末日'は最後）
  const sortedGrouped = {}
  Object.keys(grouped).sort((a, b) => {
    if (a === '末日') return 1
    if (b === '末日') return -1
    return parseInt(a) - parseInt(b)
  }).forEach(key => {
    sortedGrouped[key] = grouped[key].sort((a, b) => b.totalInclTax - a.totalInclTax)
  })

  return sortedGrouped
})

// 振込支払いの顧客を締日ごとにグループ化
const transferGroupedCustomers = computed(() => {
  if (selectedMode.value !== 'yearly' || inMemoryInvoices.value.length === 0) {
    return {}
  }

  // 振込支払いの請求書のみをフィルタ
  const transferInvoices = inMemoryInvoices.value.filter(inv => inv.paymentMethod === '振込')
  
  // 顧客名と締日ごとに集計
  const customerMap = new Map()
  
  transferInvoices.forEach(invoice => {
    const key = `${invoice.customerName}_${invoice.closingDay}`
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerName: invoice.customerName,
        closingDay: invoice.closingDay,
        totalInclTax: 0
      })
    }
    const customerData = customerMap.get(key)
    customerData.totalInclTax += invoice.summary.totalInclTax
  })

  // 締日ごとにグループ化
  const grouped = {}
  customerMap.forEach((customerData, key) => {
    const closingDay = customerData.closingDay
    if (!grouped[closingDay]) {
      grouped[closingDay] = []
    }
    grouped[closingDay].push(customerData)
  })

  // 締日でソート（数値の場合は数値順、'末日'は最後）
  const sortedGrouped = {}
  Object.keys(grouped).sort((a, b) => {
    if (a === '末日') return 1
    if (b === '末日') return -1
    return parseInt(a) - parseInt(b)
  }).forEach(key => {
    sortedGrouped[key] = grouped[key].sort((a, b) => b.totalInclTax - a.totalInclTax)
  })

  return sortedGrouped
})

// 月間請求用：現金支払いの顧客を締日ごとにグループ化
const monthlyCashGroupedCustomers = computed(() => {
  if (selectedMode.value !== 'monthly' || !selectedYearMonth.value || inMemoryInvoices.value.length === 0) {
    return {}
  }

  // 現金支払いの請求書のみをフィルタ
  const cashInvoices = inMemoryInvoices.value.filter(inv => inv.paymentMethod === '現金')
  
  // 顧客名と締日ごとに集計
  const customerMap = new Map()
  
  cashInvoices.forEach(invoice => {
    const key = `${invoice.customerName}_${invoice.closingDay}`
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerName: invoice.customerName,
        closingDay: invoice.closingDay,
        totalInclTax: 0
      })
    }
    const customerData = customerMap.get(key)
    customerData.totalInclTax += invoice.summary.totalInclTax
  })

  // 締日ごとにグループ化
  const grouped = {}
  customerMap.forEach((customerData, key) => {
    const closingDay = customerData.closingDay
    if (!grouped[closingDay]) {
      grouped[closingDay] = []
    }
    grouped[closingDay].push(customerData)
  })

  // 締日でソート（数値の場合は数値順、'末日'は最後）
  const sortedGrouped = {}
  Object.keys(grouped).sort((a, b) => {
    if (a === '末日') return 1
    if (b === '末日') return -1
    return parseInt(a) - parseInt(b)
  }).forEach(key => {
    sortedGrouped[key] = grouped[key].sort((a, b) => b.totalInclTax - a.totalInclTax)
  })

  return sortedGrouped
})

// 月間請求用：振込支払いの顧客を締日ごとにグループ化
const monthlyTransferGroupedCustomers = computed(() => {
  if (selectedMode.value !== 'monthly' || !selectedYearMonth.value || inMemoryInvoices.value.length === 0) {
    return {}
  }

  // 振込支払いの請求書のみをフィルタ
  const transferInvoices = inMemoryInvoices.value.filter(inv => inv.paymentMethod === '振込')
  
  // 顧客名と締日ごとに集計
  const customerMap = new Map()
  
  transferInvoices.forEach(invoice => {
    const key = `${invoice.customerName}_${invoice.closingDay}`
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        customerName: invoice.customerName,
        closingDay: invoice.closingDay,
        totalInclTax: 0
      })
    }
    const customerData = customerMap.get(key)
    customerData.totalInclTax += invoice.summary.totalInclTax
  })

  // 締日ごとにグループ化
  const grouped = {}
  customerMap.forEach((customerData, key) => {
    const closingDay = customerData.closingDay
    if (!grouped[closingDay]) {
      grouped[closingDay] = []
    }
    grouped[closingDay].push(customerData)
  })

  // 締日でソート（数値の場合は数値順、'末日'は最後）
  const sortedGrouped = {}
  Object.keys(grouped).sort((a, b) => {
    if (a === '末日') return 1
    if (b === '末日') return -1
    return parseInt(a) - parseInt(b)
  }).forEach(key => {
    sortedGrouped[key] = grouped[key].sort((a, b) => b.totalInclTax - a.totalInclTax)
  })

  return sortedGrouped
})

// Methods
const onModeChange = () => {
  inMemoryInvoices.value = []
  error.value = ''
  
  if (selectedMode.value === 'yearly') {
    loadYearlyData()
  } else if (selectedMode.value === 'monthly') {
    selectedYearMonth.value = ''
    selectedMonth.value = null
  }
}

const loadYearlyData = async () => {
  if (!selectedYear.value) return

  try {
    isLoading.value = true
    error.value = ''

    // 指定された年の請求書データを取得
    await invoicesStore.initializeInvoices(selectedYear.value)
    inMemoryInvoices.value = [...invoicesStore.invoices]

  } catch (err) {
    console.error('Failed to load yearly data:', err)
    error.value = 'データの読み込みに失敗しました'
  } finally {
    isLoading.value = false
  }
}

const loadMonthlyData = async () => {
  if (!selectedYearMonth.value) return

  try {
    isLoading.value = true
    error.value = ''

    // 指定された年月の請求書データを取得
    const [year, month] = selectedYearMonth.value.split('-').map(Number)
    await invoicesStore.initializeInvoices(year)
    
    // 選択された年月の請求書のみをフィルタ
    const allInvoices = invoicesStore.invoices
    inMemoryInvoices.value = allInvoices.filter(invoice => {
      const periodMatch = invoice.period.match(/(\d+)年(\d+)月分/)
      if (periodMatch) {
        const invoiceYear = parseInt(periodMatch[1])
        const invoiceMonth = parseInt(periodMatch[2])
        return invoiceYear === year && invoiceMonth === month
      }
      return false
    })

  } catch (err) {
    console.error('Failed to load monthly data:', err)
    error.value = 'データの読み込みに失敗しました'
  } finally {
    isLoading.value = false
  }
}

const decreaseYear = () => {
  displayYear.value--
}

const increaseYear = () => {
  displayYear.value++
}

const selectMonth = (month) => {
  selectedYear.value = displayYear.value
  selectedMonth.value = month
  selectedYearMonth.value = `${displayYear.value}-${String(month).padStart(2, '0')}`
  showDatePicker.value = false
  loadMonthlyData()
}

const formatNumber = (num) => {
  return new Intl.NumberFormat('ja-JP').format(num)
}

const formatClosingDay = (closingDay) => {
  if (closingDay === '末日') {
    return '末日'
  }
  return `${closingDay}日`
}

// Lifecycle
onMounted(() => {
  // 初期化時は何もしない（モードが選択されるまで待つ）
})
</script>

<style scoped>
.invoice-analytics {
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

.mode-selection {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.radio-label {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  flex: 1;
  max-width: 200px;
}

.radio-label input[type="radio"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.radio-label span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  transition: all 0.2s ease;
  user-select: none;
}

.radio-label:hover span {
  background: #e9ecef;
  border-color: #adb5bd;
}

.radio-label input[type="radio"]:checked + span {
  background: #007bff;
  color: white;
  border-color: #007bff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.radio-label input[type="radio"]:focus + span {
  outline: 2px solid #80bdff;
  outline-offset: 2px;
}

.loading-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.loading-content {
  text-align: center;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-banner {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #f5c6cb;
}

.analytics-content {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.date-selection {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.date-selection label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.year-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 120px;
}

.date-picker-container {
  position: relative;
}

.date-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  background: white;
  width: 200px;
}

.date-display .placeholder {
  color: #999;
  font-size: 0.9rem;
}

.date-display .arrow {
  color: #666;
}

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
}

.date-picker-modal {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
}

.date-picker-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.date-picker-modal-header h3 {
  margin: 0;
  color: #333;
}

.close-button {
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

.close-button:hover {
  color: #333;
}

.date-picker-content {
  padding: 1rem 0;
}

.date-picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.nav-button {
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-size: 1.2rem;
}

.nav-button:hover:not(:disabled) {
  background: #e0e0e0;
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.year-display {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.month-button {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
}

.month-button:hover:not(:disabled) {
  background: #f0f0f0;
}

.month-button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.month-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chart-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.chart-section h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.25rem;
}

.chart-container {
  height: 400px;
  position: relative;
  overflow-x: auto;
}

.chart-inner {
  min-width: 800px;
}

.summary-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f8f9fa;
  min-width: 220px;
}

.summary-label {
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
}

.summary-value {
  font-weight: 700;
  color: #333;
  font-size: 1.4rem;
}

.customer-analysis-section {
  margin-bottom: 2rem;
}

.customer-analysis-section h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.25rem;
}

.customer-grouping {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.payment-group {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
}

.payment-group-title {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #dee2e6;
}

.closing-day-group {
  margin-bottom: 1.5rem;
}

.closing-day-group:last-child {
  margin-bottom: 0;
}

.closing-day-title {
  margin: 0 0 0.75rem 0;
  color: #666;
  font-size: 1rem;
  font-weight: 600;
  padding-left: 0.5rem;
  border-left: 3px solid #007bff;
}

.customer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1rem;
}

.customer-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.customer-name {
  color: #333;
  font-weight: 500;
}

.customer-amount {
  color: #007bff;
  font-weight: 600;
  font-size: 1rem;
}

.no-data-message {
  text-align: center;
  padding: 2rem;
  color: #999;
  background: #f8f9fa;
  border-radius: 4px;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  background: #f8f9fa;
  border-radius: 4px;
  margin-top: 1rem;
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .invoice-analytics {
    padding: 0;
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

  .mode-selection {
    flex-direction: row;
    gap: 0.75rem;
    margin: 1rem;
  }

  .radio-label {
    max-width: none;
  }

  .radio-label span {
    padding: 0.625rem 1rem;
    font-size: 0.9rem;
  }

  .analytics-content {
    margin: 1rem;
    padding: 1rem;
  }

  .chart-container {
    height: 300px;
  }

  .chart-inner {
    height: 300px;
    min-width: 700px;
  }

  .customer-grouping {
    gap: 1.5rem;
  }

  .payment-group {
    padding: 1rem;
  }

  .customer-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>

