<template>
  <div class="card">
    <h2>⬆ Upload Video</h2>
    <p style="color:#666;font-size:13px;margin-bottom:16px;">
      Tối đa <strong>10 file</strong>, mỗi file ≤ <strong>25MB</strong>. Định dạng: mp4, webm, mov, avi.
    </p>

    <!-- Repo Selector -->
    <div style="margin-bottom:16px;">
      <label style="display:block;font-weight:600;margin-bottom:6px;">Chọn Repo:</label>
      <select
        v-model="selectedRepoId"
        :disabled="loadingRepos"
        style="width:100%;max-width:500px;padding:8px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;"
      >
        <option value="" disabled>{{ loadingRepos ? 'Đang tải...' : '-- Chọn repo --' }}</option>
        <option
          v-for="r in repos"
          :key="r.id"
          :value="r.id"
          :disabled="r.video_count >= 150"
        >
          {{ r.repo_name }} ({{ r.video_count }}/150) {{ r.video_count >= 150 ? '- FULL' : '' }}
        </option>
      </select>
      <div v-if="repos.length === 0 && !loadingRepos" style="color:#c00;font-size:13px;margin-top:4px;">
        Chưa có repo nào. Vui lòng thêm repo trong tab Repos trước.
      </div>
      <div v-if="selectedRepo && selectedRepo.video_count >= 150" class="alert alert-error" style="margin-top:8px;">
        Repo "{{ selectedRepo.repo_name }}" đã đạt giới hạn 150 video.
      </div>
    </div>

    <div class="file-input-area" @click="triggerInput" @dragover.prevent @drop.prevent="onDrop">
      <div style="font-size:32px;">📂</div>
      <p>Kéo thả file vào đây hoặc <strong>click để chọn</strong></p>
      <input ref="inputRef" type="file" accept="video/*" multiple style="display:none" @change="onFileChange" />
    </div>

    <!-- Overall Progress -->
    <div v-if="uploading" class="progress-container">
      <div class="progress-header">
        <span>Tiến trình tổng: {{ currentFile }}/{{ totalFiles }} file</span>
        <span class="progress-percent">{{ overallPercent }}%</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: overallPercent + '%' }"></div>
      </div>
    </div>

    <div v-if="fileList.length" class="file-list">
      <div v-for="(f, i) in fileList" :key="i" class="file-item">
        <span class="fname">{{ f.file.name }}</span>
        <span class="fsize">{{ fmtSize(f.file.size) }}</span>
        <span v-if="f.status === 'uploading' && f.percent > 0" class="file-percent">{{ f.percent }}%</span>
        <span :class="['file-status', f.status]">{{ statusLabel(f) }}</span>
        <button v-if="f.status === 'pending'" @click="removeFile(i)" style="padding:2px 8px;font-size:12px;">✕</button>
      </div>
    </div>

    <div v-if="fatalError" class="alert alert-error">{{ fatalError }}</div>
    <div v-if="successCount" class="alert alert-success">✅ Đã upload thành công {{ successCount }} file.</div>

    <div class="toolbar" style="margin-top:8px;">
      <button class="btn-primary" @click="doUpload" :disabled="uploading || !pendingFiles.length || !selectedRepoId">
        {{ uploading ? '⏳ Đang upload...' : '▶ Upload' }}
      </button>
      <button class="btn-danger" @click="clearAll" :disabled="uploading">✖ Xóa hết</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { uploadFiles, getRepos } from '../api.js'

const MAX_FILES = 10
const MAX_SIZE = 25 * 1024 * 1024

const inputRef = ref(null)
const fileList = ref([])
const uploading = ref(false)
const fatalError = ref('')
const successCount = ref(0)

const repos = ref([])
const selectedRepoId = ref('')
const loadingRepos = ref(false)

const currentFile = ref(0)
const totalFiles = ref(0)
const overallPercent = ref(0)

const selectedRepo = computed(() => repos.value.find(r => r.id === selectedRepoId.value))
const pendingFiles = computed(() => fileList.value.filter(f => f.status === 'pending'))

const loadRepos = async () => {
  loadingRepos.value = true
  try {
    repos.value = await getRepos()
    const available = repos.value.find(r => r.video_count < 150)
    if (available) selectedRepoId.value = available.id
  } catch {
    // ignore
  } finally {
    loadingRepos.value = false
  }
}

onMounted(loadRepos)

const triggerInput = () => inputRef.value?.click()

const addFiles = (newFiles) => {
  fatalError.value = ''
  successCount.value = 0
  for (const file of newFiles) {
    if (fileList.value.length >= MAX_FILES) {
      fatalError.value = `Tối đa ${MAX_FILES} file.`
      break
    }
    if (file.size > MAX_SIZE) {
      fileList.value.push({ file, status: 'error', error: 'Vượt 25MB', percent: 0 })
    } else {
      fileList.value.push({ file, status: 'pending', error: '', percent: 0 })
    }
  }
}

const onFileChange = (e) => addFiles(Array.from(e.target.files || []))
const onDrop = (e) => addFiles(Array.from(e.dataTransfer.files || []))
const removeFile = (i) => fileList.value.splice(i, 1)
const clearAll = () => { fileList.value = []; fatalError.value = ''; successCount.value = 0; overallPercent.value = 0; currentFile.value = 0; totalFiles.value = 0 }

const fmtSize = (b) => b > 1024 * 1024
  ? `${(b / 1024 / 1024).toFixed(1)}MB`
  : `${(b / 1024).toFixed(0)}KB`

const statusLabel = (f) => {
  if (f.status === 'pending') return 'Chờ'
  if (f.status === 'uploading') return f.percent > 0 ? `⏳ ${f.percent}%` : '⏳ Đang upload'
  if (f.status === 'ok') return '✅ Xong'
  if (f.status === 'error') return `❌ ${f.error}`
  return ''
}

const onProgress = (data) => {
  currentFile.value = data.current
  totalFiles.value = data.total
  overallPercent.value = data.percent

  const item = fileList.value.find(
    f => f.file.name === data.filename || data.filename?.endsWith(f.file.name)
  )
  if (item) {
    if (data.status === 'uploading') {
      item.status = 'uploading'
      item.percent = data.percent
    } else if (data.status === 'ok') {
      item.status = 'ok'
      item.percent = 100
    } else if (data.status === 'error') {
      item.status = 'error'
      item.error = data.error || 'Lỗi'
    }
  }
}

const doUpload = async () => {
  if (!selectedRepoId.value) {
    fatalError.value = 'Vui lòng chọn repo trước khi upload.'
    return
  }

  const pending = fileList.value.filter(f => f.status === 'pending')
  if (!pending.length) return
  uploading.value = true
  fatalError.value = ''
  successCount.value = 0
  overallPercent.value = 0
  currentFile.value = 0
  totalFiles.value = pending.length

  pending.forEach(f => { f.status = 'uploading'; f.percent = 0 })

  const formData = new FormData()
  formData.append('repo_id', selectedRepoId.value)
  pending.forEach(f => formData.append('files[]', f.file))

  try {
    const res = await uploadFiles(formData, onProgress)
    successCount.value = res.uploaded?.length || 0
    await loadRepos()
  } catch (e) {
    fatalError.value = e.message
    for (const f of fileList.value) {
      if (f.status === 'uploading') { f.status = 'error'; f.error = 'Lỗi mạng' }
    }
  } finally {
    uploading.value = false
    overallPercent.value = 100
  }
}
</script>
