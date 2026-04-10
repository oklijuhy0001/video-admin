<template>
  <Login v-if="!isAuthenticated" @login="isAuthenticated = true" />
  <div v-else>
    <header>
      <h1>🎬 Video Admin</h1>
      <button class="logout-btn" @click="logout">Logout</button>
    </header>
    <nav>
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>
    <main>
      <HealthTab v-show="activeTab === 'health'" />
      <RepoTable v-show="activeTab === 'repos'" />
      <VideoTable v-show="activeTab === 'videos'" />
      <UploadTab v-show="activeTab === 'upload'" />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import Login from './components/Login.vue'
import HealthTab from './components/HealthTab.vue'
import RepoTable from './components/RepoTable.vue'
import VideoTable from './components/VideoTable.vue'
import UploadTab from './components/UploadTab.vue'

const isAuthenticated = computed(() => {
  const authStr = localStorage.getItem('auth')
  if (!authStr) return false
  try {
    const auth = JSON.parse(authStr)
    return auth.expires > Date.now()
  } catch {
    return false
  }
})

const logout = () => {
  localStorage.removeItem('auth')
  window.location.reload()
}

const tabs = [
  { id: 'health', label: '🩺 Health' },
  { id: 'repos',  label: '📁 Repos' },
  { id: 'videos', label: '🎥 Videos' },
  { id: 'upload', label: '⬆ Upload' },
]
const activeTab = ref('health')

onMounted(() => {
  setInterval(() => {
    if (isAuthenticated.value) {
      fetch('/health', { headers: { Authorization: 'Bearer authenticated' } }).catch(() => {})
    }
  }, 14 * 60 * 1000)
})
</script>

<style scoped>
.logout-btn {
  background: #ff6b6b;
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-left: auto;
}

.logout-btn:hover {
  background: #ff5252;
}
</style>
