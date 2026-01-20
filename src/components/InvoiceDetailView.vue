<template>
  <div class="invoice-detail">
    <!-- ヘッダー情報 -->
    <div class="invoice-header">
      <div class="header-info">
        <h2>{{ invoice.customerName }}</h2>
        <div class="invoice-meta">
          <span class="period">{{ invoice.period }}</span>
          <span class="closing-day">締め日: {{ invoice.closingDay }}</span>
          <span class="payment-method">支払い方法: {{ invoice.paymentMethod }}</span>
        </div>
      </div>
      <div class="invoice-id">
        <span class="label">請求書ID</span>
        <span class="value">{{ invoice.id }}</span>
      </div>
    </div>

    <!-- 合計金額 -->
    <div class="invoice-summary">
      <div class="summary-card">
        <div class="summary-row">
          <span class="label">税抜き合計</span>
          <span class="value">¥{{ invoice.summary.formatSubtotal() }}</span>
        </div>
        <div class="summary-row">
          <span class="label">税額</span>
          <span class="value">¥{{ invoice.summary.formatTotalTax() }}</span>
        </div>
        <div class="summary-row total">
          <span class="label">合計金額</span>
          <span class="value">¥{{ invoice.summary.formatTotalInclTax() }}</span>
        </div>
      </div>
    </div>

    <!-- 明細一覧 -->
    <div class="invoice-details">
      <h3>明細</h3>
      <!-- デスクトップ表示用テーブル -->
      <div class="details-table">
        <div class="table-header">
          <div class="col-date">注文日</div>
          <div class="col-product">商品名</div>
          <div class="col-quantity">数量</div>
          <div class="col-price">単価(税抜)</div>
          <div class="col-total">合計(税抜)</div>
          <div class="col-tax-rate">税率</div>
        </div>
        <div 
          v-for="(detail, index) in invoice.details" 
          :key="index"
          class="table-row"
        >
          <div class="col-date">{{ formatDate(detail.orderDate) }}</div>
          <div class="col-product">{{ detail.productName }}</div>
          <div class="col-quantity">{{ detail.quantity }}</div>
          <div class="col-price">¥{{ detail.formatPrice() }}</div>
          <div class="col-total">¥{{ detail.formatSubtotal() }}</div>
          <div class="col-tax-rate">{{ formatTaxRate(detail.taxRate) }}</div>
        </div>
      </div>
      <!-- スマホ表示用カード（日付ごとにグループ化） -->
      <div class="details-cards">
        <div 
          v-for="(group, dateKey) in groupedDetails" 
          :key="dateKey"
          class="date-group"
        >
          <!-- 日付ヘッダー（クリック可能） -->
          <div 
            class="date-header"
            @click="toggleDateGroup(dateKey)"
          >
            <div class="date-header-content">
              <span class="date-label">{{ formatDate(group.date) }}</span>
              <span class="date-count">（{{ group.details.length }}件）</span>
            </div>
            <div class="date-toggle-icon" :class="{ 'expanded': expandedDates[dateKey] }">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
          <!-- 明細カード（展開時のみ表示） -->
          <div 
            v-show="expandedDates[dateKey]"
            class="date-details"
          >
            <div 
              v-for="(detail, index) in group.details" 
              :key="index"
              class="detail-card"
            >
              <div class="card-header">
                <div class="card-product-name">{{ detail.productName }}</div>
              </div>
              <div class="card-body">
                <div class="card-row">
                  <span class="card-label">数量</span>
                  <span class="card-value">{{ detail.quantity }}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">単価(税抜)</span>
                  <span class="card-value">¥{{ detail.formatPrice() }}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">税率</span>
                  <span class="card-value">{{ formatTaxRate(detail.taxRate) }}</span>
                </div>
                <div class="card-row card-total">
                  <span class="card-label">合計(税抜)</span>
                  <span class="card-value">¥{{ detail.formatSubtotal() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 作成情報 -->
    <div class="invoice-footer">
      <div class="created-info">
        <span class="label">作成日時</span>
        <span class="value">{{ formatDateTime(invoice.createdAt) }}</span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  invoice: {
    type: Object,
    required: true
  }
})

// 日付ごとの展開状態を管理（デフォルトは全て展開）
const expandedDates = ref({})

// 日付をキーとして取得する関数
const getDateKey = (dateStr) => {
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0] // YYYY-MM-DD形式
}

