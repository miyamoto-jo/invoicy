<template>
  <AppLayout>
    <div class="sales-analytics">
      <div class="header">
        <h1>売上分析</h1>
      </div>

      <!-- 売上モード選択 -->
      <div class="mode-selection">
        <label class="radio-label">
          <input 
            type="radio" 
            value="yearly" 
            v-model="selectedMode"
            @change="onModeChange"
          />
          <span>年間売上</span>
        </label>
        <label class="radio-label">
          <input 
            type="radio" 
            value="monthly" 
            v-model="selectedMode"
            @change="onModeChange"
          />
          <span>月間売上</span>
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

      <!-- 年間売上モード -->
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
            <span class="summary-label">年間売上合計（税込）</span>
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
          
          <!-- 支払い別売上 -->
          <div class="payment-summary">
            <div class="payment-item">
              <span class="payment-label">現金売上：</span>
              <span class="payment-value">¥{{ formatNumber(paymentSummary.cash) }}（税込）</span>
            </div>
            <div class="payment-item">
              <span class="payment-label">振込売上：</span>
              <span class="payment-value">¥{{ formatNumber(paymentSummary.transfer) }}（税込）</span>
            </div>
          </div>

          <!-- 顧客別売上テーブル -->
          <div class="table-container">
            <table class="analysis-table">
              <thead>
                <tr>
                  <th>顧客名</th>
                  <th>支払い方法</th>
                  <th>金額（税込）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="customer in customerAnalysis" :key="customer.id">
                  <td>{{ customer.displayName }}</td>
                  <td>{{ customer.paymentMethod }}</td>
                  <td>¥{{ formatNumber(customer.totalInclTax) }}</td>
                </tr>
                <tr v-if="customerAnalysis.length === 0">
                  <td colspan="3" class="no-data">データがありません</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 商品分析 -->
        <div class="product-analysis-section">
          <h2>商品分析</h2>
          <p class="product-note">商品IDごとに集計しています。</p>
          <div class="product-controls">
            <label class="sort-label">
              <span>並び替え</span>
              <select v-model="productSortKey">
                <option value="amount">金額</option>
                <option value="quantity">数量</option>
              </select>
            </label>
          </div>
          <div class="table-container">
            <table class="analysis-table">
              <thead>
                <tr>
                  <th>順位</th>
                  <th>商品名</th>
                  <th>個数</th>
                  <th>合計金額（税込）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(product, index) in productAnalysis" :key="product.productId">
                  <td>{{ formatRank(index + 1) }}</td>
                  <td>{{ product.displayName }}</td>
                  <td>{{ product.quantity }}</td>
                  <td>¥{{ formatNumber(product.totalInclTax) }}</td>
                </tr>
                <tr v-if="productAnalysis.length === 0">
                  <td colspan="4" class="no-data">データがありません</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 月間売上モード -->
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

        <div v-if="selectedYearMonth" class="summary-row">
          <div class="summary-item">
            <span class="summary-label">月間売上合計（税込）</span>
            <span class="summary-value">¥{{ formatNumber(monthlyTotalInclTax) }}</span>
          </div>
        </div>

        <!-- 年月が選択されていない場合のメッセージ -->
        <div v-if="!selectedYearMonth" class="empty-state">
          <p>年月を選択してください</p>
        </div>

        <!-- グラフ分析 -->
        <div v-if="selectedYearMonth" class="chart-section">
          <h2>グラフ分析</h2>
          <div class="chart-container">
            <div class="chart-inner">
              <Line :data="monthlyChartData" :options="chartOptions" />
            </div>
          </div>
        </div>

        <!-- 顧客分析 -->
        <div v-if="selectedYearMonth" class="customer-analysis-section">
          <h2>顧客分析</h2>
          
          <!-- 支払い別売上 -->
          <div class="payment-summary">
            <div class="payment-item">
              <span class="payment-label">現金売上：</span>
              <span class="payment-value">¥{{ formatNumber(paymentSummary.cash) }}（税込）</span>
            </div>
            <div class="payment-item">
              <span class="payment-label">振込売上：</span>
              <span class="payment-value">¥{{ formatNumber(paymentSummary.transfer) }}（税込）</span>
            </div>
          </div>

          <!-- 顧客別売上テーブル -->
          <div class="table-container">
            <table class="analysis-table">
              <thead>
                <tr>
                  <th>顧客名</th>
                  <th>支払い方法</th>
                  <th>金額（税込）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="customer in customerAnalysis" :key="customer.id">
                  <td>{{ customer.displayName }}</td>
                  <td>{{ customer.paymentMethod }}</td>
                  <td>¥{{ formatNumber(customer.totalInclTax) }}</td>
                </tr>
                <tr v-if="customerAnalysis.length === 0">
                  <td colspan="3" class="no-data">データがありません</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 商品分析 -->
        <div v-if="selectedYearMonth" class="product-analysis-section">
          <h2>商品分析</h2>
          <p class="product-note">商品IDごとに集計しています。</p>
          <div class="product-controls">
            <label class="sort-label">
              <span>並び替え</span>
              <select v-model="productSortKey">
                <option value="amount">金額</option>
                <option value="quantity">数量</option>
              </select>
            </label>
          </div>
          <div class="table-container">
            <table class="analysis-table">
              <thead>
                <tr>
                  <th>順位</th>
                  <th>商品名</th>
                  <th>個数</th>
                  <th>合計金額（税込）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(product, index) in productAnalysis" :key="product.productId">
                  <td>{{ formatRank(index + 1) }}</td>
                  <td>{{ product.displayName }}</td>
                  <td>{{ product.quantity }}</td>
                  <td>¥{{ formatNumber(product.totalInclTax) }}</td>
                </tr>
                <tr v-if="productAnalysis.length === 0">
                  <td colspan="4" class="no-data">データがありません</td>
                </tr>
              </tbody>
            </table>
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
import { useSalesStore } from '../stores/sales'
import { useCustomersStore } from '../stores/customers'
import { useProductsStore } from '../stores/products'

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
const salesStore = useSalesStore()
const customersStore = useCustomersStore()
const productsStore = useProductsStore()

