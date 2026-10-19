import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// Service Workerの登録
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/invoicy/service-worker.js', {
      // Service Worker自体はHTTPキャッシュを使わず、更新を確実に確認する
      updateViaCache: 'none'
    })
      .then((registration) => registration.update())
      .catch(() => {
        // 失敗時もアプリ動作には致命的でないため何もしない
      })
  })
}
