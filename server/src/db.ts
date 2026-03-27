import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  ssl: { rejectUnauthorized: false },
})

pool.on('connect', () => {
  console.log('✅ DB connected')
})

pool.on('error', (err) => {
  console.error('❌ DB error:', err.message)
})

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params)

export default pool
