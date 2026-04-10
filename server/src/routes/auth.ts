import { Hono } from 'hono'
import { query } from '../db'

const app = new Hono()

app.post('/login', async (c) => {
  try {
    const { password } = await c.req.json()

    if (!password) {
      return c.json({ error: 'Password is required' }, 400)
    }

    // Check password against database
    const result = await query('SELECT password FROM admin_password WHERE id = 1')

    if (result.rows.length === 0) {
      return c.json({ error: 'No password configured' }, 500)
    }

    const storedPassword = result.rows[0].password

    if (password === storedPassword) {
      return c.json({ success: true, message: 'Login successful' })
    } else {
      return c.json({ error: 'Invalid password' }, 401)
    }
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
