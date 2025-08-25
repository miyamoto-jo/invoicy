<template>
  <AppLayout>
    <div class="invoices">
      <div class="card">
        <h2>請求書一覧</h2>
        <p>この機能は現在開発中です。</p>
        <p>Google Drive APIとの連携により、請求書の作成・管理が可能になります。</p>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import AppLayout from '../components/AppLayout.vue'
// 請求書管理機能は後で実装
</script>

<style scoped>
.invoices {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card h2 {
  color: #333;
  margin-bottom: 1rem;
}

.card p {
  color: #666;
  margin-bottom: 0.5rem;
}
</style> 