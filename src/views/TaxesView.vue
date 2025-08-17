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
        <div class="card">
          <h2>税率一覧</h2>
          <p>この機能は現在開発中です。</p>
          <p>Google Drive APIとの連携により、税率情報の管理が可能になります。</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
// 税率管理機能は後で実装
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

.card h2 {
  color: #333;
  margin-bottom: 1rem;
}

.card p {
  color: #666;
  margin-bottom: 0.5rem;
}
</style> 