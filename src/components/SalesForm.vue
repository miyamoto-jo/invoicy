<template>
  <div class="sales-form">
    <form @submit.prevent="handleSubmit" class="form">
      <!-- 顧客選択 -->
      <div class="form-group">
        <label for="customer" class="form-label">顧客 *</label>
        <select 
          id="customer" 
          v-model="formData.customerId" 
          class="form-select"
          :class="{ 'error': errors.customerId }"
          required
        >
          <option value="">顧客を選択してください</option>
          <option 
            v-for="customer in customers" 
            :key="customer.id" 
            :value="customer.id"
          >
                {{ customer.getDisplayName() }}
          </option>
        </select>
        <div v-if="errors.customerId" class="error-message">{{ errors.customerId }}</div>
      </div>

      <!-- 日付選択 -->
      <div class="form-group">
        <label for="issuedOn" class="form-label">日付 *</label>
        <input 
          type="date" 
          id="issuedOn" 
          v-model="formData.issuedOn" 
          class="form-input"
          :class="{ 'error': errors.issuedOn }"
          required
        >
        <div v-if="errors.issuedOn" class="error-message">{{ errors.issuedOn }}</div>
      </div>

      <!-- 商品明細（カード形式） -->
      <div class="form-group">
        <label class="form-label">商品明細 *</label>
        <div v-if="!formData.customerId" class="customer-notice">
          顧客を選択すると商品が表示されます
        </div>
        
        <!-- 商品カードグリッド -->
        <div v-else class="product-cards-grid">
          <div 
            v-for="product in availableProducts" 
            :key="product.id" 
            class="product-card"
            :class="{ 'has-items': getProductQuantity(product.id) > 0 }"
            @click="addProductToCart(product)"
          >
            <div class="product-card-content">
              <div class="product-name">{{ product.getDisplayName() }}</div>
              <div class="product-price">¥{{ product.formatPrice() }}</div>
              
              <!-- マイナスボタン -->
              <button 
                v-if="getProductQuantity(product.id) > 0"
                type="button"
                class="minus-btn"
                @click.stop="removeProductFromCart(product)"
              >
                -
              </button>
              
              <!-- 数量バッジ -->
              <div v-if="getProductQuantity(product.id) > 0" class="quantity-badge">
                {{ getProductQuantity(product.id) }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 選択された商品の一覧 -->
        <div v-if="selectedProducts.length > 0" class="selected-products">
          <h4>選択された商品</h4>
          <div class="selected-products-list">
            <div 
              v-for="(item, index) in selectedProducts" 
              :key="`${item.productId}-${index}`" 
              class="selected-product-item"
            >
              <span class="product-name">{{ item.productName }}</span>
              <span class="quantity">× {{ item.quantity }}</span>
              <span class="price">¥{{ formatNumber(item.priceExclTax * item.quantity) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 伝票全体の税率設定 -->
      <div class="form-group">
        <label for="invoiceTaxRate" class="form-label">伝票の税率設定</label>
        <select 
          id="invoiceTaxRate" 
          v-model="formData.invoiceTaxRate" 
          class="form-select"
          @change="recalculateTotals"
        >
          <option 
            v-for="tax in taxes" 
            :key="tax.id" 
            :value="tax.rate"
          >
            {{ tax.rate }}%
          </option>
        </select>
      </div>

      <!-- 備考 -->
      <div class="form-group">
        <label for="note" class="form-label">備考</label>
        <textarea 
          id="note" 
          v-model="formData.note" 
          class="form-textarea"
          rows="3"
          placeholder="備考があれば入力してください"
        ></textarea>
      </div>

      <!-- 合計表示 -->
      <div class="totals-section">
        <h3>合計</h3>
        <div class="totals-grid">
          <div class="total-item">
            <span class="total-label">税抜合計:</span>
            <span class="total-value">¥{{ formatNumber(totals.subtotalExclTax) }}</span>
          </div>
          <div v-if="formData.invoiceTaxRate" class="total-item">
            <span class="total-label">消費税（{{ formData.invoiceTaxRate }}%）:</span>
            <span class="total-value">¥{{ formatNumber(totals.taxAmount) }}</span>
          </div>
          <div class="total-item total-item-main">
            <span class="total-label">税込合計:</span>
            <span class="total-value">¥{{ formatNumber(totals.totalInclTax) }}</span>
          </div>
        </div>
      </div>

      <!-- エラーメッセージ -->
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <!-- 送信ボタン -->
      <div class="form-actions">
        <button 
          type="submit" 
          class="btn btn-primary"
          :disabled="selectedProducts.length === 0"
        >
          売上書込み
        </button>
        
        <!-- 売上反映ボタン -->
        <div v-if="localSales.length > 0" class="sales-reflect-section">
          <button 
            type="button" 
            @click="handleReflectSales" 
            class="btn btn-success"
          >
            売上反映
          </button>
          <span class="sales-count">({{ localSales.length }}件)</span>
        </div>
        
        <button 
          type="button" 
          @click="handleCancel" 
          class="btn btn-secondary"
        >
          キャンセル
        </button>
      </div>
    </form>

    <!-- キャンセル確認ダイアログ -->
    <div v-if="showCancelDialog" class="modal-overlay" @click="closeCancelDialog">
      <div class="modal-content" @click.stop>
        <h3>確認</h3>
        <p v-if="localSales.length > 0">
          ダッシュボードに戻りますか？<br>
          入力した内容とローカルメモリの売上情報は消えますが大丈夫ですか？
        </p>
        <p v-else>
          ダッシュボードに戻りますか？<br>入力した内容はクリアされます。
        </p>
        <div class="modal-actions">
          <button @click="confirmCancel" class="btn btn-primary">はい</button>
          <button @click="closeCancelDialog" class="btn btn-secondary">いいえ</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useCustomersStore } from '../stores/customers'
import { useProductsStore } from '../stores/products'
import { useTaxesStore } from '../stores/taxes'
import { useSalesStore } from '../stores/sales'
import { useSettingsStore } from '../stores/setting'
import { useLoading } from '../composables/useLoading'

// Props
const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({})
  }
})

