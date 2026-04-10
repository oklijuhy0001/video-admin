import { Hono } from 'hono'
import { query } from '../db'

const repos = new Hono()

repos.get('/', async (c) => {
  const { rows } = await query('SELECT * FROM repos ORDER BY created_at DESC')
  return c.json(rows)
})

repos.post('/', async (c) => {
  const body = await c.req.json()
  const { repo_name, cf_pages_url } = body

  if (!repo_name || !cf_pages_url) {
    return c.json({ error: 'repo_name và cf_pages_url là bắt buộc' }, 400)
  }

  // Check if repo_name already exists
  const { rows: existing } = await query(
    'SELECT id FROM repos WHERE repo_name = $1',
    [repo_name]
  )
  if (existing.length > 0) {
    return c.json({ error: 'Repo name đã tồn tại' }, 400)
  }

  const { rows } = await query(
    'INSERT INTO repos (repo_name, cf_pages_url, video_count) VALUES ($1, $2, 0) RETURNING *',
    [repo_name, cf_pages_url]
  )

  return c.json(rows[0], 201)
})

repos.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ error: 'ID không hợp lệ' }, 400)
  }

  const { rows } = await query('SELECT id FROM repos WHERE id = $1', [id])
  if (rows.length === 0) {
    return c.json({ error: 'Không tìm thấy repo' }, 404)
  }

  await query('DELETE FROM repos WHERE id = $1', [id])
  return c.json({ success: true })
})

export default repos
