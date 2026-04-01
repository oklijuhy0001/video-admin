import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  ssl: process.env.CA_CERT_BASE64 ? {
    ca: Buffer.from(process.env.CA_CERT_BASE64, 'base64').toString(),
    rejectUnauthorized: true,
  } : undefined,
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
