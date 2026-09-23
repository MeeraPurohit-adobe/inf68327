// ─── State ────────────────────────────────────────────────
let _config = null
let selectedMethod = 'POST'
let rawModeOn = false

// ─── Presets ──────────────────────────────────────────────
const PRESETS = [
  {
    label: 'Ingest Products',
    action: 'ingest-products',
    method: 'POST',
    payload: {}
  },
  {
    label: 'List Products',
    action: 'list-products',
    method: 'GET',
    payload: { page: '1', limit: '10', sortBy: 'title', sortOrder: 'asc' }
  },
  {
    label: 'Product Details',
    action: 'product-details',
    method: 'GET',
    payload: { id: '1' }
  },
  {
    label: 'Signup User',
    action: 'signup',
    method: 'POST',
    payload: { name: 'John Doe', email: 'john@example.com', password: 'test123' }
  },
  {
    label: 'Login',
    action: 'login',
    method: 'POST',
    payload: { email: 'john@example.com', password: 'test123' }
  },
  {
    label: 'Validate Token',
    action: 'validate-token',
    method: 'POST',
    payload: { token: localStorage.getItem('token') || '' }
  },
  {
    label: 'List Users',
    action: 'list-users',
    method: 'GET',
    payload: {}
  },
  {
    label: 'Search Products',
    action: 'list-products',
    method: 'GET',
    payload: {
      search: 'mascara',
      category: 'beauty',
      sortBy: 'price',
      sortOrder: 'asc',
      page: '1',
      limit: '5'
    }
  }
]

// ─── Init ─────────────────────────────────────────────────
async function init() {
  const token = localStorage.getItem('token')

  // Auth guard
  if (!token) {
    window.location.href = 'index.html'
    return
  }

  // Show username
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  document.getElementById('user-name').textContent =
    `Hello, ${user.name || 'Admin'}`

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = 'index.html'
  })

  // Load config.json
  _config = await getConfig()

  // Build action dropdown from config.json
  buildActionDropdown()

  // Build presets
  buildPresets()

  // Add first empty KV row
  addKVRow()

  // Wire up all controls
  wireControls()
}

// ─── Build Action Dropdown from config.json ───────────────
function buildActionDropdown() {
  const select = document.getElementById('action-select')
  const preview = document.getElementById('action-url-preview')

  // Filter out "inf68327/xxx" duplicates — keep short keys only
  const entries = Object.entries(_config).filter(
    ([key]) => !key.includes('/')
  )

  entries.forEach(([key, url]) => {
    const opt = document.createElement('option')
    opt.value = key
    opt.textContent = key
    opt.dataset.url = url
    select.appendChild(opt)
  })

  select.addEventListener('change', () => {
    const selected = select.options[select.selectedIndex]
    if (selected.dataset.url) {
      preview.textContent = selected.dataset.url
      preview.classList.add('has-url')
    } else {
      preview.textContent = 'URL will appear here'
      preview.classList.remove('has-url')
    }
  })
}

