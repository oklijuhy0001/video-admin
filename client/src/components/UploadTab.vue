<template>
  <div class="card">
    <h2>⬆ Upload Video</h2>
    <p style="color:#666;font-size:13px;margin-bottom:16px;">
      Tối đa <strong>10 file</strong>, mỗi file ≤ <strong>25MB</strong>. Định dạng: mp4, webm, mov, avi.
    </p>

    <div class="file-input-area" @click="triggerInput" @dragover.prevent @drop.prevent="onDrop">
      <div style="font-size:32px;">📂</div>
      <p>Kéo thả file vào đây hoặc <strong>click để chọn</strong></p>
      <input ref="inputRef" type="file" accept="video/*" multiple style="display:none" @change="onFileChange" />
    </div>

    <div v-if="fileList.length" class="file-list">
      <div v-for="(f, i) in fileList" :key="i" class="file-item">
        <span class="fname">{{ f.file.name }}</span>
        <span class="fsize">{{ fmtSize(f.file.size) }}</span>
        <span :class="['file-status', f.status]">{{ statusLabel(f) }}</span>
        <button v-if="f.status === 'pending'" @click="removeFile(i)" style="padding:2px 8px;font-size:12px;">✕</button>
      </div>
    </div>

    <div v-if="fatalError" class="alert alert-error">{{ fatalError }}</div>
    <div v-if="successCount" class="alert alert-success">✅ Đã upload thành công {{ successCount }} file.</div>

    <div class="toolbar" style="margin-top:8px;">
      <button class="btn-primary" @click="doUpload" :disabled="uploading || !pendingFiles.length">
        {{ uploading ? '⏳ Đang upload...' : '▶ Upload' }}
      </button>
      <button class="btn-danger" @click="clearAll" :disabled="uploading">✖ Xóa hết</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { uploadFiles } from '../api.js'

const MAX_FILES = 10
const MAX_SIZE = 25 * 1024 * 1024

const inputRef = ref(null)
const fileList = ref([])
const uploading = ref(false)
const fatalError = ref('')
const successCount = ref(0)

const pendingFiles = computed(() => fileList.value.filter(f => f.status === 'pending'))

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
      fileList.value.push({ file, status: 'error', error: 'Vượt 25MB' })
    } else {
      fileList.value.push({ file, status: 'pending', error: '' })
    }
  }
}

const onFileChange = (e) => addFiles(Array.from(e.target.files || []))
const onDrop = (e) => addFiles(Array.from(e.dataTransfer.files || []))
const removeFile = (i) => fileList.value.splice(i, 1)
const clearAll = () => { fileList.value = []; fatalError.value = ''; successCount.value = 0 }

const fmtSize = (b) => b > 1024 * 1024
  ? `${(b / 1024 / 1024).toFixed(1)}MB`
  : `${(b / 1024).toFixed(0)}KB`

const statusLabel = (f) => {
  if (f.status === 'pending') return 'Chờ'
  if (f.status === 'uploading') return '⏳ Đang upload'
  if (f.status === 'ok') return '✅ Xong'
  if (f.status === 'error') return `❌ ${f.error}`
  return ''
}

const doUpload = async () => {
  const pending = fileList.value.filter(f => f.status === 'pending')
  if (!pending.length) return
  uploading.value = true
  fatalError.value = ''
  successCount.value = 0

  const formData = new FormData()
  pending.forEach(f => { formData.append('files[]', f.file); f.status = 'uploading' })

  try {
    const res = await uploadFiles(formData)
    for (const item of fileList.value) {
      if (item.status !== 'uploading') continue
      const uploaded = res.uploaded?.find(u => u.filename === item.file.name || u.filename.endsWith(item.file.name))
      const errored = res.errors?.find(e => e.filename === item.file.name)
      if (uploaded) { item.status = 'ok' }
      else if (errored) { item.status = 'error'; item.error = errored.error }
      else { item.status = 'ok' }
    }
    successCount.value = res.uploaded?.length || 0
  } catch (e) {
    fatalError.value = e.message
    for (const f of fileList.value) {
      if (f.status === 'uploading') { f.status = 'error'; f.error = 'Lỗi mạng' }
    }
  } finally {
    uploading.value = false
  }
}
</script>
