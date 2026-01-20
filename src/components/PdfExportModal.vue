<template>
  <div class="pdf-export-modal">
    <div class="modal-header">
      <h2>PDFエクスポート</h2>
      <button @click="$emit('close')" class="btn-close">×</button>
    </div>
    
    <div class="modal-body">
      <div class="export-info">
        <p>現在表示されている請求書からPDFをエクスポートします。</p>
        <p class="period-info">対象期間: {{ currentPeriod }}</p>
      </div>
      
      <div class="customer-selection">
        <h3>エクスポートする顧客を選択してください</h3>
        <div class="selection-controls">
          <button @click="selectAll" class="btn-select-all">すべて選択</button>
          <button @click="deselectAll" class="btn-deselect-all">すべて解除</button>
        </div>
        
        <div class="customer-list">
          <div 
            v-for="customer in availableCustomers" 
            :key="customer.customerId"
            class="customer-item"
          >
            <label class="customer-checkbox">
              <input 
                type="checkbox" 
                :value="customer.customerId"
                v-model="selectedCustomers"
                @change="onCustomerSelectionChange"
              />
              <span class="customer-name">{{ customer.customerName }}</span>
              <span class="invoice-count">({{ customer.invoiceCount }}件)</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="export-actions">
        <button 
          @click="exportPdf" 
          :disabled="selectedCustomers.length === 0 || isExporting"
          class="btn-export"
        >
          <span v-if="isExporting">エクスポート中...</span>
          <span v-else>エクスポート</span>
        </button>
        <button @click="$emit('close')" class="btn-cancel">キャンセル</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useStorage } from '../composables/useStorage.js'
import { STORAGE_KEYS } from '../config/api.js'