// Emits
const emit = defineEmits(['submit', 'cancel', 'error', 'toast'])

// Stores
const customersStore = useCustomersStore()
const productsStore = useProductsStore()
const taxesStore = useTaxesStore()
const salesStore = useSalesStore()
const settingsStore = useSettingsStore()
const { setLoading, clearLoading } = useLoading()

// Reactive data
const formData = ref({
  customerId: '',
  issuedOn: new Date().toISOString().split('T')[0], // 今日の日付
  invoiceTaxRate: '', // 伝票全体の税率
  note: ''
})

// 選択された商品の管理
const selectedProducts = ref([])
const errors = ref({})
// isLoadingは共通のローディング画面を使用するため削除
// isReflectingは共通のローディング画面を使用するため削除
const error = ref('')
const showCancelDialog = ref(false)

// ローカルメモリでの売上情報保持
const localSales = ref([])

// Computed
const customers = computed(() => customersStore.sortedCustomers)
const products = computed(() => productsStore.sortedProducts)

// 選択した顧客が扱える商品のみをフィルタ
const availableProducts = computed(() => {
  if (!formData.value.customerId) {
    return []
  }
  
  return products.value.filter(product => {
    // モデルのメソッドを使用
    return product.isAvailableForCustomer(formData.value.customerId)
  })
})

const taxes = computed(() => taxesStore.sortedTaxes)

// 設定からrounding値を取得
const rounding = computed(() => {
  return settingsStore.businessSettings?.rounding || 'floor'
})

// 設定からデフォルト税率IDを取得
const defaultTaxId = computed(() => {
  return settingsStore.businessSettings?.default_tax_id || null
})

// デフォルト税率を取得
const defaultTaxRate = computed(() => {
  if (!defaultTaxId.value || taxes.value.length === 0) return null
  
  const defaultTax = taxes.value.find(tax => tax.id === defaultTaxId.value)
  console.log('Default tax lookup:', { defaultTaxId: defaultTaxId.value, defaultTax, availableTaxes: taxes.value })
  return defaultTax ? defaultTax.rate : null
})

