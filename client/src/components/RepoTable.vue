<template>
  <div class="card">
    <h2>📁 Repos & Cloudflare Pages</h2>

    <!-- Add Repo Form -->
    <div class="add-repo-form" style="margin-bottom:20px;padding:16px;border:1px solid #ddd;border-radius:8px;background:#f9f9f9;">
      <h3 style="margin:0 0 12px 0;font-size:15px;">Thêm Repo Mới</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <input
          v-model="newRepo.repo_name"
          placeholder="Tên repo (vd: video-store-1)"
          style="flex:1;min-width:200px;padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;"
        />
        <input
          v-model="newRepo.cf_pages_url"
          placeholder="Cloudflare Pages URL (vd: https://xxx.pages.dev)"
          style="flex:2;min-width:300px;padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;"
        />
        <button class="btn-primary" @click="addRepo" :disabled="adding || !newRepo.repo_name || !newRepo.cf_pages_url">
          {{ adding ? '⏳ Đang thêm...' : '➕ Thêm' }}
        </button>
      </div>
      <div v-if="addError" class="alert alert-error" style="margin-top:8px;">{{ addError }}</div>
      <div v-if="addSuccess" class="alert alert-success" style="margin-top:8px;">{{ addSuccess }}</div>
    </div>

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
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in repos" :key="r.id" :class="r.video_count >= 150 ? 'row-full' : ''">
            <td>{{ r.id }}</td>
            <td>{{ r.repo_name }}</td>
            <td>
              <a :href="r.cf_pages_url" target="_blank" rel="noopener">
                {{ r.cf_pages_url }}
              </a>
            </td>
            <td>{{ r.video_count }} / 150</td>
            <td>
              <span :class="r.video_count >= 150 ? 'badge badge-full' : 'badge badge-active'">
                {{ r.video_count >= 150 ? 'Full' : 'Active' }}
              </span>
            </td>
            <td>{{ fmtDate(r.created_at) }}</td>
            <td>
              <button class="btn-danger" @click="removeRepo(r.id)" style="padding:2px 10px;font-size:12px;">
                🗑 Xóa
              </button>
            </td>
          </tr>
          <tr v-if="repos.length === 0">
            <td colspan="7" style="text-align:center;color:#888;padding:24px;">Chưa có repo nào. Hãy thêm repo ở trên.</td>
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
import { ref, reactive, onMounted } from 'vue'
import { getRepos, createRepo, deleteRepo } from '../api.js'

const repos = ref([])
const loading = ref(false)
const error = ref('')
const adding = ref(false)
const addError = ref('')
const addSuccess = ref('')

const newRepo = reactive({ repo_name: '', cf_pages_url: '' })

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

const addRepo = async () => {
  adding.value = true
  addError.value = ''
  addSuccess.value = ''
  try {
    await createRepo({
      repo_name: newRepo.repo_name.trim(),
      cf_pages_url: newRepo.cf_pages_url.trim(),
    })
    addSuccess.value = `Đã thêm repo "${newRepo.repo_name}" thành công.`
    newRepo.repo_name = ''
    newRepo.cf_pages_url = ''
    await load()
  } catch (e) {
    addError.value = e.message
  } finally {
    adding.value = false
  }
}

const removeRepo = async (id) => {
  if (!confirm('Bạn có chắc muốn xóa repo này?')) return
  try {
    await deleteRepo(id)
    await load()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(load)
</script>