const props = defineProps({
  invoices: {
    type: Array,
    required: true
  },
  currentPeriod: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

// Storage
const { loadFromLocalStorage } = useStorage()

// State
const selectedCustomers = ref([])
const isExporting = ref(false)

// Computed
const availableCustomers = computed(() => {
  const customerMap = new Map()
  
  props.invoices.forEach(invoice => {
    if (!customerMap.has(invoice.customerId)) {
      customerMap.set(invoice.customerId, {
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        invoiceCount: 0,
        invoices: []
      })
    }
    
    const customer = customerMap.get(invoice.customerId)
    customer.invoiceCount++
    customer.invoices.push(invoice)
  })
  
  return Array.from(customerMap.values())
})

// Methods
const selectAll = () => {
  selectedCustomers.value = availableCustomers.value.map(c => c.customerId)
}

const deselectAll = () => {
  selectedCustomers.value = []
}

const onCustomerSelectionChange = () => {
  // 選択変更時の処理（必要に応じて）
}

const exportPdf = async () => {
  if (selectedCustomers.value.length === 0) {
    alert('エクスポートする顧客を選択してください。')
    return
  }
  
  const pdf = new jsPDF('p', 'mm', 'a4')
  let isFirstPage = true
  
  try {
    isExporting.value = true
    
    const targetCustomers = availableCustomers.value.filter(c =>
      selectedCustomers.value.includes(c.customerId)
    )
    
    for (const customer of targetCustomers) {
      await generateCustomerPdf(customer, pdf, isFirstPage)
      isFirstPage = false
    }
    
    const fileName = `${props.currentPeriod.replace('月分', '月選択分')}_請求書一覧.pdf`
    pdf.save(fileName)
    emit('close')
    
  } catch (error) {
    console.error('PDF export failed:', error)
    alert('PDFエクスポートに失敗しました。')
  } finally {
    isExporting.value = false
  }
}

const generateCustomerPdf = async (customer, pdf, isFirstPageOfDocument = false) => {
  // 請求書データの集計
  let allDetails = []
  let totalAmount = 0
  let totalTax = 0
  let totalInclTax = 0
  
  customer.invoices.forEach(invoice => {
    if (invoice.details && invoice.details.length > 0) {
      invoice.details.forEach(detail => {
        const quantity = detail.quantity || 1
        // unitPriceExclTaxが存在する場合はそれを使用、なければsubtotalExclTaxから計算
        const unitPrice = detail.unitPriceExclTax || (detail.subtotalExclTax / quantity) || 0
        // subtotalExclTaxが存在する場合はそれを使用、なければ計算
        const amount = detail.subtotalExclTax || (quantity * unitPrice)
        // taxRateが存在しない場合はデフォルト10%、0の場合は0%として扱う
        const taxRate = detail.taxRate !== undefined && detail.taxRate !== null ? detail.taxRate : 10
        // 税額計算を修正（taxRateはパーセンテージなので100で割る）
        const tax = Math.trunc(amount * taxRate / 100)
        const total = amount + tax
        
        allDetails.push({
          ...detail,
          quantity,
          unitPrice,
          amount,
          taxRate,
          tax,
          total,
          orderDate: detail.orderDate || new Date().toISOString().split('T')[0]
        })
        
        totalAmount += amount
        totalTax += tax
        totalInclTax += total
      })
    }
  })
  
  // orderDateの昇順でソート
  allDetails.sort((a, b) => {
    const dateA = a.orderDate || ''
    const dateB = b.orderDate || ''
    return dateA.localeCompare(dateB)
  })
  
  // 税率ごとの集計
  const taxRateGroups = {}
  allDetails.forEach(detail => {
    const rate = detail.taxRate
    if (!taxRateGroups[rate]) {
      taxRateGroups[rate] = { amount: 0, tax: 0 }
    }
    taxRateGroups[rate].amount += detail.amount
    taxRateGroups[rate].tax += detail.tax
  })
  
  // 期間の解析
  const period = props.currentPeriod
  const year = period.split('年')[0]
  const month = period.split('年')[1].replace('月分', '')
  
  // 総ページ数の計算
  const detailPages = Math.ceil(allDetails.length / PDF_CONFIG.itemsPerPage)
  const totalSheets = 1 + detailPages
  
  // 事業者設定をローカルストレージから取得
  const essentialSettings = loadFromLocalStorage(STORAGE_KEYS.BUSINESS_SETTINGS) || {}
  
  try {
    // 1ページ目（請求書表紙）を生成
    const firstPageHtml = createFirstPageHtml(customer, year, month, totalAmount, totalTax, totalInclTax, totalSheets, essentialSettings)
    await addPageToPdf(pdf, firstPageHtml, isFirstPageOfDocument) // ドキュメント内の最初だけページ追加を抑制
    
    // 明細ページを生成（20個ずつ）
    for (let page = 0; page < detailPages; page++) {
      const startIndex = page * PDF_CONFIG.itemsPerPage
      const endIndex = Math.min(startIndex + PDF_CONFIG.itemsPerPage, allDetails.length)
      const pageDetails = allDetails.slice(startIndex, endIndex)
      const isLastPage = page === detailPages - 1
      
      const detailPageHtml = createDetailPageHtml(customer, year, month, pageDetails, page, isLastPage, taxRateGroups, totalAmount, totalTax, totalInclTax)
      await addPageToPdf(pdf, detailPageHtml, false) // 明細ページとして指定
    }
    
  } catch (error) {
    console.error('PDF generation failed:', error)
    throw error
  }
}

const addPageToPdf = async (pdf, htmlContent, isFirstPage = false) => {
  // 一時的なDOM要素を作成
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.top = '-9999px'
  tempDiv.style.width = '210mm' // A4幅
  tempDiv.style.fontFamily = 'Arial, sans-serif'
  document.body.appendChild(tempDiv)
  
  try {
    // HTMLをキャンバスに変換
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    })
    
    // キャンバスからPDFに追加
    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    // 最初のページ以外は新しいページを追加
    if (!isFirstPage) {
      pdf.addPage()
    }
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    
  } finally {
    // 一時的なDOM要素を削除
    document.body.removeChild(tempDiv)
  }
}