const totals = computed(() => {
  let subtotalExclTax = 0
  
  // 選択された商品の税抜合計を計算
  selectedProducts.value.forEach(item => {
    subtotalExclTax += item.priceExclTax * item.quantity
  })
  
  // 伝票全体の税率で消費税を計算
  let taxAmount = 0
  if (formData.value.invoiceTaxRate) {
    const rawTaxAmount = subtotalExclTax * (formData.value.invoiceTaxRate / 100)
    
    // rounding設定に基づいて丸め処理
    switch (rounding.value) {
      case 'floor':
        taxAmount = Math.floor(rawTaxAmount)
        break
      case 'ceil':
        taxAmount = Math.ceil(rawTaxAmount)
        break
      case 'round':
        taxAmount = Math.round(rawTaxAmount)
        break
      default:
        taxAmount = Math.floor(rawTaxAmount)
    }
  }
  
  const totalInclTax = subtotalExclTax + taxAmount
  
  return {
    subtotalExclTax,
    taxAmount,
    totalInclTax
  }
})

// Methods
const initializeData = async () => {
  try {
    // 各ストアの初期化
    await Promise.all([
      customersStore.initializeCustomers(),
      productsStore.initializeProducts(),
      taxesStore.initializeTaxes(),
      settingsStore.initializeSettings()
    ])
    
    // 初期データがある場合は設定
    if (props.initialData.customerId) {
      formData.value.customerId = props.initialData.customerId
    }
    if (props.initialData.issuedOn) {
      formData.value.issuedOn = props.initialData.issuedOn
    }
    if (props.initialData.invoiceTaxRate) {
      formData.value.invoiceTaxRate = props.initialData.invoiceTaxRate
    } else {
      // デフォルト税率を設定（設定ストアと税率ストアの初期化完了後）
      await setDefaultTaxRate()
    }
    
    // デフォルト税率が設定されていない場合は、最初の税率を設定
    if (!formData.value.invoiceTaxRate && taxes.value.length > 0) {
      formData.value.invoiceTaxRate = taxes.value[0].rate
    }
    if (props.initialData.note) {
      formData.value.note = props.initialData.note
    }
  } catch (err) {
    console.error('Failed to initialize form data:', err)
    error.value = 'データの初期化に失敗しました'
  }
}

// デフォルト税率を設定する関数
const setDefaultTaxRate = async () => {
  // 設定ストアと税率ストアが初期化されるまで少し待つ
  await new Promise(resolve => setTimeout(resolve, 100))
  
  if (!formData.value.invoiceTaxRate) {
    if (defaultTaxRate.value) {
      console.log('Setting default tax rate:', defaultTaxRate.value)
      formData.value.invoiceTaxRate = defaultTaxRate.value
    } else if (taxes.value.length > 0) {
      console.log('Setting first tax rate:', taxes.value[0].rate)
      formData.value.invoiceTaxRate = taxes.value[0].rate
    }
  }
}

// 商品カート関連のメソッド
const addProductToCart = (product) => {
  const existingItem = selectedProducts.value.find(item => item.productId === product.id)
  
  if (existingItem) {
    // 最大999個まで
    if (existingItem.quantity < 999) {
      existingItem.quantity++
    }
  } else {
    // 新しい商品を追加
    selectedProducts.value.push({
      productId: product.id,
      productName: product.getDisplayName(), // モデルのメソッドを使用
      alias: product.alias,
      quantity: 1,
      priceExclTax: product.priceExclTax,
      taxRate: formData.value.invoiceTaxRate ?? defaultTaxRate.value ?? 10
    })
  }
}

const removeProductFromCart = (product) => {
  const existingItem = selectedProducts.value.find(item => item.productId === product.id)
  
  if (existingItem) {
    if (existingItem.quantity > 1) {
      existingItem.quantity--
    } else {
      // 数量が1の場合は商品を削除
      const index = selectedProducts.value.findIndex(item => item.productId === product.id)
      selectedProducts.value.splice(index, 1)
    }
  }
}

const getProductQuantity = (productId) => {
  const item = selectedProducts.value.find(item => item.productId === productId)
  return item ? item.quantity : 0
}

