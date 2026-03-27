<template>
  <div class="card">
    <h2>🎥 Videos</h2>
    <div class="toolbar">
      <input
        type="search"
        v-model="search"
        placeholder="🔍 Tìm theo tên..."
        @input="onSearch"
      />
      <button @click="load">🔄 Refresh</button>
    </div>
    <div v-if="loading" class="loading">Đang tải...</div>
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>
    <div v-else>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên</th>
              <th>URL Cloudflare</th>
              <th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in videos" :key="v.id">
              <td>{{ v.id }}</td>
              <td>{{ v.name }}</td>
              <td>
                <a :href="v.cf_url" target="_blank" rel="noopener">
                  {{ v.cf_url.length > 60 ? v.cf_url.slice(0, 60) + '…' : v.cf_url }}
                </a>
              </td>
              <td>{{ fmtDate(v.created_at) }}</td>
            </tr>
            <tr v-if="videos.length === 0">
              <td colspan="4" style="text-align:center;color:#888;padding:24px;">Không có video nào</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button @click="prevPage" :disabled="page === 1">← Trước</button>
        <span>Trang {{ page }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="page >= totalPages">Sau →</button>
        <span style="margin-left:auto;color:#888;">Tổng: {{ total.toLocaleString() }} video</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getVideos } from '../api.js'

const videos = ref([])
const total = ref(0)
const page = ref(1)
const limit = 20
const search = ref('')
const loading = ref(false)
const error = ref('')
let debounceTimer = null

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await getVideos({ page: page.value, limit, search: search.value })
    videos.value = res.videos
    total.value = res.total
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { page.value = 1; load() }, 300)
}

const prevPage = () => { if (page.value > 1) { page.value--; load() } }
const nextPage = () => { if (page.value < totalPages.value) { page.value++; load() } }

onMounted(load)
</script>
