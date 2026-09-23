const ACTION_BASE_URL = 'https://266146-642rosekiwi-stage.adobeioruntime.net/api/v1/web/inf68327'

if (localStorage.getItem('token')) {
  window.location.href = 'plp.html'
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
  document.querySelectorAll('.form-section').forEach((s) => s.classList.remove('active'))
  document.getElementById(`${tab}-tab`).classList.add('active')
  document.getElementById(`${tab}-section`).classList.add('active')
}

window.switchTab = switchTab

// ─── Login ────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value.trim()
  const msg = document.getElementById('login-message')
  const btn = document.getElementById('login-btn')

  msg.textContent = 'Logging in...'
  msg.className = 'message'
  btn.disabled = true

  try {
    const res = await fetch(`${ACTION_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (res.ok) {
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      msg.textContent = 'Login successful! Redirecting...'
      msg.className = 'message success'
      setTimeout(() => { window.location.href = 'plp.html' }, 1000)
    } else {
      msg.textContent = `${data.error || 'Login failed'}`
      msg.className = 'message error'
      btn.disabled = false
    }
  } catch (err) {
    msg.textContent = 'Something went wrong. Please try again.'
    msg.className = 'message error'
    btn.disabled = false
  }
})

// ─── Signup ───────────────────────────────────────────────
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const name = document.getElementById('signup-name').value.trim()
  const email = document.getElementById('signup-email').value.trim()
  const password = document.getElementById('signup-password').value.trim()
  const msg = document.getElementById('signup-message')
  const btn = document.getElementById('signup-btn')

  msg.textContent = '⏳ Creating account...'
  msg.className = 'message'
  btn.disabled = true

  try {
    const res = await fetch(`${ACTION_BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    })

    const data = await res.json()

    if (res.ok) {
      msg.textContent = '✅ Account created! Please login.'
      msg.className = 'message success'
      setTimeout(() => {
        document.getElementById('login-email').value = email
        switchTab('login')
      }, 1500)
    } else {
      msg.textContent = `${data.error || 'Signup failed'}`
      msg.className = 'message error'
      btn.disabled = false
    }
  } catch (err) {
    msg.textContent = 'Something went wrong. Please try again.'
    msg.className = 'message error'
    btn.disabled = false
  }
})
