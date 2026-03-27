<template>
  <div class="card">
    <h2>🩺 Health Check</h2>
    <div v-if="loading" class="loading">Đang tải...</div>
    <div v-else-if="data">
      <div class="health-grid">
        <div class="health-item">
          <div class="label">Trạng thái</div>
          <div class="value">
            <span :class="data.status === 'ok' ? 'badge badge-ok' : 'badge badge-error'">
              {{ data.status === 'ok' ? '✅ OK' : '❌ ERROR' }}
            </span>
          </div>
        </div>
        <div class="health-item">
          <div class="label">Database</div>
          <div class="value">
            <span :class="data.db === 'connected' ? 'badge badge-ok' : 'badge badge-error'">
              {{ data.db }}
            </span>
          </div>
        </div>
        <div class="health-item">
          <div class="label">Tổng video</div>
          <div class="value">{{ data.total_videos?.toLocaleString() }}</div>
        </div>
        <div class="health-item">
          <div class="label">Tổng repo</div>
          <div class="value">{{ data.total_repos }}</div>
        </div>
      </div>
      <div style="font-size:12px;color:#888;">
        Service: {{ data.service }} &nbsp;|&nbsp; {{ data.timestamp }}
      </div>
    </div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div style="margin-top:12px;">
      <button @click="load">🔄 Refresh</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getHealth } from '../api.js'

const data = ref(null)
const loading = ref(false)
const error = ref('')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    data.value = await getHealth()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
