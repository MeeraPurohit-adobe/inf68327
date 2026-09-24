const ACTION_BASE_URL = 'https://266146-642rosekiwi-stage.adobeioruntime.net/api/v1/web/inf68327'

// ─── Redirect if already logged in ───────────────────────
if (localStorage.getItem('token')) {
  window.location.href = 'plp.html'
}

// ─── Password rules (must match backend exactly) ─────────
const PASSWORD_RULES = [
  {
    id: 'min-length',
    label: 'At least 8 characters',
    test: (p) => p.length >= 8
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter (A-Z)',
    test: (p) => /[A-Z]/.test(p)
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter (a-z)',
    test: (p) => /[a-z]/.test(p)
  },
  {
    id: 'number',
    label: 'At least one number (0-9)',
    test: (p) => /[0-9]/.test(p)
  },
  {
    id: 'special',
    label: 'At least one special character (!@#$%^&*)',
    test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p)
  }
]

function validatePassword(password) {
  return PASSWORD_RULES.filter((rule) => !rule.test(password))
}

function isPasswordValid(password) {
  return validatePassword(password).length === 0
}

// ─── Tab switcher ─────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.remove('active')
  )
  document.querySelectorAll('.form-section').forEach((s) =>
    s.classList.remove('active')
  )
  document.getElementById(`${tab}-tab`).classList.add('active')
  document.getElementById(`${tab}-section`).classList.add('active')
}

window.switchTab = switchTab

// ══════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════
const loginPasswordInput = document.getElementById('login-password')
const loginPasswordError = document.getElementById('login-password-error')

// Show validation error on blur (when user leaves the field)
loginPasswordInput.addEventListener('blur', () => {
  const password = loginPasswordInput.value.trim()
  if (!password) return

  const failed = validatePassword(password)
  if (failed.length > 0) {
    loginPasswordError.innerHTML = failed.map((r) =>
      `<span class="rule-fail">✕ ${r.label}</span>`
    ).join('')
    loginPasswordError.style.display = 'block'
    loginPasswordInput.classList.add('input-error')
  } else {
    loginPasswordError.style.display = 'none'
    loginPasswordInput.classList.remove('input-error')
    loginPasswordInput.classList.add('input-success')
  }
})

// Clear error on focus
loginPasswordInput.addEventListener('focus', () => {
  loginPasswordError.style.display = 'none'
  loginPasswordInput.classList.remove('input-error', 'input-success')
})

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('login-email').value.trim()
  const password = loginPasswordInput.value.trim()
  const msg = document.getElementById('login-message')
  const btn = document.getElementById('login-btn')

  // ─── Frontend validation ──────────────────────────────
  if (!email || !password) {
    msg.textContent = 'Email and password are required'
    msg.className = 'message error'
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    msg.textContent = 'Please enter a valid email address'
    msg.className = 'message error'
    return
  }

  const failedRules = validatePassword(password)
  if (failedRules.length > 0) {
    msg.innerHTML = `
      <strong>Password does not meet requirements:</strong>
      <ul class="error-list">
        ${failedRules.map((r) => `<li>✕ ${r.label}</li>`).join('')}
      </ul>`
    msg.className = 'message error'
    return
  }

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
      msg.textContent = '✅ Login successful! Redirecting...'
      msg.className = 'message success'
      setTimeout(() => {
        window.location.href = 'plp.html'
      }, 1000)
    } else {
      // Show backend error + details if any
      if (data.details && data.details.length > 0) {
        msg.innerHTML = `
          <strong>${data.error}</strong>
          <ul class="error-list">
            ${data.details.map((d) => `<li>✕ ${d}</li>`).join('')}
          </ul>`
      } else {
        msg.textContent = data.error || 'Login failed'
      }
      msg.className = 'message error'
      btn.disabled = false
    }
  } catch (err) {
    msg.textContent = 'Something went wrong. Please try again.'
    msg.className = 'message error'
    btn.disabled = false
  }
})

// ══════════════════════════════════════════════════════════
// SIGNUP
// ══════════════════════════════════════════════════════════
const signupPasswordInput = document.getElementById('signup-password')
const signupConfirmInput = document.getElementById('signup-confirm-password')
const strengthBar = document.getElementById('password-strength-bar')
const strengthText = document.getElementById('password-strength-text')
const rulesContainer = document.getElementById('password-rules')

// ─── Build rules checklist ────────────────────────────────
function buildRulesUI() {
  rulesContainer.innerHTML = PASSWORD_RULES.map((rule) => `
    <div class="rule-item" id="rule-${rule.id}">
      <span class="rule-icon">○</span>
      <span class="rule-text">${rule.label}</span>
    </div>
  `).join('')
}

