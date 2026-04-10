<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Video Admin</h2>
      <p class="subtitle">Please enter password</p>
      <form @submit.prevent="handleLogin">
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          :disabled="loading"
        />
        <button type="submit" :disabled="loading">
          {{ loading ? '...' : 'Login' }}
        </button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['login'])

const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!password.value) return

  loading.value = true
  error.value = ''

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value }),
    })

    const data = await res.json()

    if (!res.ok) {
      error.value = data.error || 'Login failed'
      return
    }

    localStorage.setItem('auth', JSON.stringify({ token: 'authenticated', expires: Date.now() + 7 * 24 * 60 * 60 * 1000 }))
    emit('login')
  } catch (e) {
    error.value = 'Error connecting'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #1a1a2e;
}

.login-box {
  background: #16213e;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  width: 300px;
}

h2 {
  color: #fff;
  margin: 0 0 0.5rem;
}

.subtitle {
  color: #888;
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #333;
  border-radius: 6px;
  background: #0f0f1a;
  color: #fff;
  font-size: 1rem;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #4a90d9;
}

button {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  background: #4a90d9;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

button:hover:not(:disabled) {
  background: #357abd;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: #ff6b6b;
  margin-top: 1rem;
  font-size: 0.9rem;
}
</style>