// PDF設定の定数
const PDF_CONFIG = {
  itemsPerPage: 20, // 1ページに表示できる明細の行数
  pagePaddingA: 30, // ページの上下余白px
  pagePaddingB: 40, // ページの左右余白px
  fontFamily: 'MS Gothic', // フォントファミリー
  lineHeight: 1.6, // 行間
  minHeight: '100vh', // 最小高さ
  display: 'flex', // 表示方法
  flexDirection: 'column', // フレックス方向
  borderColor: '#000', // ボーダー色
  borderWidth: '1px', // ボーダー幅
  tablePadding: '8px', // テーブルセルのパディング
  tableRowPadding: '6px', // テーブル行のパディング
  marginBottom: '20px', // 下マージン
  textAlignCenter: 'center', // 中央揃え
  fontWeightBold: 'bold', // 太字
  fontSize: {
    title: '40px', // タイトルフォントサイズ
    subtitle: '35px', // サブタイトルフォントサイズ
    large: '30px', // 大フォントサイズ
    medium: '25px', // 中フォントサイズ
    normal: '20px', // 通常フォントサイズ
    small: '18px', // 小フォントサイズ
    xsmall: '16px', // 極小フォントサイズ
    xxsmall: '14px', // 最小フォントサイズ
    xxxsmall: '12px' // 超小フォントサイズ
  }
}


const createFirstPageHtml = (customer, year, month, totalAmount, totalTax, totalInclTax, totalSheets, essentialSettings = {}) => {
  return `
    <div style="padding: ${PDF_CONFIG.pagePaddingA}px ${PDF_CONFIG.pagePaddingB}px; font-family: '${PDF_CONFIG.fontFamily}', monospace; line-height: 1.8; page-break-after: always; min-height: ${PDF_CONFIG.minHeight}; display: ${PDF_CONFIG.display}; flex-direction: ${PDF_CONFIG.flexDirection};">
      <div style="text-align: ${PDF_CONFIG.textAlignCenter}; margin-bottom: 40px;">
        <h1 style="font-size: ${PDF_CONFIG.fontSize.title}; margin: 0; font-weight: ${PDF_CONFIG.fontWeightBold};">請求書</h1>
        <p style="margin: 10px 0; text-align: ${PDF_CONFIG.textAlignCenter};">毎度有難うございます</p>
      </div>

      <div style="text-align: right;">
        <p style="margin: 1px 0; font-weight: ${PDF_CONFIG.fontWeightBold};">${essentialSettings.number || ''}</p>
        <p style="margin: 1px 0; font-weight: ${PDF_CONFIG.fontWeightBold};">${essentialSettings.name || ''}</p>
        <p style="margin: 1px 0; font-weight: ${PDF_CONFIG.fontWeightBold};">${essentialSettings.representative || ''}</p>
        <p style="margin: 1px 0; font-weight: ${PDF_CONFIG.fontWeightBold};">${essentialSettings.phone || ''}</p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p style="margin: 10px 0; font-size: ${PDF_CONFIG.fontSize.normal};">${year}年${month}月分</p>
        <p style="margin: 3px 0; font-size: ${PDF_CONFIG.fontSize.large}; font-weight: ${PDF_CONFIG.fontWeightBold}; text-decoration: underline;">${customer.customerName}　様</p>
        <p style="font-size: ${PDF_CONFIG.fontSize.xsmall};">毎月${customer.invoices[0]?.closingDay || '末'}〆切</p>
      </div>
      
      <div style="text-align: ${PDF_CONFIG.textAlignCenter}; margin-bottom: 5px;">
        <p style="margin: 10px 0; font-size: ${PDF_CONFIG.fontSize.small};">本月分請求書 合計 ${totalSheets}枚</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: ${PDF_CONFIG.marginBottom}; font-size: ${PDF_CONFIG.fontSize.xsmall};">
        <tr>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: 15px; width: 30%; font-weight: ${PDF_CONFIG.fontWeightBold};">本月分</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: 15px; text-align: right; font-weight: ${PDF_CONFIG.fontWeightBold};">¥${totalAmount.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: 15px; font-weight: ${PDF_CONFIG.fontWeightBold};">消費税</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: 15px; text-align: right; font-weight: ${PDF_CONFIG.fontWeightBold};">¥${totalTax.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: 15px; font-weight: ${PDF_CONFIG.fontWeightBold};">合計 ¥</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: 15px; text-align: right; font-weight: ${PDF_CONFIG.fontWeightBold}; font-size: ${PDF_CONFIG.fontSize.small};">¥${totalInclTax.toLocaleString()}</td>
        </tr>
      </table>

      <div style="margin-top: 30px;">
        <p style="font-size: ${PDF_CONFIG.fontSize.normal};">お支払いが振込の場合は、下記口座へのお振込をお願いいたします。</p>
        <div style="text-align: ${PDF_CONFIG.textAlignCenter}; margin-top: ${PDF_CONFIG.marginBottom};">
          <p style="font-size: ${PDF_CONFIG.fontSize.medium}; border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: 20px 50px 20px 50px; display: inline-block;">
            ${essentialSettings.bankInfo || ''}
          </p>
        </div>
      </div>
    </div>
  `
}

