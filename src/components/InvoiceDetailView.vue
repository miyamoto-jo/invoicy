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
          <span class="value">¥{{ formatNumber(invoice.summary.subtotalExclTax) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">税額</span>
          <span class="value">¥{{ formatNumber(invoice.summary.totalTax) }}</span>
        </div>
        <div class="summary-row total">
          <span class="label">合計金額</span>
          <span class="value">¥{{ formatNumber(invoice.summary.totalInclTax) }}</span>
        </div>
      </div>
    </div>

    <!-- 明細一覧 -->
    <div class="invoice-details">
      <h3>明細</h3>
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
          <div class="col-price">¥{{ formatNumber(detail.unitPriceExclTax) }}</div>
          <div class="col-total">¥{{ formatNumber(detail.subtotalExclTax) }}</div>
          <div class="col-tax-rate">{{ formatTaxRate(detail.taxRate) }}</div>
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
import { defineProps } from 'vue'

const props = defineProps({
  invoice: {
    type: Object,
    required: true
  }
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

.table-header {
  display: grid;
  grid-template-columns: 1fr 2fr 0.8fr 1fr 1fr 0.8fr;
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
  grid-template-columns: 1fr 2fr 0.8fr 1fr 1fr 0.8fr;
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
  
  .details-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin: 0 -1rem;
    padding: 0 1rem;
  }
  
  .table-header {
    display: grid;
    grid-template-columns: 0.9fr 1.6fr 0.5fr 0.8fr 0.8fr 0.6fr;
    gap: 0.25rem;
    padding: 0.5rem 0.25rem;
    background: #f8f9fa;
    font-weight: 600;
    color: #333;
    font-size: 0.7rem;
    border-bottom: 2px solid #e0e0e0;
    min-width: 320px;
  }
  
  .table-row {
    display: grid;
    grid-template-columns: 0.9fr 1.6fr 0.5fr 0.8fr 0.8fr 0.6fr;
    gap: 0.25rem;
    padding: 0.5rem 0.25rem;
    border-bottom: 1px solid #f0f0f0;
    font-size: 0.7rem;
    min-width: 320px;
  }
  
  .table-row:last-child {
    border-bottom: none;
  }
  
  .table-row > div {
    display: flex;
    align-items: center;
    padding: 0.1rem 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .col-date {
    text-align: center;
    font-weight: 500;
  }
  
  .col-product {
    text-align: left;
    font-weight: 500;
    line-height: 1.1;
    white-space: normal;
    word-break: break-word;
  }
  
  .col-quantity {
    text-align: left;
    font-weight: 500;
  }
  
  .col-price {
    text-align: left;
    font-weight: 500;
  }
  
  .col-total {
    text-align: left;
    font-weight: 600;
    color: #007bff;
  }
  
  .col-tax-rate {
    text-align: left;
    font-weight: 500;
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
  
  .table-header,
  .table-row {
    padding: 0.5rem 0.75rem;
  }
  
  .table-header > div,
  .table-row > div {
    padding: 0.375rem 0;
  }
  
  .table-header > div::before,
  .table-row > div::before {
    font-size: 0.75rem;
  }
  
  .col-date,
  .col-quantity,
  .col-price,
  .col-total,
  .col-tax-rate {
    font-size: 0.8rem;
  }
  
  .col-product {
    font-size: 0.85rem;
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
  
  
  .table-header,
  .table-row {
    border-bottom: 1px solid #000;
  }
}
</style>