// ─── Update rules checklist live ─────────────────────────
function updateRulesUI(password) {
  PASSWORD_RULES.forEach((rule) => {
    const el = document.getElementById(`rule-${rule.id}`)
    if (!el) return
    const passed = rule.test(password)
    el.querySelector('.rule-icon').textContent = passed ? '✓' : '○'
    el.classList.toggle('rule-pass', passed)
    el.classList.toggle('rule-fail-item', !passed && password.length > 0)
  })
}

// ─── Password strength calculator ────────────────────────
function getStrength(password) {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length
  const total = PASSWORD_RULES.length

  if (password.length === 0) return { level: 0, label: '', color: '' }
  if (passed <= 1) return { level: 1, label: 'Very Weak', color: '#ef4444' }
  if (passed === 2) return { level: 2, label: 'Weak',      color: '#f97316' }
  if (passed === 3) return { level: 3, label: 'Fair',      color: '#eab308' }
  if (passed === 4) return { level: 4, label: 'Strong',    color: '#22c55e' }
  if (passed === total) return { level: 5, label: 'Very Strong', color: '#16a34a' }
  return { level: passed, label: 'Fair', color: '#eab308' }
}

// ─── Live password input feedback ────────────────────────
signupPasswordInput.addEventListener('input', () => {
  const password = signupPasswordInput.value

  // Update rules checklist
  updateRulesUI(password)

  // Update strength bar
  const strength = getStrength(password)
  const pct = (strength.level / PASSWORD_RULES.length) * 100

  strengthBar.style.width = `${pct}%`
  strengthBar.style.background = strength.color
  strengthText.textContent = strength.label
  strengthText.style.color = strength.color

  // Check confirm match if already typed
  if (signupConfirmInput.value) {
    checkConfirmMatch()
  }
})

// ─── Confirm password match ───────────────────────────────
function checkConfirmMatch() {
  const password = signupPasswordInput.value
  const confirm = signupConfirmInput.value
  const error = document.getElementById('confirm-password-error')

  if (!confirm) {
    error.style.display = 'none'
    signupConfirmInput.classList.remove('input-error', 'input-success')
    return
  }

  if (password !== confirm) {
    error.textContent = '✕ Passwords do not match'
    error.style.display = 'block'
    signupConfirmInput.classList.add('input-error')
    signupConfirmInput.classList.remove('input-success')
  } else {
    error.style.display = 'none'
    signupConfirmInput.classList.remove('input-error')
    signupConfirmInput.classList.add('input-success')
  }
}

signupConfirmInput.addEventListener('input', checkConfirmMatch)

// ─── Signup submit ────────────────────────────────────────
document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault()

  const name = document.getElementById('signup-name').value.trim()
  const email = document.getElementById('signup-email').value.trim()
  const password = signupPasswordInput.value.trim()
  const confirm = signupConfirmInput.value.trim()
  const msg = document.getElementById('signup-message')
  const btn = document.getElementById('signup-btn')

  // ─── Frontend validation ──────────────────────────────
  if (!name || !email || !password || !confirm) {
    msg.textContent = 'All fields are required'
    msg.className = 'message error'
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    msg.textContent = 'Please enter a valid email address'
    msg.className = 'message error'
    return
  }

  const failedRules = validatePassword(password)
  if (failedRules.length > 0) {
    msg.innerHTML = `
      <strong>Password does not meet requirements:</strong>
      <ul class="error-list">
        ${failedRules.map((r) => `<li>✕ ${r.label}</li>`).join('')}
      </ul>`
    msg.className = 'message error'
    return
  }

  if (password !== confirm) {
    msg.textContent = 'Passwords do not match'
    msg.className = 'message error'
    return
  }

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
        btn.disabled = false
      }, 1500)
    } else {
      if (data.details && data.details.length > 0) {
        msg.innerHTML = `
          <strong>${data.error}</strong>
          <ul class="error-list">
            ${data.details.map((d) => `<li>✕ ${d}</li>`).join('')}
          </ul>`
      } else {
        msg.textContent = data.error || 'Signup failed'
      }
      msg.className = 'message error'
      btn.disabled = false
    }
  } catch (err) {
    msg.textContent = 'Something went wrong. Please try again.'
    msg.className = 'message error'
    btn.disabled = false
  }
})

// ─── Init ──────────────────────────────────────────────────
buildRulesUI()