// Reactive data
const selectedMode = ref('') // 'yearly' or 'monthly' or ''
const selectedYear = ref(new Date().getFullYear())
const selectedYearMonth = ref('') // 'YYYY-MM' format
const selectedMonth = ref(null)
const displayYear = ref(new Date().getFullYear())
const showDatePicker = ref(false)
const productSortKey = ref('amount') // 'amount' | 'quantity'

// インメモリデータ
const inMemorySales = ref([])
const inMemoryCustomers = ref([])
const inMemoryProducts = ref([])

const isLoading = ref(false)
const error = ref('')

// Computed
const yearlyChartData = computed(() => {
  if (selectedMode.value !== 'yearly' || inMemorySales.value.length === 0) {
    return {
      labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      datasets: [{
        label: '売上金額（税込）',
        data: Array(12).fill(0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    }
  }

  // 月別に集計
  const monthlyTotals = Array(12).fill(0)
  inMemorySales.value.forEach(sale => {
    const saleDate = new Date(sale.issuedOn)
    const month = saleDate.getMonth() // 0-11
    monthlyTotals[month] += sale.totals.totalInclTax
  })

  return {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    datasets: [{
      label: '売上金額（税込）',
      data: monthlyTotals,
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      tension: 0.1
    }]
  }
})

const monthlyChartData = computed(() => {
  if (selectedMode.value !== 'monthly' || !selectedYearMonth.value || inMemorySales.value.length === 0) {
    return {
      labels: [],
      datasets: [{
        label: '売上金額（税込）',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    }
  }

  // 年月から日数を取得
  const [year, month] = selectedYearMonth.value.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  
  // 日別に集計
  const dailyTotals = Array(daysInMonth).fill(0)
  inMemorySales.value.forEach(sale => {
    const saleDate = new Date(sale.issuedOn)
    const day = saleDate.getDate() - 1 // 0-indexed
    if (day >= 0 && day < daysInMonth) {
      dailyTotals[day] += sale.totals.totalInclTax
    }
  })

  const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}日`)

  return {
    labels,
    datasets: [{
      label: '売上金額（税込）',
      data: dailyTotals,
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
  if (selectedMode.value !== 'yearly' || inMemorySales.value.length === 0) {
    return 0
  }

  return inMemorySales.value.reduce((sum, sale) => {
    return sum + (sale.totals?.totalInclTax ?? 0)
  }, 0)
})

const monthlyTotalInclTax = computed(() => {
  if (selectedMode.value !== 'monthly' || !selectedYearMonth.value || inMemorySales.value.length === 0) {
    return 0
  }

  return inMemorySales.value.reduce((sum, sale) => {
    return sum + (sale.totals?.totalInclTax ?? 0)
  }, 0)
})

const customerAnalysis = computed(() => {
  if (inMemorySales.value.length === 0 || inMemoryCustomers.value.length === 0) {
    return []
  }

  // 顧客IDごとに集計
  const customerMap = new Map()
  
  inMemorySales.value.forEach(sale => {
    if (!customerMap.has(sale.customerId)) {
      customerMap.set(sale.customerId, {
        id: sale.customerId,
        totalInclTax: 0
      })
    }
    const customerData = customerMap.get(sale.customerId)
    customerData.totalInclTax += sale.totals.totalInclTax
  })

  // 顧客マスター情報を追加
  const result = []
  customerMap.forEach((data, customerId) => {
    const customer = inMemoryCustomers.value.find(c => c.id === customerId)
    if (customer) {
      result.push({
        id: customerId,
        displayName: customer.getDisplayName(),
        paymentMethod: customer.paymentMethod,
        totalInclTax: data.totalInclTax
      })
    }
  })

  // 金額の降順でソート
  return result.sort((a, b) => b.totalInclTax - a.totalInclTax)
})

const paymentSummary = computed(() => {
  if (customerAnalysis.value.length === 0) {
    return { cash: 0, transfer: 0 }
  }

  let cash = 0
  let transfer = 0

  customerAnalysis.value.forEach(customer => {
    if (customer.paymentMethod === '現金') {
      cash += customer.totalInclTax
    } else if (customer.paymentMethod === '振込') {
      transfer += customer.totalInclTax
    }
  })

  return { cash, transfer }
})

const productAnalysis = computed(() => {
  if (inMemorySales.value.length === 0 || inMemoryProducts.value.length === 0) {
    return []
  }

  // 商品IDごとに集計
  const productMap = new Map()

  inMemorySales.value.forEach(sale => {
    // 取消伝票は数量・金額とも符号を反転させて集計する
    const sign = sale.isNegative ? -1 : 1
    sale.lines.forEach(line => {
      if (!productMap.has(line.productId)) {
        productMap.set(line.productId, {
          productId: line.productId,
          quantity: 0,
          totalInclTax: 0
        })
      }
      const productData = productMap.get(line.productId)
      productData.quantity += line.quantity * sign
      productData.totalInclTax += line.calculateSubtotalInclTax() * sign
    })
  })

  // 商品マスター情報を追加
  const result = []
  productMap.forEach((data, productId) => {
    // 符号反転後に数量が0になる商品はランキング対象外
    if (data.quantity === 0) return

    const product = inMemoryProducts.value.find(p => p.id === productId)
    result.push({
      productId,
      displayName: product ? product.getDisplayName() : '削除済み商品',
      quantity: data.quantity,
      totalInclTax: data.totalInclTax
    })
  })

  // 選択した項目でソート
  return result.sort((a, b) => {
    if (productSortKey.value === 'quantity') {
      return b.quantity - a.quantity
    }
    return b.totalInclTax - a.totalInclTax
  })
})

// Methods
const onModeChange = () => {
  inMemorySales.value = []
  inMemoryCustomers.value = []
  inMemoryProducts.value = []
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

    // マスターデータの読み込み（既にインメモリにある場合はスキップ）
    if (inMemoryCustomers.value.length === 0) {
      await customersStore.loadCustomers()
      inMemoryCustomers.value = [...customersStore.customers]
    } else {
      // 既存のキャッシュを利用
    }
    if (inMemoryProducts.value.length === 0) {
      await productsStore.loadProducts()
      inMemoryProducts.value = [...productsStore.products]
    } else {
      // 既存のキャッシュを利用
    }

    // 年間の売上データを取得
    const fromDate = `${selectedYear.value}-01-01`
    const toDate = `${selectedYear.value}-12-31`
    const sales = await salesStore.searchSales({
      fromDate,
      toDate
    })
    
    inMemorySales.value = sales

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

    // マスターデータの読み込み（既にインメモリにある場合はスキップ）
    if (inMemoryCustomers.value.length === 0) {
      await customersStore.loadCustomers()
      inMemoryCustomers.value = [...customersStore.customers]
    } else {
      // 上書き
      await customersStore.loadCustomers()
      inMemoryCustomers.value = [...customersStore.customers]
    }
    
    if (inMemoryProducts.value.length === 0) {
      await productsStore.loadProducts()
      inMemoryProducts.value = [...productsStore.products]
    } else {
      // 上書き
      await productsStore.loadProducts()
      inMemoryProducts.value = [...productsStore.products]
    }

    // 月間の売上データを取得
    const sales = await salesStore.loadSalesByYearMonth(selectedYearMonth.value)
    inMemorySales.value = sales

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

const formatRank = (rank) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return rank
}

// Lifecycle
onMounted(() => {
  // 初期化時は何もしない（モードが選択されるまで待つ）
})
</script>

<style scoped>
.sales-analytics {
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
  height: 300px;
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

.customer-analysis-section,
.product-analysis-section {
  margin-bottom: 2rem;
}

.product-note {
  margin: 0 0 0.75rem;
  color: #666;
  font-size: 0.85rem;
}

.product-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.sort-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #444;
  font-size: 0.9rem;
}

.sort-label select {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  font-size: 0.9rem;
}

.customer-analysis-section h2,
.product-analysis-section h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.25rem;
}

.payment-summary {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.payment-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.payment-label {
  font-weight: 600;
  color: #666;
}

.payment-value {
  font-weight: 600;
  color: #333;
  font-size: 1.1rem;
}

.table-container {
  overflow-x: auto;
}

.analysis-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.analysis-table th,
.analysis-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.analysis-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  font-size: 0.75rem;
}

.analysis-table tr:hover {
  background: #f8f9fa;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 2rem;
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
  .sales-analytics {
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
    min-width: 700px;
  }

  .payment-summary {
    flex-direction: column;
    gap: 1rem;
  }

  .analysis-table {
    font-size: 0.75rem;
  }

  .analysis-table th,
  .analysis-table td {
    padding: 0.5rem;
  }
}
</style>
