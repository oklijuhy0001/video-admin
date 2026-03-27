import { Hono } from 'hono'
import { query } from '../db'
import { validateFiles, FileInfo } from '../utils/validator'
import { getName } from '../utils/naming'
import { createRepo, initRepo, pushFile, resolveFilename } from '../services/github'
import { createPagesProject, triggerDeploy } from '../services/cloudflare'

const upload = new Hono()

const getOrCreateActiveRepo = async () => {
  const { rows } = await query(
    'SELECT * FROM repos WHERE video_count < 1000 ORDER BY created_at DESC LIMIT 1'
  )
  if (rows.length > 0) return rows[0]

  // Count existing repos to generate unique name
  const { rows: countRows } = await query('SELECT COUNT(*) FROM repos')
  const n = parseInt(countRows[0].count) + 1
  const repoName = `video-store-${n}`
  const projectName = `video-store-${n}`

  console.log(`🆕 Creating new repo: ${repoName}`)
  await createRepo(repoName)
  await initRepo(repoName)

  const { subdomain } = await createPagesProject(projectName, repoName)
  const cfPagesUrl = `https://${subdomain}`

  const { rows: newRows } = await query(
    'INSERT INTO repos (repo_name, cf_pages_url, video_count) VALUES ($1, $2, 0) RETURNING *',
    [repoName, cfPagesUrl]
  )
  console.log(`✅ Repo created: ${repoName} → ${cfPagesUrl}`)
  return newRows[0]
}

upload.post('/', async (c) => {
  const formData = await c.req.formData()
  const rawFiles = formData.getAll('files[]')

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

  const uploaded: { filename: string; cf_url: string; name: string }[] = []

  for (const file of valid) {
    try {
      // Get or create active repo (may switch mid-batch if 1000 is hit)
      const repo = await getOrCreateActiveRepo()

      // Resolve unique filename
      const filename = await resolveFilename(repo.repo_name, file.filename)

      // Get current total to compute name
      const { rows: countRows } = await query('SELECT COUNT(*) FROM videos')
      const total = parseInt(countRows[0].count)
      const name = getName(total)

      // Push to GitHub
      await pushFile(repo.repo_name, filename, file.buffer)

      // Build CF URL
      const cf_url = `${repo.cf_pages_url}/${filename}`

      // Save to DB
      await query('INSERT INTO videos (cf_url, name) VALUES ($1, $2)', [cf_url, name])
      await query('UPDATE repos SET video_count = video_count + 1 WHERE id = $1', [repo.id])

      uploaded.push({ filename, cf_url, name })
      console.log(`✅ Uploaded: ${filename} → ${cf_url}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error'
      errors.push({ filename: file.filename, error: msg })
      console.error(`❌ Upload failed: ${file.filename} — ${msg}`)
    }
  }

  // Trigger Cloudflare deploy for all affected repos
  try {
    const { rows: repoRows } = await query('SELECT DISTINCT repo_name FROM repos ORDER BY created_at DESC LIMIT 5')
    for (const r of repoRows) {
      await triggerDeploy(r.repo_name)
    }
  } catch (err) {
    console.warn('⚠️ triggerDeploy failed:', err)
  }

  return c.json({ success: true, uploaded, errors })
})

export default upload
