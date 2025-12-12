<template>
  <div class="loading-screen">
    <div class="loading-content">
      <div class="loading-image">
        <!-- 猫のローディングアニメーション画像 -->
        <img 
          v-if="imageLoaded"
          :src="selectedImage" 
          alt="ローディング中" 
          class="loading-cat"
        />
        <!-- フォールバック用のスピナー -->
        <div v-else class="loading-placeholder">
          <div class="spinner"></div>
        </div>
      </div>
      <div class="loading-text">
        <h3>{{ title || '読み込み中...' }}</h3>
        <p v-if="message">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import loadingCat1 from '../assets/loading-cat1.png'
import loadingCat2 from '../assets/loading-cat2.png'
import loadingCat3 from '../assets/loading-cat3.png'

const props = defineProps({
  title: {
    type: String,
    default: '読み込み中...'
  },
  message: {
    type: String,
    default: ''
  }
})

const imageLoaded = ref(false)
const debug = ref(true) // デバッグモードを有効化

// 3枚の画像からランダムで1枚を選択
const selectedImage = computed(() => {
  const images = [loadingCat1, loadingCat2, loadingCat3]
  const randomIndex = Math.floor(Math.random() * images.length)
  return images[randomIndex]
})

const tryLoadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

const loadImageWithFallback = async () => {
  const images = [loadingCat1, loadingCat2, loadingCat3]
  
  for (const image of images) {
    try {
      console.log(`🔄 Trying to load image: ${image}`)
      await tryLoadImage(image)
      console.log(`✅ Successfully loaded image: ${image}`)
    } catch (error) {
      console.log(`❌ Failed to load image: ${image}`)
      imageLoaded.value = false
      return
    }
  }
  
  console.log('✅ All images loaded successfully')
  imageLoaded.value = true
}

onMounted(async () => {
  console.log('🔄 Starting image loading process...')
  await loadImageWithFallback()
})
</script>

<style scoped>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-content {
  text-align: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  width: 90%;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.loading-image {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}

.loading-cat {
  width: 120px;
  height: 120px;
  object-fit: contain;
  animation: bounce 2s ease-in-out infinite;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

.loading-placeholder {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4285f4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text h3 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.loading-text p {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
}

.debug-info {
  font-size: 0.8rem;
  color: #999;
  font-style: italic;
  margin-top: 0.5rem;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .loading-content {
    padding: 1.5rem;
    margin: 1rem;
  }
  
  .loading-image {
    min-height: 80px;
  }
  
  .loading-cat,
  .loading-placeholder {
    width: 80px;
    height: 80px;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
  }
  
  .loading-text h3 {
    font-size: 1.1rem;
  }
  
  .loading-text p {
    font-size: 0.85rem;
  }
}
</style>
