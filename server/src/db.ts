import { Pool } from 'pg'

const sslConfig: any = {
  rejectUnauthorized: true,
}

if (process.env.CA_CERT_BASE64) {
  sslConfig.ca = Buffer.from(process.env.CA_CERT_BASE64, 'base64').toString()
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  ssl: sslConfig,
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