// 日付ごとに明細をグループ化
const groupedDetails = computed(() => {
  const groups = {}
  
  props.invoice.details.forEach(detail => {
    const dateKey = getDateKey(detail.orderDate)
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: detail.orderDate,
        details: []
      }
    }
    groups[dateKey].details.push(detail)
  })
  
  // 日付の昇順でソート（古い日付が上）
  return Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .reduce((sorted, dateKey) => {
      sorted[dateKey] = groups[dateKey]
      return sorted
    }, {})
})

// 日付グループの展開/折りたたみを切り替え
const toggleDateGroup = (dateKey) => {
  expandedDates.value[dateKey] = !expandedDates.value[dateKey]
}

// 初期化時に全ての日付グループを展開状態にする
onMounted(() => {
  Object.keys(groupedDetails.value).forEach(dateKey => {
    expandedDates.value[dateKey] = true
  })
})

// Methods
const formatNumber = (num) => {
  return num.toLocaleString()
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatDateTime = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatTaxRate = (taxRate) => {
  // taxRateが存在する場合はパーセント表示、ない場合は10%をデフォルトとして表示
  if (taxRate !== undefined && taxRate !== null) {
    // taxRateが0.1のような小数の場合は100倍してパーセント表示
    return taxRate < 1 ? `${Math.round(taxRate * 100)}%` : `${taxRate}%`
  }
  return '10%'
}

</script>

<style scoped>
.invoice-detail {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 100%;
}

.invoice-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.header-info h2 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.5rem;
}

.invoice-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: #666;
}

.period {
  background: #007bff;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 500;
}

.closing-day {
  color: #666;
}

.payment-method {
  color: #666;
}

.invoice-id {
  text-align: right;
  font-size: 0.8rem;
  color: #666;
}

.invoice-id .label {
  display: block;
  margin-bottom: 0.25rem;
}

.invoice-id .value {
  font-family: monospace;
  background: #e9ecef;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.invoice-summary {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.summary-card {
  padding: 1.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row.total {
  background: #f8f9fa;
  font-weight: bold;
  font-size: 1.1rem;
  color: #007bff;
  border-top: 2px solid #007bff;
  border-bottom: none;
}

.summary-row .label {
  color: #666;
  font-size: 0.9rem;
}

.summary-row .value {
  font-weight: 500;
  color: #333;
}

.invoice-details {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.invoice-details h3 {
  margin: 0;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  color: #333;
  font-size: 1.1rem;
  border-bottom: 1px solid #f0f0f0;
}

.details-table {
  overflow-x: auto;
}

.details-cards {
  display: none;
}

.table-header {
  display: grid;
  grid-template-columns: 1.35fr 2fr 0.8fr 1fr 1fr 0.8fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  font-weight: 500;
  color: #333;
  font-size: 0.9rem;
  border-bottom: 1px solid #e0e0e0;
}

.table-row {
  display: grid;
  grid-template-columns: 1.35fr 2fr 0.8fr 1fr 1fr 0.8fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  font-size: 0.9rem;
}

.table-row:last-child {
  border-bottom: none;
}

.col-date {
  color: #666;
  font-size: 0.6rem;
  min-width: 120px;
}

.col-product {
  font-size: 0.6rem;
  font-weight: 500;
  color: #333;
}

.col-quantity {
  font-size: 0.6rem;
  text-align: center;
  color: #666;
}

.col-price {
  font-size: 0.6rem;
  text-align: right;
  color: #333;
}

.col-total {
  font-size: 0.6rem;
  text-align: right;
  font-weight: 500;
  color: #007bff;
}

.col-tax-rate {
  font-size: 0.6rem;
  text-align: left;
  color: #666;
}

.invoice-footer {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1rem 1.5rem;
  border: 1px solid #e0e0e0;
}

.created-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.6rem;
}

.created-info .label {
  color: #666;
}

.created-info .value {
  color: #333;
  font-family: monospace;
}


/* レスポンシブ */
@media (max-width: 768px) {
  .invoice-detail {
    gap: 1rem;
  }
  
  .invoice-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    padding: 1rem;
  }
  
  .header-info h2 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
  }
  
  .invoice-meta {
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.9rem;
  }
  
  .period {
    align-self: flex-start;
    font-size: 0.8rem;
    padding: 0.25rem 0.5rem;
  }
  
  .invoice-id {
    text-align: left;
    font-size: 0.75rem;
  }
  
  .invoice-id .value {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }
  
  .summary-card {
    padding: 1rem;
  }
  
  .summary-row {
    padding: 0.75rem 0;
  }
  
  .summary-row.total {
    font-size: 1rem;
  }
  
  .summary-row .label {
    font-size: 0.85rem;
  }
  
  .summary-row .value {
    font-size: 0.9rem;
  }
  
  .invoice-details h3 {
    padding: 1rem;
    font-size: 1rem;
  }
  
  /* スマホ表示時はテーブルを非表示 */
  .details-table {
    display: none;
  }
  
  /* スマホ表示時はカードを表示 */
  .details-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem 1rem 1rem;
  }
  
  .date-group {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .date-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: #007bff;
    color: white;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;
  }
  
  .date-header:hover {
    background: #0056b3;
  }
  
  .date-header-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .date-label {
    font-weight: 600;
    font-size: 1rem;
  }
  
  .date-count {
    font-size: 0.85rem;
    opacity: 0.9;
  }
  
  .date-toggle-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
    color: white;
  }
  
  .date-toggle-icon.expanded {
    transform: rotate(180deg);
  }
  
  .date-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
    background: #f8f9fa;
  }
  
  .detail-card {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0.875rem;
    background: white;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .card-product-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: #333;
    flex: 1;
  }
  
  .card-body {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
  }
  
  .card-label {
    color: #666;
    font-size: 0.85rem;
  }
  
  .card-value {
    color: #333;
    font-weight: 500;
  }
  
  .card-row.card-total {
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 2px solid #007bff;
  }
  
  .card-row.card-total .card-label {
    font-weight: 600;
    color: #333;
  }
  
  .card-row.card-total .card-value {
    font-weight: 700;
    font-size: 1rem;
    color: #007bff;
  }
  
  .invoice-footer {
    padding: 0.75rem 1rem;
  }
  
  .created-info {
    font-size: 0.8rem;
  }
  
}

