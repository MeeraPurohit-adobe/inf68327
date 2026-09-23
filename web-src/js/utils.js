const ACTION_BASE_URL = 'https://266146-642rosekiwi-stage.adobeioruntime.net/api/v1/web/inf68327'

// ─── Load config.json ─────────────────────────────────────
let _config = null

async function getConfig() {
  if (_config) return _config

  try {
    const res = await fetch('./src/config.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    _config = await res.json()
    console.log('✅ config.json loaded:', Object.keys(_config))
    return _config
  } catch (err) {
    console.warn('⚠️ config.json fetch failed, using fallback:', err.message)

    // ─── Fallback: build from ACTION_BASE_URL ─────────────
    _config = {
      'generic':          `${ACTION_BASE_URL}/generic`,
      'events':           `${ACTION_BASE_URL}/events`,
      'signup':           `${ACTION_BASE_URL}/signup`,
      'login':            `${ACTION_BASE_URL}/login`,
      'validate-token':   `${ACTION_BASE_URL}/validate-token`,
      'ingest-products':  `${ACTION_BASE_URL}/ingest-products`,
      'list-products':    `${ACTION_BASE_URL}/list-products`,
      'product-details':  `${ACTION_BASE_URL}/product-details`,
    }

    return _config
  }
}

// ─── Get action URL by key ────────────────────────────────
// Usage: const url = await getActionUrl('login')
async function getActionUrl(actionName) {
  const config = await getConfig()
  const url = config[actionName]
  if (!url) throw new Error(`Action not found in config: ${actionName}`)
  return url
}

// ─── Template loader ──────────────────────────────────────
function loadTemplate(id) {
  const template = document.getElementById(id)
  if (!template) throw new Error(`Template not found: #${id}`)
  return document.importNode(template.content, true)
}

// ─── Render header ────────────────────────────────────────
function renderHeader(logoHref) {
  const header = loadTemplate('tmpl-header')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  header.querySelector('#logo').addEventListener('click', () => {
    window.location.href = logoHref || 'plp.html'
  })

  header.querySelector('#user-name').textContent = user.name || 'User'

  header.querySelector('#logout-btn').addEventListener('click', () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = 'index.html'
  })

  return header
}