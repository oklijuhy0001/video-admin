<template>
  <div>
    <header>
      <h1>🎬 Video Admin</h1>
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
import { ref, onMounted } from 'vue'
import HealthTab from './components/HealthTab.vue'
import RepoTable from './components/RepoTable.vue'
import VideoTable from './components/VideoTable.vue'
import UploadTab from './components/UploadTab.vue'

const tabs = [
  { id: 'health', label: '🩺 Health' },
  { id: 'repos',  label: '📁 Repos' },
  { id: 'videos', label: '🎥 Videos' },
  { id: 'upload', label: '⬆ Upload' },
]
const activeTab = ref('health')

// Keep-alive: ping every 14 minutes so Render free tier doesn't sleep
onMounted(() => {
  setInterval(() => fetch('/health').catch(() => {}), 14 * 60 * 1000)
})
</script>