// ─── Wire All Controls ────────────────────────────────────
function wireControls() {
  // Method buttons
  document.querySelectorAll('.method-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.method-btn').forEach((b) =>
        b.classList.remove('active')
      )
      btn.classList.add('active')
      selectedMethod = btn.dataset.method

      // Hide payload for GET/DELETE
      const payloadSection = document.getElementById('payload-section')
      payloadSection.style.opacity =
        selectedMethod === 'GET' ? '0.6' : '1'
    })
  })

  // Add KV row
  document.getElementById('btn-add-row').addEventListener('click', () => {
    addKVRow()
  })

  // Clear all rows
  document.getElementById('btn-clear-rows').addEventListener('click', () => {
    document.getElementById('kv-list').innerHTML = ''
    addKVRow()
  })

  // Raw JSON toggle
  document.getElementById('raw-mode-toggle').addEventListener('change', (e) => {
    rawModeOn = e.target.checked
    toggleRawMode(rawModeOn)
  })

  // Paste JSON button → open modal
  document.getElementById('btn-paste-json').addEventListener('click', () => {
    document.getElementById('paste-modal').style.display = 'flex'
    document.getElementById('paste-area').value = ''
    document.getElementById('parse-error').textContent = ''
  })

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal)
  document.getElementById('btn-cancel-paste').addEventListener('click', closeModal)

  // Modal import
  document.getElementById('btn-parse-json').addEventListener('click', () => {
    const raw = document.getElementById('paste-area').value.trim()
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Must be a JSON object {}')
      }
      loadPayloadFromObject(parsed)
      closeModal()
    } catch (err) {
      document.getElementById('parse-error').textContent =
        `${err.message}`
    }
  })

  // Fire button
  document.getElementById('btn-fire').addEventListener('click', fireAction)

  // Reset button
  document.getElementById('btn-reset').addEventListener('click', resetForm)

  // Copy response
  document.getElementById('btn-copy-response').addEventListener('click', () => {
    const text = document.getElementById('response-body').textContent
    navigator.clipboard.writeText(text).then(() => {
      document.getElementById('btn-copy-response').textContent = 'Copied'
      setTimeout(() => {
        document.getElementById('btn-copy-response').textContent = 'Copy'
      }, 2000)
    })
  })
}

// ─── KV Row Management ────────────────────────────────────
function addKVRow(key = '', value = '') {
  const list = document.getElementById('kv-list')

  const row = document.createElement('div')
  row.className = 'kv-row'
  row.innerHTML = `
    <input
      type="text"
      class="kv-key"
      placeholder="key"
      value="${escapeHtml(key)}">
    <span class="kv-sep">:</span>
    <input
      type="text"
      class="kv-value"
      placeholder="value"
      value="${escapeHtml(value)}">
    <button class="kv-remove" title="Remove">✕</button>
  `

  row.querySelector('.kv-remove').addEventListener('click', () => {
    row.remove()
    // Always keep at least one row
    if (document.querySelectorAll('.kv-row').length === 0) {
      addKVRow()
    }
  })

  list.appendChild(row)

  // Focus the key field of the new row
  row.querySelector('.kv-key').focus()
}

function getPayloadFromKV() {
  const payload = {}
  document.querySelectorAll('.kv-row').forEach((row) => {
    const key = row.querySelector('.kv-key').value.trim()
    const val = row.querySelector('.kv-value').value.trim()
    if (key) {
      // Auto-cast numbers and booleans
      if (val === 'true') payload[key] = true
      else if (val === 'false') payload[key] = false
      else if (val !== '' && !isNaN(val)) payload[key] = Number(val)
      else payload[key] = val
    }
  })
  return payload
}

