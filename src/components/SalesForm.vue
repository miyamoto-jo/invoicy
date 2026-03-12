<template>
  <div class="sales-form">
    <!-- 売上反映ボタン -->
    <div v-if="!isEditMode && localSales.length > 0" class="sales-reflect-section">
      <button 
        type="button" 
        @click="handleReflectSales" 
        class="btn btn-danger"
      >
        売上反映（{{ localSales.length }}件）
      </button>
    </div>
    <form @submit.prevent="handleSubmit" class="form">
      <!-- 顧客選択 -->
      <div class="form-group">
        <label for="customer" class="form-label">顧客 *</label>
        <select 
          id="customer" 
          v-model="formData.customerId" 
          class="form-select"
          :class="{ 'error': errors.customerId }"
          :disabled="isEditMode"
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
        <input
          v-model="productSearchQuery"
          type="search"
          class="form-input product-search-input"
          :disabled="!formData.customerId"
          placeholder="商品名/管理名称で検索（部分一致）"
        >
        <div v-if="!formData.customerId" class="customer-notice">
          顧客を選択すると商品が表示されます
        </div>
        
        <!-- 商品カードグリッド -->
        <div v-else-if="filteredAvailableProducts.length > 0" class="product-cards-grid">
          <div 
            v-for="product in filteredAvailableProducts" 
            :key="product.id" 
            class="product-card"
            :class="{ 'has-items': getProductQuantity(product.id) > 0 }"
            @click="addProductToCart(product)"
          >
            <div class="product-card-content">
              <div class="product-name">{{ product.getDisplayNameForStaff() }}</div>
              <div class="product-price">¥{{ product.formatPrice() }}</div>
              
              <!-- マイナスボタン -->
              <button 
                v-if="getProductQuantity(product.id) > 0"
                type="button"
                class="minus-btn"
                @pointerdown.stop
                @pointerup.stop
                @click.stop="removeProductFromCart(product)"
              >
                -
              </button>
              
              <!-- 数量バッジ -->
              <div 
                v-if="getProductQuantity(product.id) > 0" 
                class="quantity-badge"
                @click.stop="openQuantityModal(product)"
              >
                {{ getProductQuantity(product.id) }}
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-products-notice">
          商品がありません
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
              <div class="selected-product-header">
                <span v-if="item.isEdit" class="edited-badge">マスタ未登録</span>
                <div class="selected-product-actions">
                  <button
                    type="button"
                    class="selected-product-edit-btn"
                    @click="openLineEditModal(index)"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    class="selected-product-remove-btn"
                    aria-label="明細を削除"
                    @click="removeSelectedProduct(index)"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div class="selected-product-content">
                <span class="product-name">{{ item.productName }}</span>
                <span class="quantity">× {{ item.quantity }}</span>
                <span class="price">¥{{ formatNumber(item.priceExclTax * item.quantity) }}</span>
              </div>
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
          {{ isEditMode ? '更新' : '売上書込み' }}
        </button>
        
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
    <div v-if="!isEditMode && showCancelDialog" class="modal-overlay" @click="closeCancelDialog">
      <div class="modal-content" @click.stop>
        <h3>確認</h3>
        <p v-if="localSales.length > 0">
          反映されていない売上があります。本当に画面移動しますか？<br>
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

    <!-- 数量変更モーダル -->
    <div v-if="showQuantityModal" class="modal-overlay" @click="closeQuantityModal">
      <div class="modal-content" @click.stop>
        <h3>数量を変更</h3>
        <p class="modal-product-name">{{ modalProductName }}</p>
        <div class="modal-form">
          <label class="form-label">数量（0〜999）</label>
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            class="form-input"
            :value="quantityInput"
            @input="onQuantityInputChange"
            placeholder="0〜999の半角数字"
          >
          <div 
            v-if="quantityInput !== '' && !isQuantityInputValid" 
            class="error-message"
          >
            0〜999の半角数字で入力してください
          </div>
        </div>
        <div class="modal-actions">
          <button 
            type="button" 
            class="btn btn-primary" 
            :disabled="!isQuantityInputValid" 
            @click="applyQuantityChange"
          >
            変更
          </button>
        </div>
      </div>
    </div>

    <!-- 明細編集モーダル -->
    <div v-if="showLineEditModal" class="modal-overlay" @click="closeLineEditModal">
      <div class="modal-content" @click.stop>
        <h3>明細を編集</h3>
        <div class="modal-form">
          <label class="form-label">商品名</label>
          <input
            v-model="lineEditForm.productName"
            type="text"
            class="form-input"
            placeholder="商品名を入力"
          >

          <label class="form-label modal-field-spacer">数量（1〜999）</label>
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            class="form-input"
            :value="lineEditForm.quantityInput"
            placeholder="1〜999の半角数字"
            @input="onLineEditQuantityInput"
          >
          <div v-if="lineEditForm.quantityInput !== '' && !isLineEditQuantityValid" class="error-message">
            1〜999の半角数字で入力してください
          </div>

          <label class="form-label modal-field-spacer">税抜単価（1〜9999999）</label>
          <input
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            class="form-input"
            :value="lineEditForm.priceInput"
            placeholder="1〜9999999の半角数字"
            @input="onLineEditPriceInput"
          >
          <div v-if="lineEditForm.priceInput !== '' && !isLineEditPriceValid" class="error-message">
            1〜9999999の半角数字で入力してください
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="closeLineEditModal">
            キャンセル
          </button>
          <button type="button" class="btn btn-primary" :disabled="!isLineEditFormValid" @click="applyLineEdit">
            更新
          </button>
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
import { UNREGISTERED_MASTER_PRODUCT_ID } from '../constants/productIds'