const createDetailPageHtml = (customer, year, month, pageDetails, pageIndex, isLastPage, taxRateGroups, totalAmount, totalTax, totalInclTax) => {
  let html = `
    <div style="padding: ${PDF_CONFIG.pagePaddingA}px ${PDF_CONFIG.pagePaddingB}px; font-family: '${PDF_CONFIG.fontFamily}', monospace; line-height: ${PDF_CONFIG.lineHeight}; min-height: ${PDF_CONFIG.minHeight}; display: ${PDF_CONFIG.display}; flex-direction: ${PDF_CONFIG.flexDirection};">
      <div style="text-align: ${PDF_CONFIG.textAlignCenter}; margin-bottom: ${PDF_CONFIG.marginBottom};">
        <h2 style="font-size: ${PDF_CONFIG.fontSize.subtitle}; margin: 0; font-weight: ${PDF_CONFIG.fontWeightBold};">請求書明細</h2>
      </div>
      
      <div style="margin-bottom: ${PDF_CONFIG.marginBottom};">
        <p style="margin: 5px 0; font-size: ${PDF_CONFIG.fontSize.normal};">${year}年${month}月分 No.${String(pageIndex + 1).padStart(3, '0')}</p>
        <p style="margin: 5px 0; font-weight: ${PDF_CONFIG.fontWeightBold}; font-size: ${PDF_CONFIG.fontSize.large};">${customer.customerName}　様</p>
        <p style="margin: 10px 0; font-size: ${PDF_CONFIG.fontSize.xxsmall};">下記のとおり御請求申し上げます</p>
      </div>
      
      <div style="flex: 1;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: ${PDF_CONFIG.marginBottom}; font-size: ${PDF_CONFIG.fontSize.xxxsmall};">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: ${PDF_CONFIG.textAlignCenter}; width: 8%;">月</th>
              <th style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: ${PDF_CONFIG.textAlignCenter}; width: 8%;">日</th>
              <th style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: left; width: 30%;">品名</th>
              <th style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: ${PDF_CONFIG.textAlignCenter}; width: 10%;">数量</th>
              <th style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: right; width: 12%;">単価(税抜)</th>
              <th style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: right; width: 12%;">合計(税抜)</th>
              <th style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: ${PDF_CONFIG.textAlignCenter}; width: 8%;">税率</th>
            </tr>
          </thead>
          <tbody>
  `
  
  // 明細行（20個まで）
  for (let i = 0; i < PDF_CONFIG.itemsPerPage; i++) {
    const detail = pageDetails[i]
    if (detail) {
      const orderDate = new Date(detail.orderDate)
      const orderMonth = orderDate.getMonth() + 1
      const orderDay = orderDate.getDate()
      
      html += `
        <tr>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding}; text-align: ${PDF_CONFIG.textAlignCenter};">${orderMonth}</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding}; text-align: ${PDF_CONFIG.textAlignCenter};">${orderDay}</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding};">${detail.productName || '商品'}</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding}; text-align: ${PDF_CONFIG.textAlignCenter};">${detail.quantity}</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding}; text-align: right;">¥${(detail.unitPrice || detail.unitPriceExclTax || 0).toLocaleString()}</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding}; text-align: right;">¥${(detail.amount || detail.subtotalExclTax || 0).toLocaleString()}</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding}; text-align: ${PDF_CONFIG.textAlignCenter};">${detail.taxRate}%</td>
        </tr>
      `
    } else {
      html += `
        <tr>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding};">&nbsp;</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding};">&nbsp;</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding};">&nbsp;</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding};">&nbsp;</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding};">&nbsp;</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding};">&nbsp;</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tableRowPadding};">&nbsp;</td>
        </tr>
      `
    }
  }
  
  html += `
          </tbody>
        </table>
      </div>
  `
  
  // 税率ごとの小計（最後のページのみ）
  if (isLastPage) {
    html += `
      <div style="margin-top: auto;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: ${PDF_CONFIG.marginBottom}; font-size: ${PDF_CONFIG.fontSize.xxxsmall};">
    `
    
    Object.entries(taxRateGroups).forEach(([rate, data]) => {
      html += `
        <tr>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; font-weight: ${PDF_CONFIG.fontWeightBold}; width: 70%;">${rate}%対象 小計</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: right; font-weight: ${PDF_CONFIG.fontWeightBold};">¥${data.amount.toLocaleString()}</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: right; font-weight: ${PDF_CONFIG.fontWeightBold};">¥${data.tax.toLocaleString()}</td>
        </tr>
      `
    })
    
    html += `
        <tr style="background-color: #f0f0f0;">
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; font-weight: ${PDF_CONFIG.fontWeightBold};">合計</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: right; font-weight: ${PDF_CONFIG.fontWeightBold};">¥${totalAmount.toLocaleString()}</td>
          <td style="border: ${PDF_CONFIG.borderWidth} solid ${PDF_CONFIG.borderColor}; padding: ${PDF_CONFIG.tablePadding}; text-align: right; font-weight: ${PDF_CONFIG.fontWeightBold};">¥${totalTax.toLocaleString()}</td>
        </tr>
      </table>
      </div>
    `
  }
  
  html += `
    </div>
  `
  
  return html
}

