import 'dotenv/config'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { loadNames } from './utils/naming'
import health from './routes/health'
import repos from './routes/repos'
import videos from './routes/videos'
import upload from './routes/upload'
import auth from './routes/auth'

// Load names from data/*.txt at startup
loadNames()

const app = new Hono()

app.use('*', cors())

// Auth middleware - protect API routes only, allow static files
app.use('/api/*', async (c, next) => {
  const path = c.req.path

  // Allow auth routes and upload
  if (path.startsWith('/api/auth') || path.startsWith('/api/upload')) {
    return next()
  }

  // Check for auth token
  const token = c.req.header('Authorization')
  if (!token || token !== 'Bearer authenticated') {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return next()
})

// Auth routes
app.route('/api/auth', auth)

// API routes (must be before static)
app.route('/health', health)
app.route('/api/repos', repos)
app.route('/api/videos', videos)
app.route('/api/upload', upload)

// Serve Vue 3 build
app.use('/*', serveStatic({ root: '../client/dist' }))

// SPA fallback
app.get('/*', serveStatic({ path: '../client/dist/index.html' }))

const port = parseInt(process.env.PORT || '3000')
console.log(`🚀 video-admin server running on port ${port}`)

serve({ fetch: app.fetch, port })
