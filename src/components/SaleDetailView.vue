<template>
  <div class="sale-detail">
    <!-- ヘッダー情報 -->
    <div class="sale-header">
      <div class="header-info">
        <div class="customer-name-row">
          <h2>{{ customerName }}</h2>
          <button @click="openVoidModal" class="void-button">取消</button>
        </div>
        <div class="sale-meta">
          <span class="issued-date">発行日: {{ formatDate(sale.issuedOn) }}</span>
          <span :class="['status-badge', sale.isNegative ? 'status-void' : 'status-sale']">
            {{ sale.isNegative ? '取消' : '売上' }}
          </span>
        </div>
        <p><span class="issued-date">伝票ID: {{ sale.id }}</span></p>
      </div>
    </div>

    <!-- 伝票取消モーダル -->
    <div v-if="showVoidModal" class="modal-overlay" @click="showVoidModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>伝票取消</h2>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            {{ voidModalDescription }}
          </p>
        </div>
        <div class="modal-footer">
          <button @click="showVoidModal = false" class="btn-cancel">キャンセル</button>
          <button @click="executeVoid" class="btn-execute" :disabled="isVoiding">
            {{ isVoiding ? '処理中...' : '実行' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 相殺情報（取消伝票の場合） -->
    <div v-if="sale.isNegative && sale.negatesTicketId" class="negates-info">
      <span class="label">相殺する伝票ID:</span>
      <span class="value">{{ sale.negatesTicketId }}</span>
    </div>

    <!-- 合計金額 -->
    <div class="sale-summary">
      <div class="summary-card">
        <div class="summary-row">
          <span class="label">税抜き合計</span>
          <span class="value">¥{{ sale.totals.formatSubtotal() }}</span>
        </div>
        <div class="summary-row">
          <span class="label">税額</span>
          <span class="value">¥{{ sale.totals.formatTotalTax() }}</span>
        </div>
        <div class="summary-row total">
          <span class="label">合計金額</span>
          <span class="value">¥{{ sale.totals.formatTotalInclTax() }}</span>
        </div>
      </div>
    </div>

    <!-- 明細一覧 -->
    <div class="sale-details">
      <h3>明細</h3>
      <div class="details-table">
        <div 
          v-for="(line, index) in sale.lines" 
          :key="index"
          class="table-row"
        >
          <div class="col-product">{{ line.productName }}</div>
          <div class="col-quantity">{{ line.quantity }}</div>
          <div class="col-price">¥{{ line.formatPrice() }}</div>
          <div class="col-total">¥{{ formatAmount(line.calculateSubtotalExclTax()) }}</div>
          <div class="col-tax-rate">{{ formatTaxRate(line.taxRate) }}</div>
        </div>
      </div>
    </div>

    <!-- 備考 -->
    <div v-if="sale.note" class="sale-note">
      <h3>備考</h3>
      <p>{{ sale.note }}</p>
    </div>

    <!-- 作成情報 -->
    <div class="sale-footer">
      <div class="created-info">
        <span class="label">作成日時</span>
        <span class="value">{{ formatDateTime(sale.createdAt) }}</span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSalesStore } from '../stores/sales'

const props = defineProps({
  sale: {
    type: Object,
    required: true
  },
  customerName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['void-success'])

const salesStore = useSalesStore()

// State
const showVoidModal = ref(false)
const isVoiding = ref(false)
const systemDate = ref('') // モーダル表示時のシステム日を保持

// Computed
const voidModalDescription = computed(() => {
  if (!systemDate.value) return ''
  
  const formattedDate = formatDate(systemDate.value)
  
  if (props.sale.isNegative) {
    return `取消伝票を取り消しますか？この操作を実行すると発行日${formattedDate}の売上伝票が作成されます。`
  } else {
    return `売上伝票を取り消しますか？この操作を実行すると発行日${formattedDate}の取消伝票が作成されます。`
  }
})

// Methods
const formatAmount = (num) => {
  return num.toLocaleString('ja-JP')
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDateTime = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatTaxRate = (rate) => {
  return `${rate}%`
}

const openVoidModal = () => {
  // モーダル表示時にシステム日を取得（YYYY-MM-DD形式）
  const now = new Date()
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  systemDate.value = jstNow.toISOString().split('T')[0]
  showVoidModal.value = true
}

const executeVoid = async () => {
  try {
    isVoiding.value = true
    
    // 取消処理を実行
    await salesStore.voidSale(props.sale, systemDate.value)
    
    // モーダルを閉じる
    showVoidModal.value = false
    
    // systemDate.valueから年月を取得（YYYY-MM形式）
    const yearMonth = systemDate.value ? systemDate.value.substring(0, 7) : null
    
    // 親コンポーネントに成功を通知（年月情報も渡す）
    emit('void-success', yearMonth)
    
  } catch (error) {
    console.error('Failed to void sale:', error)
    alert(error.message || '伝票の取消に失敗しました')
  } finally {
    isVoiding.value = false
  }
}
</script>

<style scoped>
.sale-detail {
  padding: 0;
}

.sale-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 1.5rem;
}

.header-info {
  flex: 1;
}

.customer-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.customer-name-row h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}

.void-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background-color 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.void-button:hover {
  background-color: #c82333;
}

.void-button:active {
  background-color: #bd2130;
}

.header-info h2 {
  margin: 0 0 0.75rem 0;
  font-size: 1.5rem;
  color: #333;
  font-weight: 600;
}

.sale-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.issued-date {
  color: #666;
  font-size: 0.9rem;
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

.sale-id {
  text-align: right;
}

.negates-info {
  padding: 1rem;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.negates-info .label {
  font-weight: 500;
  color: #856404;
  margin-right: 0.5rem;
}

.negates-info .value {
  color: #856404;
  font-family: monospace;
}

.sale-summary {
  margin-bottom: 2rem;
}

.summary-card {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e0e0e0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-row.total {
  border-top: 2px solid #333;
  margin-top: 0.5rem;
  padding-top: 1rem;
  font-weight: 600;
  font-size: 1.1rem;
}

.summary-row .label {
  color: #666;
  font-size: 0.95rem;
}

.summary-row.total .label {
  color: #333;
  font-size: 1.1rem;
}

.summary-row .value {
  color: #333;
  font-weight: 500;
  font-size: 1rem;
}

.summary-row.total .value {
  color: #007bff;
  font-size: 1.3rem;
}

.sale-details {
  margin-bottom: 2rem;
}

.sale-details h3 {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  color: #333;
  font-weight: 600;
}

.details-table {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background-color: #f8f9fa;
}

.col-product {
  font-weight: 500;
}

.col-quantity,
.col-price,
.col-total {
  text-align: right;
}

.col-tax-rate {
  text-align: center;
}

.sale-note {
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #007bff;
}

.sale-note h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #333;
  font-weight: 600;
}

.sale-note p {
  margin: 0;
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
}

.sale-footer {
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.created-info {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: #666;
  font-size: 0.9rem;
}

.created-info .label {
  font-weight: 500;
}

.created-info .value {
  font-family: monospace;
}

/* 伝票取消モーダル */
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

.modal {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.modal-body {
  padding: 1.5rem;
}

.modal-description {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
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
}

.btn-cancel:hover {
  background: #545b62;
}

.btn-execute {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn-execute:hover:not(:disabled) {
  background: #c82333;
}

.btn-execute:disabled {
  background: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .sale-header {
    flex-direction: column;
    gap: 1rem;
  }

  .sale-id {
    text-align: left;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .table-header > div,
  .table-row > div {
    padding: 0.25rem 0;
  }

  .col-product::before {
    content: '商品名: ';
    font-weight: 600;
  }

  .col-quantity::before {
    content: '数量: ';
    font-weight: 600;
  }

  .col-price::before {
    content: '単価(税抜): ';
    font-weight: 600;
  }

  .col-total::before {
    content: '合計(税抜): ';
    font-weight: 600;
  }

  .col-tax-rate::before {
    content: '税率: ';
    font-weight: 600;
  }

  .col-quantity,
  .col-price,
  .col-total,
  .col-tax-rate {
    text-align: left;
  }

  .customer-name-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .customer-name-row h2 {
    text-align: left;
    flex: 1;
    min-width: 0;
  }

  .void-button {
    text-align: right;
    flex-shrink: 0;
  }

  .modal {
    width: 95%;
    margin: 1rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-execute {
    width: 100%;
  }
}
</style>