// Lifecycle
onMounted(() => {
  // 初期状態ではすべて選択
  selectAll()
})
</script>

<style scoped>
.pdf-export-modal {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
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
  font-size: 1.2rem;
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

.export-info {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.export-info p {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.period-info {
  font-weight: 500;
  color: #333 !important;
}

.customer-selection h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.selection-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.btn-select-all,
.btn-deselect-all {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-select-all:hover,
.btn-deselect-all:hover {
  background: #545b62;
}

.customer-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0.5rem;
}

.customer-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.customer-item:last-child {
  border-bottom: none;
}

.customer-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.customer-checkbox:hover {
  background-color: #f8f9fa;
}

.customer-checkbox input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.customer-name {
  font-weight: 500;
  color: #333;
}

.invoice-count {
  color: #666;
  font-size: 0.8rem;
}

.export-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.btn-export {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn-export:hover:not(:disabled) {
  background: #0056b3;
}

.btn-export:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-cancel {
  background: #6c757d;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-cancel:hover {
  background: #545b62;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .pdf-export-modal {
    margin: 0.5rem;
    max-height: 90vh;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .modal-header h2 {
    font-size: 1.1rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .selection-controls {
    flex-direction: column;
  }
  
  .btn-select-all,
  .btn-deselect-all {
    width: 100%;
    padding: 0.75rem;
  }
  
  .export-actions {
    flex-direction: column;
  }
  
  .btn-export,
  .btn-cancel {
    width: 100%;
    padding: 1rem;
  }
}
</style>
