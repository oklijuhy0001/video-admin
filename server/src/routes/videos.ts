import { Hono } from 'hono'
import { query } from '../db'

const videos = new Hono()

videos.get('/', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20')))
  const search = c.req.query('search') || ''
  const offset = (page - 1) * limit

  let countSql = 'SELECT COUNT(*) FROM videos'
  let dataSql = 'SELECT * FROM videos'
  const params: unknown[] = []

  if (search) {
    countSql += ' WHERE name ILIKE $1'
    dataSql += ' WHERE name ILIKE $1'
    params.push(`%${search}%`)
  }

  dataSql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`

  const [countRes, dataRes] = await Promise.all([
    query(countSql, search ? [params[0]] : []),
    query(dataSql, [...params, limit, offset]),
  ])

  return c.json({
    videos: dataRes.rows,
    total: parseInt(countRes.rows[0].count),
    page,
    limit,
  })
})

export default videos
