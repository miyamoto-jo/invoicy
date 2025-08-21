<template>
  <div class="taxes">
    <header class="header">
      <div class="container">
        <div class="header-content">
          <h1>税率管理</h1>
          <router-link to="/dashboard" class="btn btn-secondary">
            ダッシュボードに戻る
          </router-link>
        </div>
      </div>
    </header>
    
    <main class="main">
      <div class="container">
        <div class="content-wrapper">
          <!-- 税率設定 -->
          <div class="content-section">
            <h2>税率設定</h2>
            <div class="settings-form">
              <div class="form-group">
                <label for="rounding">端数計算方式</label>
                <select 
                  id="rounding" 
                  v-model="taxesStore.rounding"
                  @change="handleRoundingChange"
                  :disabled="taxesStore.isLoading"
                >
                  <option 
                    v-for="option in taxesStore.roundingOptions" 
                    :key="option.value" 
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="defaultTax">デフォルト税率</label>
                <select 
                  id="defaultTax" 
                  v-model="taxesStore.defaultTaxId"
                  @change="handleDefaultTaxChange"
                  :disabled="taxesStore.isLoading"
                >
                  <option 
                    v-for="tax in taxesStore.getActiveTaxes" 
                    :key="tax.id" 
                    :value="tax.id"
                  >
                    {{ tax.rate }}% {{ tax.description ? `(${tax.description})` : '' }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- 税率一覧 -->
          <div class="content-section">
            <h2>税率マスター</h2>
            <TaxList
              :taxes="taxesStore.sortedTaxes"
              :is-loading="taxesStore.isLoading"
              :error="taxesStore.error"
              @add="showForm = true"
              @edit="handleEdit"
              @delete="handleDelete"
              @retry="handleRetry"
            />
          </div>
          
          <!-- 税率フォーム（モーダル） -->
          <div v-if="showForm" class="modal-overlay" @click="closeForm">
            <div class="modal-content" @click.stop>
              <TaxForm
                :tax="editingTax"
                :is-loading="taxesStore.isLoading"
                @submit="handleSubmit"
                @close="closeForm"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTaxesStore } from '../stores/taxes'
import TaxList from '../components/TaxList.vue'
import TaxForm from '../components/TaxForm.vue'

const taxesStore = useTaxesStore()

// State
const showForm = ref(false)
const editingTax = ref(null)

// 初期化
onMounted(async () => {
  try {
    await taxesStore.initializeTaxes()
  } catch (err) {
    console.error('Failed to initialize taxes:', err)
  }
})

// イベントハンドラー
const handleEdit = (tax) => {
  editingTax.value = tax
  showForm.value = true
}

const handleDelete = async (taxId) => {
  try {
    await taxesStore.deleteTax(taxId)
  } catch (err) {
    console.error('Failed to delete tax:', err)
  }
}

const handleSubmit = async (taxData) => {
  try {
    if (editingTax.value) {
      // 編集
      await taxesStore.updateTax(editingTax.value.id, taxData)
    } else {
      // 新規作成
      await taxesStore.createTax(taxData)
    }
    closeForm()
  } catch (err) {
    console.error('Failed to submit tax:', err)
  }
}

const handleRetry = async () => {
  try {
    await taxesStore.initializeTaxes()
  } catch (err) {
    console.error('Failed to retry:', err)
  }
}

const handleRoundingChange = async () => {
  try {
    await taxesStore.updateTaxSettings(taxesStore.rounding, taxesStore.defaultTaxId)
  } catch (err) {
    console.error('Failed to update rounding:', err)
  }
}

const handleDefaultTaxChange = async () => {
  try {
    await taxesStore.updateTaxSettings(taxesStore.rounding, taxesStore.defaultTaxId)
  } catch (err) {
    console.error('Failed to update default tax:', err)
  }
}

const closeForm = () => {
  showForm.value = false
  editingTax.value = null
}
</script>

<style scoped>
.taxes {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 1rem 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.main {
  padding: 2rem 0;
}

.content-wrapper {
  position: relative;
}

.content-section {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.content-section h2 {
  color: #333;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e0e0e0;
}

.settings-form {
  display: grid;
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
  font-size: 1rem;
  background: white;
  transition: border-color 0.3s;
}

.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-group select:disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-secondary {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #e9ecef;
}

/* モーダルスタイル */
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
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .content-section {
    padding: 1rem;
  }
  
  .modal-content {
    margin: 1rem;
  }
  
  .settings-form {
    gap: 1rem;
  }
  
  .form-group select {
    padding: 0.5rem;
    font-size: 0.9rem;
  }
}
</style> 