function loadPayloadFromObject(obj) {
  document.getElementById('kv-list').innerHTML = ''
  Object.entries(obj).forEach(([k, v]) => {
    addKVRow(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
  })
}

// ─── Raw JSON Mode ────────────────────────────────────────
function toggleRawMode(on) {
  const kvList = document.getElementById('kv-list')
  const kvActions = document.querySelector('.kv-actions')
  const rawArea = document.getElementById('raw-json')

  if (on) {
    // Convert KV → raw JSON
    const payload = getPayloadFromKV()
    rawArea.value = JSON.stringify(payload, null, 2)
    kvList.style.display = 'none'
    kvActions.style.display = 'none'
    rawArea.style.display = 'block'
  } else {
    // Convert raw JSON → KV
    try {
      const parsed = JSON.parse(rawArea.value || '{}')
      loadPayloadFromObject(parsed)
    } catch {
      // If invalid JSON just keep KV as is
    }
    kvList.style.display = 'block'
    kvActions.style.display = 'flex'
    rawArea.style.display = 'none'
  }
}

// ─── Fire Action ──────────────────────────────────────────
async function fireAction() {
  const select = document.getElementById('action-select')
  const actionKey = select.value

  if (!actionKey) {
    showStatus('Please select an action first', 'error')
    return
  }

  const actionUrl = _config[actionKey]
  if (!actionUrl) {
    showStatus('URL not found in config.json', 'error')
    return
  }

  // Build payload
  let payload = {}
  if (rawModeOn) {
    try {
      payload = JSON.parse(document.getElementById('raw-json').value || '{}')
    } catch {
      showStatus('Invalid JSON in raw editor', 'error')
      return
    }
  } else {
    payload = getPayloadFromKV()
  }

  const token = localStorage.getItem('token')
  const btn = document.getElementById('btn-fire')
  btn.disabled = true
  btn.textContent = 'Running...'
  showStatus('', '')

  const start = Date.now()

  try {
    let url = actionUrl
    let options = {
      method: selectedMethod,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    }

    // For GET — append payload as query params
    // For POST/PUT — send as JSON body
    if (selectedMethod === 'GET' || selectedMethod === 'DELETE') {
      const params = new URLSearchParams(
        Object.entries(payload).map(([k, v]) => [k, String(v)])
      )
      const qs = params.toString()
      if (qs) url = `${url}?${qs}`
    } else {
      options.body = JSON.stringify(payload)
    }

    const res = await fetch(url, options)
    const elapsed = Date.now() - start

    let data
    try {
      data = await res.json()
    } catch {
      data = { raw: await res.text() }
    }

    showResponse(res.status, elapsed, data)
    showStatus(
      res.ok ? `${res.status} OK` : `⚠️ ${res.status}`,
      res.ok ? 'success' : 'warning'
    )
  } catch (err) {
    const elapsed = Date.now() - start
    showResponse(0, elapsed, { error: err.message })
    showStatus('Request failed', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '▶ Run Action'
  }
}

// ─── Show Response ────────────────────────────────────────
function showResponse(status, elapsed, data) {
  const card = document.getElementById('response-card')
  const badge = document.getElementById('res-status-badge')
  const time = document.getElementById('res-time')
  const body = document.getElementById('response-body')

  card.style.display = 'block'

  badge.textContent = status ? `${status}` : 'Error'
  badge.className = `badge ${
    status >= 200 && status < 300
      ? 'badge-success'
      : status >= 400
      ? 'badge-danger'
      : 'badge-warning'
  }`

  time.textContent = `${elapsed}ms`
  body.textContent = JSON.stringify(data, null, 2)

  // Scroll to response
  card.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ─── Quick Presets ────────────────────────────────────────
function buildPresets() {
  const grid = document.getElementById('presets-grid')

  PRESETS.forEach((preset) => {
    const btn = document.createElement('button')
    btn.className = 'preset-btn'
    btn.textContent = preset.label
    btn.addEventListener('click', () => applyPreset(preset))
    grid.appendChild(btn)
  })
}

function applyPreset(preset) {
  // Set action dropdown
  const select = document.getElementById('action-select')
  select.value = preset.action
  select.dispatchEvent(new Event('change'))

  // Set method
  document.querySelectorAll('.method-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.method === preset.method)
  })
  selectedMethod = preset.method

  // Load payload
  if (rawModeOn) {
    document.getElementById('raw-json').value =
      JSON.stringify(preset.payload, null, 2)
  } else {
    loadPayloadFromObject(preset.payload)
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ─── Helpers ──────────────────────────────────────────────
function showStatus(msg, type) {
  const el = document.getElementById('fire-status')
  el.textContent = msg
  el.className = `fire-status ${type}`
}

function closeModal() {
  document.getElementById('paste-modal').style.display = 'none'
}

function resetForm() {
  document.getElementById('action-select').value = ''
  document.getElementById('action-url-preview').textContent =
    'URL will appear here'
  document.getElementById('action-url-preview').classList.remove('has-url')
  document.getElementById('kv-list').innerHTML = ''
  addKVRow()
  document.getElementById('response-card').style.display = 'none'
  document.getElementById('raw-mode-toggle').checked = false
  rawModeOn = false
  toggleRawMode(false)
  selectedMethod = 'POST'
  document.querySelectorAll('.method-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.method === 'POST')
  })
  showStatus('', '')
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

init()