/* より小さいスマホサイズ */
@media (max-width: 480px) {
  .invoice-detail {
    gap: 0.75rem;
  }
  
  .invoice-header {
    padding: 0.75rem;
  }
  
  .header-info h2 {
    font-size: 1.1rem;
  }
  
  .invoice-meta {
    font-size: 0.8rem;
  }
  
  .period {
    font-size: 0.75rem;
  }
  
  .summary-card {
    padding: 0.75rem;
  }
  
  .summary-row {
    padding: 0.5rem 0;
  }
  
  .summary-row.total {
    font-size: 0.95rem;
  }
  
  .summary-row .label {
    font-size: 0.8rem;
  }
  
  .summary-row .value {
    font-size: 0.85rem;
  }
  
  .invoice-details h3 {
    padding: 0.75rem;
    font-size: 0.95rem;
  }
  
  .details-cards {
    padding: 0 0.75rem 0.75rem 0.75rem;
    gap: 0.75rem;
  }
  
  .date-header {
    padding: 0.875rem;
  }
  
  .date-label {
    font-size: 0.95rem;
  }
  
  .date-count {
    font-size: 0.8rem;
  }
  
  .date-details {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .card-header {
    padding: 0.75rem;
  }
  
  .card-product-name {
    font-size: 0.9rem;
  }
  
  .card-body {
    padding: 0.75rem;
    gap: 0.5rem;
  }
  
  .card-row {
    font-size: 0.85rem;
  }
  
  .card-label {
    font-size: 0.8rem;
  }
  
  .card-row.card-total {
    margin-top: 0.25rem;
    padding-top: 0.5rem;
  }
  
  .card-row.card-total .card-value {
    font-size: 0.95rem;
  }
  
  .invoice-footer {
    padding: 0.5rem 0.75rem;
  }
  
  .created-info {
    font-size: 0.75rem;
  }
  
  .btn-outline {
    padding: 0.875rem;
    font-size: 0.85rem;
  }
}

/* 印刷用スタイル */
@media print {
  .invoice-detail {
    background: white;
    color: black;
  }
  
  .invoice-header,
  .invoice-summary,
  .invoice-details,
  .invoice-footer {
    border: 1px solid #000;
    margin-bottom: 1rem;
  }
  
  /* 印刷時はテーブルを表示 */
  .details-table {
    display: block;
  }
  
  /* 印刷時はカードを非表示 */
  .details-cards {
    display: none;
  }
  
  .table-header,
  .table-row {
    border-bottom: 1px solid #000;
  }
}
</style>

