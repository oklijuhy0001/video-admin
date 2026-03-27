<template>
  <div class="card">
    <h2>📁 Repos & Cloudflare Pages</h2>
    <div v-if="loading" class="loading">Đang tải...</div>
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>
    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Repo</th>
            <th>Cloudflare Pages URL</th>
            <th>Videos</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in repos" :key="r.id" :class="r.video_count >= 1000 ? 'row-full' : ''">
            <td>{{ r.id }}</td>
            <td>{{ r.repo_name }}</td>
            <td>
              <a :href="r.cf_pages_url" target="_blank" rel="noopener">
                {{ r.cf_pages_url }}
              </a>
            </td>
            <td>{{ r.video_count }} / 1000</td>
            <td>
              <span :class="r.video_count >= 1000 ? 'badge badge-full' : 'badge badge-active'">
                {{ r.video_count >= 1000 ? 'Full' : 'Active' }}
              </span>
            </td>
            <td>{{ fmtDate(r.created_at) }}</td>
          </tr>
          <tr v-if="repos.length === 0">
            <td colspan="6" style="text-align:center;color:#888;padding:24px;">Chưa có repo nào</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="margin-top:12px;">
      <button @click="load">🔄 Refresh</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getRepos } from '../api.js'

const repos = ref([])
const loading = ref(false)
const error = ref('')

const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    repos.value = await getRepos()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