// Props
const props = defineProps({
  initialData: {
    type: Object,
    default: () => ({})
  },
  mode: {
    type: String,
    default: 'create'
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
const showQuantityModal = ref(false)
const quantityInput = ref('')
const modalProduct = ref(null)
const showLineEditModal = ref(false)
const editingLineIndex = ref(null)
const lineEditForm = ref({
  productName: '',
  quantityInput: '',
  priceInput: ''
})

// ローカルメモリでの売上情報保持
const localSales = ref([])

// Computed
const customers = computed(() => customersStore.sortedCustomers)
const products = computed(() => productsStore.sortedProducts)
const productMap = computed(() => {
  const map = new Map()
  products.value.forEach(product => map.set(product.id, product))
  return map
})
const isEditMode = computed(() => props.mode === 'edit')

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

const productSearchQuery = ref('')

const normalizeForSearch = (value) => {
  return String(value ?? '').normalize('NFKC').toLowerCase()
}

const filteredAvailableProducts = computed(() => {
  const query = normalizeForSearch(productSearchQuery.value).trim()
  if (!query) return availableProducts.value

  return availableProducts.value.filter(product => {
    const hasAlias = typeof product?.alias === 'string' && product.alias.trim() !== ''
    const target = hasAlias ? product.alias : product?.name
    return normalizeForSearch(target).includes(query)
  })
})

const taxes = computed(() => taxesStore.sortedTaxes)

// 税率設定からrounding値を取得
const rounding = computed(() => taxesStore.rounding || 'floor')

// 税率設定からデフォルト税率IDを取得（Piniaの自動アンラップをそのまま利用）
const defaultTaxId = computed(() => taxesStore.defaultTaxId || null)

// デフォルト税率を取得
const defaultTaxRate = computed(() => {
  const id = defaultTaxId.value
  if (!id || taxes.value.length === 0) return null
  
  const defaultTax = taxes.value.find(tax => tax.id === id)
  return defaultTax ? defaultTax.rate : null
})

const modalProductName = computed(() => {
  return modalProduct.value ? modalProduct.value.getDisplayName() : ''
})

const isQuantityInputValid = computed(() => {
  const value = quantityInput.value.trim()
  if (value === '') return false
  if (!/^\d{1,3}$/.test(value)) return false
  const numericValue = Number(value)
  return numericValue >= 0 && numericValue <= 999
})

const isLineEditQuantityValid = computed(() => {
  const value = lineEditForm.value.quantityInput.trim()
  if (!/^\d{1,3}$/.test(value)) return false
  const numericValue = Number(value)
  return numericValue >= 1 && numericValue <= 999
})

const isLineEditPriceValid = computed(() => {
  const value = lineEditForm.value.priceInput.trim()
  if (!/^\d{1,7}$/.test(value)) return false
  const numericValue = Number(value)
  return numericValue >= 1 && numericValue <= 9999999
})

const isLineEditFormValid = computed(() => {
  return isLineEditQuantityValid.value && isLineEditPriceValid.value
})

const totals = computed(() => {
  let subtotalExclTax = 0
  
  // 選択された商品の税抜合計を計算
  selectedProducts.value.forEach(item => {
    subtotalExclTax += item.priceExclTax * item.quantity
  })
  
  // 伝票全体の税率で消費税を計算（整数演算で丸め誤差を防ぐ）
  let taxAmount = 0
  if (formData.value.invoiceTaxRate) {
    const rawTaxScaled = subtotalExclTax * formData.value.invoiceTaxRate // 百分率を掛けた整数値

    switch (rounding.value) {
      case 'floor':
        taxAmount = Math.floor(rawTaxScaled / 100)
        break
      case 'ceil':
        taxAmount = Math.floor((rawTaxScaled + 99) / 100)
        break
      case 'round':
        taxAmount = Math.floor((rawTaxScaled + 50) / 100)
        break
      default:
        taxAmount = Math.floor(rawTaxScaled / 100)
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
    populateInitialLines()
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
      formData.value.invoiceTaxRate = defaultTaxRate.value
    } else if (taxes.value.length > 0) {
      formData.value.invoiceTaxRate = taxes.value[0].rate
    }
  }
}

const populateInitialLines = () => {
  if (!props.initialData.lines || props.initialData.lines.length === 0) return

  if (!formData.value.invoiceTaxRate) {
    const initialRate = props.initialData.lines[0]?.taxRate
    if (initialRate !== undefined) {
      formData.value.invoiceTaxRate = initialRate
    }
  }

  selectedProducts.value = props.initialData.lines.map(line => {
    const product = productMap.value.get(line.productId)
    return {
      productId: line.productId,
      productName: line.productName || product?.getDisplayName() || '不明商品',
      alias: line.alias || product?.alias || '',
      quantity: line.quantity ?? 0,
      priceExclTax: line.priceExclTax ?? product?.priceExclTax ?? 0,
      taxRate: line.taxRate ?? formData.value.invoiceTaxRate ?? defaultTaxRate.value ?? 10,
      isEdit: line.isEdit ?? false
    }
  })

  recalculateTotals()
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
      taxRate: formData.value.invoiceTaxRate ?? defaultTaxRate.value ?? 10,
      isEdit: false
    })
  }
}

const setProductQuantity = (product, quantity) => {
  const existingItem = selectedProducts.value.find(item => item.productId === product.id)
  const normalizedQuantity = Math.min(Math.max(quantity, 0), 999)

  if (normalizedQuantity === 0) {
    if (existingItem) {
      const index = selectedProducts.value.findIndex(item => item.productId === product.id)
      selectedProducts.value.splice(index, 1)
    }
    return
  }

  if (existingItem) {
    existingItem.quantity = normalizedQuantity
    existingItem.taxRate = formData.value.invoiceTaxRate ?? defaultTaxRate.value ?? 10
  } else {
    selectedProducts.value.push({
      productId: product.id,
      productName: product.getDisplayName(),
      alias: product.alias,
      quantity: normalizedQuantity,
      priceExclTax: product.priceExclTax,
      taxRate: formData.value.invoiceTaxRate ?? defaultTaxRate.value ?? 10,
      isEdit: false
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

const removeSelectedProduct = (index) => {
  selectedProducts.value.splice(index, 1)
}

const openLineEditModal = (index) => {
  const item = selectedProducts.value[index]
  if (!item) return

  editingLineIndex.value = index
  lineEditForm.value = {
    productName: item.productName ?? '',
    quantityInput: String(item.quantity ?? ''),
    priceInput: String(item.priceExclTax ?? '')
  }
  showLineEditModal.value = true
}

const closeLineEditModal = () => {
  showLineEditModal.value = false
  editingLineIndex.value = null
  lineEditForm.value = {
    productName: '',
    quantityInput: '',
    priceInput: ''
  }
}

const onLineEditQuantityInput = (event) => {
  lineEditForm.value.quantityInput = event.target.value.slice(0, 3)
}

const onLineEditPriceInput = (event) => {
  lineEditForm.value.priceInput = event.target.value.slice(0, 7)
}

const applyLineEdit = () => {
  if (editingLineIndex.value === null || !isLineEditFormValid.value) return
  const item = selectedProducts.value[editingLineIndex.value]
  if (!item) return

  const nextProductName = lineEditForm.value.productName
  const nextQuantity = Number(lineEditForm.value.quantityInput)
  const nextPriceExclTax = Number(lineEditForm.value.priceInput)
  const isQuantityOnlyChange =
    item.productName === nextProductName &&
    item.priceExclTax === nextPriceExclTax &&
    item.quantity !== nextQuantity

  item.productName = lineEditForm.value.productName
  item.quantity = nextQuantity
  item.priceExclTax = nextPriceExclTax
  item.taxRate = formData.value.invoiceTaxRate ?? defaultTaxRate.value ?? 10
  if (!isQuantityOnlyChange) {
    item.productId = UNREGISTERED_MASTER_PRODUCT_ID
    item.isEdit = true
  }

  closeLineEditModal()
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

const buildLinesPayload = () => {
  return selectedProducts.value.map(item => ({
    productId: item.productId,
    productName: item.productName,
    alias: item.alias,
    quantity: item.quantity,
    priceExclTax: item.priceExclTax,
    taxRate: formData.value.invoiceTaxRate ?? defaultTaxRate.value ?? 10,
    isEdit: item.isEdit ?? false
  }))
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

const scrollToTop = () => {
  if (typeof window === 'undefined') return

  // iOS Safari など scrollTo オプション未対応環境向けフォールバック
  const el = document.scrollingElement || document.documentElement || document.body
  const supportsSmooth = 'scrollBehavior' in document.documentElement.style

  if (supportsSmooth && el.scrollTo) {
    el.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    el.scrollTop = 0
    window.scrollTo(0, 0)
  }
}

const handleSubmit = async () => {
  scrollToTop()
  if (!validateForm()) {
    return
  }
  
  const saleData = {
    customerId: formData.value.customerId,
    issuedOn: formData.value.issuedOn,
    lines: buildLinesPayload(),
    note: formData.value.note
  }

  // 編集モードでは即座に親へ委譲
  if (isEditMode.value) {
    error.value = ''
    emit('submit', saleData)
    return
  }

  try {
    setLoading(true, '保存中...', '売上情報を保存しています')
    error.value = ''

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
  if (isEditMode.value) {
    emit('cancel')
    return
  }
  // ローカルメモリに売上情報がある場合は必ず確認ダイアログを表示
  if (localSales.value.length > 0) {
    showCancelDialog.value = true
  } else if (selectedProducts.value.length > 0 || formData.value.note) {
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

const openQuantityModal = (product) => {
  modalProduct.value = product
  quantityInput.value = String(getProductQuantity(product.id))
  showQuantityModal.value = true
}

const closeQuantityModal = () => {
  showQuantityModal.value = false
  modalProduct.value = null
  quantityInput.value = ''
}

const onQuantityInputChange = (event) => {
  // 入力値はそのまま保持し、バリデーションで判定する（非数字を入れた場合に無効化するため）
  quantityInput.value = event.target.value.slice(0, 3)
}

const applyQuantityChange = () => {
  if (!modalProduct.value || !isQuantityInputValid.value) return
  const quantity = Number(quantityInput.value)
  setProductQuantity(modalProduct.value, quantity)
  closeQuantityModal()
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
      formData.value.invoiceTaxRate = defaultTaxRate.value
    } else if (taxes.value.length > 0) {
      formData.value.invoiceTaxRate = taxes.value[0].rate
    }
  }
})

// 未反映の売上があるかどうかを判定するcomputed
const hasUnreflectedSales = computed(() => localSales.value.length > 0)

// 外部から呼び出せるメソッドを定義
defineExpose({
  clearForm,
  clearLocalSales,
  localSales,
  hasUnreflectedSales
})

// Watch for customer changes to reset selected products
watch(() => formData.value.customerId, (newCustomerId, oldCustomerId) => {
  if (newCustomerId !== oldCustomerId && oldCustomerId) {
    // 顧客が変更された場合、選択された商品をリセット
    selectedProducts.value = []
  }
  if (newCustomerId !== oldCustomerId) {
    productSearchQuery.value = ''
  }
})

// Watch for taxes and settings to set default tax rate when available
watch([taxes, () => settingsStore.businessSettings], ([newTaxes, newSettings]) => {
  if (newTaxes.length > 0 && newSettings && !formData.value.invoiceTaxRate) {
    if (defaultTaxRate.value) {
      // デフォルト税率が設定されている場合、設定ファイルのデフォルト税率を設定
      formData.value.invoiceTaxRate = defaultTaxRate.value
    } else if (newTaxes.length > 0) {
      // デフォルト税率が設定されていない場合は、最初の税率を設定
      formData.value.invoiceTaxRate = newTaxes[0].rate
    }
  }
}, { immediate: true })
</script>

<style scoped>
/* コンポーネント固有のスタイル */
.sales-form {
  max-width: var(--form-max-width-large);
  margin: 0 auto;
}

.form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.customer-notice {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  color: #666;
  border: 1px dashed #ddd;
}

.product-search-input {
  margin: 0.5rem 0 1rem 0;
}

.no-products-notice {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  text-align: center;
  color: #666;
  border: 1px dashed #ddd;
  margin-bottom: 1.5rem;
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
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.selected-product-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.selected-product-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  width: 100%;
}

.edited-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #155724;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
}

.selected-product-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-left: auto;
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

.selected-product-remove-btn {
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 0.25rem;
}

.selected-product-remove-btn:hover {
  color: #dc3545;
}

.selected-product-edit-btn {
  border: 1px solid #ddd;
  background: #fff;
  color: #333;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
}

.selected-product-edit-btn:hover {
  border-color: #007bff;
  color: #007bff;
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

/* コンポーネント固有のスタイル */
.form-actions {
  align-items: center;
}

.sales-reflect-section {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
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

.modal-product-name {
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

.modal-form {
  margin-bottom: 1.5rem;
  text-align: left;
}

.modal-field-spacer {
  display: block;
  margin-top: 0.75rem;
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
  
  .modal-actions {
    flex-direction: column;
  }
  
  .selected-product-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .selected-product-content {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

}
</style> 