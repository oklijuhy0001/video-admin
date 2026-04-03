import { Hono } from 'hono'
import { query } from '../db'
import { validateFiles, FileInfo } from '../utils/validator'
import { getName } from '../utils/naming'
import { pushFile, resolveFilename, ensureDevBranch } from '../services/github'
import { triggerDeploy } from '../services/cloudflare'

const upload = new Hono()

upload.post('/', async (c) => {
  const formData = await c.req.formData()
  const rawFiles = formData.getAll('files[]')
  const repoId = formData.get('repo_id')

  if (!repoId) {
    return c.json({ success: false, error: 'Vui lòng chọn repo trước khi upload' }, 400)
  }

  const parsedId = parseInt(repoId as string)
  if (isNaN(parsedId)) {
    return c.json({ success: false, error: 'repo_id không hợp lệ' }, 400)
  }

  // Get the selected repo
  const { rows: repoRows } = await query('SELECT * FROM repos WHERE id = $1', [parsedId])
  if (repoRows.length === 0) {
    return c.json({ success: false, error: 'Không tìm thấy repo' }, 404)
  }
  const repo = repoRows[0]

  // Check 150 video limit
  if (repo.video_count >= 150) {
    return c.json({ success: false, error: `Repo "${repo.repo_name}" đã đạt giới hạn 150 video. Vui lòng chọn repo khác.` }, 400)
  }

  // Parse files from FormData
  const files: FileInfo[] = []
  for (const f of rawFiles) {
    if (f instanceof File) {
      const buffer = Buffer.from(await f.arrayBuffer())
      files.push({ filename: f.name, size: f.size, type: f.type, buffer })
    }
  }

  const { valid, errors, fatalError } = validateFiles(files)

  if (fatalError) {
    return c.json({ success: false, error: fatalError }, 400)
  }

  // Ensure dev branch exists
  try {
    await ensureDevBranch(repo.repo_name)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return c.json({ success: false, error: `Không thể tạo nhánh dev: ${msg}` }, 500)
  }

  const totalFiles = valid.length

  return c.body(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (data: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
        }

        const uploaded: { filename: string; cf_url: string; name: string }[] = []
        let currentRepo = repo

        for (let i = 0; i < valid.length; i++) {
          const file = valid[i]
          try {
            if (currentRepo.video_count >= 150) {
              errors.push({ filename: file.filename, error: `Repo "${currentRepo.repo_name}" đã đạt giới hạn 150 video` })
              send({ type: 'progress', current: i + 1, total: totalFiles, percent: Math.round(((i + 1) / totalFiles) * 100), filename: file.filename, status: 'error', error: `Repo full` })
              continue
            }

            send({ type: 'progress', current: i + 1, total: totalFiles, percent: Math.round((i / totalFiles) * 100), filename: file.filename, status: 'uploading' })

            const filename = await resolveFilename(currentRepo.repo_name, file.filename)
            const { rows: countRows } = await query('SELECT COUNT(*) FROM videos')
            const total = parseInt(countRows[0].count)
            const name = getName(total)

            await pushFile(currentRepo.repo_name, filename, file.buffer)

            const cf_url = `${currentRepo.cf_pages_url}/${filename}`
            await query('INSERT INTO videos (cf_url, name) VALUES ($1, $2)', [cf_url, name])
            await query('UPDATE repos SET video_count = video_count + 1 WHERE id = $1', [currentRepo.id])
            currentRepo.video_count++

            uploaded.push({ filename, cf_url, name })
            send({ type: 'progress', current: i + 1, total: totalFiles, percent: Math.round(((i + 1) / totalFiles) * 100), filename, status: 'ok' })
            console.log(`✅ Uploaded: ${filename} → ${cf_url}`)
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'unknown error'
            errors.push({ filename: file.filename, error: msg })
            send({ type: 'progress', current: i + 1, total: totalFiles, percent: Math.round(((i + 1) / totalFiles) * 100), filename: file.filename, status: 'error', error: msg })
            console.error(`❌ Upload failed: ${file.filename} — ${msg}`)
          }
        }

        // Trigger Cloudflare deploy
        try {
          await triggerDeploy(currentRepo.repo_name)
        } catch (err) {
          console.warn('⚠️ triggerDeploy failed:', err)
        }

        send({ type: 'done', success: true, uploaded, errors })
        controller.close()
      },
    }),
    {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
      },
    }
  )
})

export default upload