const recalculateTotals = () => {
  // 選択された商品の税率を更新
  selectedProducts.value.forEach(item => {
    item.taxRate = formData.value.invoiceTaxRate ?? defaultTaxRate.value ?? 10
  })
}

const validateForm = () => {
  errors.value = {}
  
  // 顧客選択の検証
  if (!formData.value.customerId) {
    errors.value.customerId = '顧客を選択してください'
  }
  
  // 日付の検証
  if (!formData.value.issuedOn) {
    errors.value.issuedOn = '日付を入力してください'
  }
  
  // 商品選択の検証
  if (selectedProducts.value.length === 0) {
    errors.value.products = '商品を1つ以上選択してください'
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  try {
    if (!validateForm()) {
      return
    }
    
    setLoading(true, '保存中...', '売上情報を保存しています')
    error.value = ''
    
    // 売上データの作成
    const saleData = {
      customerId: formData.value.customerId,
      issuedOn: formData.value.issuedOn,
      lines: selectedProducts.value.map(item => ({
        productId: item.productId,
        productName: item.productName,
        alias: item.alias,
        quantity: item.quantity,
        priceExclTax: item.priceExclTax,
        taxRate: formData.value.invoiceTaxRate ?? defaultTaxRate.value ?? 10
      })),
      note: formData.value.note
    }
    
    // ローカルメモリに売上情報を保存
    localSales.value.push(saleData)
    
    // フォームをクリア
    clearForm()
    
    // 成功メッセージを表示
    showToast('売上情報がローカルメモリに保存されました', 'success')
    
  } catch (err) {
    console.error('Failed to save sale to local memory:', err)
    const errorMessage = err.message || '売上情報の保存に失敗しました'
    error.value = errorMessage
    // 親コンポーネントにエラーを通知
    emit('error', { message: errorMessage })
  } finally {
    clearLoading()
  }
}

// 売上反映処理
const handleReflectSales = async () => {
  try {
    setLoading(true, '反映中...', '売上情報をGoogleドライブに反映しています')
    error.value = ''
    
    // ローカルメモリの売上情報を一括でGoogleドライブに反映
    const reflectedCount = await salesStore.bulkReflectSales(localSales.value)
    
    // ローカルメモリをクリア
    localSales.value = []
    
    // 成功メッセージを表示
    showToast(`${reflectedCount}件の売上情報がGoogleドライブに反映されました`, 'success')
    
  } catch (err) {
    console.error('Failed to reflect sales:', err)
    const errorMessage = err.message || '売上情報の反映に失敗しました'
    error.value = errorMessage
    // 親コンポーネントにエラーを通知
    emit('error', { message: errorMessage })
  } finally {
    clearLoading()
  }
}

// トースト表示用の関数
const showToast = (message, type = 'success') => {
  emit('toast', { message, type })
}

const handleCancel = () => {
  // ローカルメモリに売上情報がある場合、または商品が選択されている場合に確認ダイアログを表示
  if (localSales.value.length > 0 || selectedProducts.value.length > 0 || formData.value.note) {
    showCancelDialog.value = true
  } else {
    emit('cancel')
  }
}

const confirmCancel = () => {
  showCancelDialog.value = false
  // ローカルメモリの売上情報もクリア
  localSales.value = []
  emit('cancel')
}

const closeCancelDialog = () => {
  showCancelDialog.value = false
}

// フォームをクリアするメソッド
const clearForm = () => {
  formData.value = {
    customerId: '',
    issuedOn: new Date().toISOString().split('T')[0], // 今日の日付
    invoiceTaxRate: '', // 伝票全体の税率
    note: ''
  }
  
  selectedProducts.value = []
  errors.value = {}
  error.value = ''
  
  // デフォルト税率を再設定
  setDefaultTaxRate()
}

// ローカルメモリの売上情報をクリアするメソッド
const clearLocalSales = () => {
  localSales.value = []
}

const formatNumber = (num) => {
  return new Intl.NumberFormat('ja-JP').format(num)
}

// Lifecycle
onMounted(async () => {
  await initializeData()
  
  // 初期化完了後、税率が設定されていない場合は設定
  if (!formData.value.invoiceTaxRate) {
    if (defaultTaxRate.value) {
      console.log('Setting default tax rate in onMounted:', defaultTaxRate.value)
      formData.value.invoiceTaxRate = defaultTaxRate.value
    } else if (taxes.value.length > 0) {
      console.log('Setting first tax rate in onMounted:', taxes.value[0].rate)
      formData.value.invoiceTaxRate = taxes.value[0].rate
    }
  }
})

// 外部から呼び出せるメソッドを定義
defineExpose({
  clearForm,
  clearLocalSales
})

// Watch for customer changes to reset selected products
watch(() => formData.value.customerId, (newCustomerId, oldCustomerId) => {
  if (newCustomerId !== oldCustomerId && oldCustomerId) {
    // 顧客が変更された場合、選択された商品をリセット
    selectedProducts.value = []
  }
})

// Watch for taxes and settings to set default tax rate when available
watch([taxes, () => settingsStore.businessSettings], ([newTaxes, newSettings]) => {
  if (newTaxes.length > 0 && newSettings && !formData.value.invoiceTaxRate) {
    if (defaultTaxRate.value) {
      // デフォルト税率が設定されている場合、設定ファイルのデフォルト税率を設定
      console.log('Setting default tax rate from watch:', defaultTaxRate.value)
      formData.value.invoiceTaxRate = defaultTaxRate.value
    } else if (newTaxes.length > 0) {
      // デフォルト税率が設定されていない場合は、最初の税率を設定
      console.log('Setting first tax rate from watch:', newTaxes[0].rate)
      formData.value.invoiceTaxRate = newTaxes[0].rate
    }
  }
}, { immediate: true })
</script>

<style scoped>
.sales-form {
  max-width: 800px;
  margin: 0 auto;
}

.form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #333;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-input.error,
.form-select.error {
  border-color: #dc3545;
}

.form-input:disabled,
.form-select:disabled {
  background-color: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.customer-notice {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  color: #666;
  border: 1px dashed #ddd;
}

/* 商品カードグリッド */
.product-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.product-card {
  background: #fff;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-card:hover {
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.product-card.has-items {
  border-color: #28a745;
  background: #f8fff9;
}

.product-card-content {
  text-align: center;
  width: 100%;
  position: relative;
}

.product-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
  word-break: break-word;
  line-height: 1.2;
}

.product-price {
  color: #666;
  font-size: 0.875rem;
}

.minus-btn {
  position: absolute;
  left: -0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dc3545;
  color: white;
  border: none;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.minus-btn:hover {
  background: #c82333;
}

.quantity-badge {
  position: absolute;
  right: -0.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dc3545;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
}

/* 選択された商品一覧 */
.selected-products {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.selected-products h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1rem;
}

.selected-products-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.selected-product-item .product-name {
  font-weight: 500;
  color: #333;
}

.selected-product-item .quantity {
  color: #666;
  font-size: 0.875rem;
}

.selected-product-item .price {
  font-weight: 600;
  color: #333;
}

.totals-section {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 6px;
  margin: 2rem 0;
}

.totals-section h3 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.25rem;
}

.totals-grid {
  display: grid;
  gap: 0.5rem;
}

.total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.total-item:last-child {
  border-bottom: none;
}

.total-item-main {
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  border-top: 2px solid #333;
  border-bottom: none;
  padding-top: 1rem;
  margin-top: 0.5rem;
}

.total-label {
  color: #666;
}

.total-value {
  font-weight: 600;
  color: #333;
}

.error-banner {
  background: #f8d7da;
  color: #721c24;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #f5c6cb;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  align-items: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.sales-reflect-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sales-count {
  color: #666;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
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

/* モーダルダイアログ */
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
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.modal-content h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.modal-content p {
  margin: 0 0 1.5rem 0;
  color: #666;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .product-cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.75rem;
  }
  
  .product-card {
    padding: 0.75rem;
    min-height: 70px;
  }
  
  .product-name {
    font-size: 0.875rem;
  }
  
  .product-price {
    font-size: 0.75rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .selected-product-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style> 