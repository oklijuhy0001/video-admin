import { Hono } from 'hono'
import { query } from '../db'

const repos = new Hono()

repos.get('/', async (c) => {
  const { rows } = await query('SELECT * FROM repos ORDER BY created_at DESC')
  return c.json(rows)
})

export default repos
