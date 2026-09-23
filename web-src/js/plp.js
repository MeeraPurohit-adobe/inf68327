const token = localStorage.getItem('token')
const app = document.getElementById('app')

function init() {
  if (!token) {
    app.appendChild(loadTemplate('tmpl-not-logged-in'))
    return
  }

  app.appendChild(renderHeader('plp.html'))
  app.appendChild(loadTemplate('tmpl-controls'))

  let currentPage = 1
  let searchTimeout = null

  async function fetchProducts() {
    const search = document.getElementById('search').value.trim()
    const category = document.getElementById('category').value
    const sort = document.getElementById('sort').value
    const limit = document.getElementById('limit').value
    const [sortBy, sortOrder] = sort.split('-')
    const grid = document.getElementById('products-grid')

    grid.innerHTML = '<div class="loading">Loading products...</div>'

    try {
      const params = new URLSearchParams({
        search,
        category,
        sortBy,
        sortOrder,
        page: currentPage,
        limit
      })

      const res = await fetch(`${ACTION_BASE_URL}/list-products?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.categories && data.categories.length) {
        const select = document.getElementById('category')
        while (select.options.length > 1) select.remove(1)
        data.categories.forEach((cat) => {
          const option = document.createElement('option')
          option.value = cat
          option.textContent = cat
          select.appendChild(option)
        })
      }

      document.getElementById('results-count').textContent =
        `${data.total} products found`

      renderProducts(data.products)
      renderPagination(data.total, data.totalPages)
    } catch (err) {
      grid.innerHTML = `<div class="fetch-error">${err.message}</div>`
    }
  }

  function renderProducts(products) {
    const grid = document.getElementById('products-grid')

    if (!products || !products.length) {
      grid.innerHTML = '<div class="no-products">No products found.</div>'
      return
    }

    grid.innerHTML = products.map((p) => `
      <div class="product-card" onclick="window.location.href='pdp.html?id=${p.id}'">
        <img src="${p.thumbnail}" alt="${p.title}" loading="lazy">
        <div class="product-info">
          <span class="product-category">${p.category}</span>
          <div class="product-name">${p.title}</div>
          <div class="product-price">$${p.price}</div>
          <div class="product-rating">⭐ ${p.rating} · ${p.stock} in stock</div>
        </div>
      </div>
    `).join('')
  }

  function renderPagination(total, totalPages) {
    const pagination = document.getElementById('pagination')

    if (totalPages <= 1) {
      pagination.innerHTML = ''
      return
    }

    let html = `
      <button class="page-btn"
        onclick="changePage(${currentPage - 1})"
        ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>
    `

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        html += `
          <button class="page-btn ${i === currentPage ? 'active' : ''}"
            onclick="changePage(${i})">${i}</button>`
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        html += `<span>...</span>`
      }
    }

    html += `
      <button class="page-btn"
        onclick="changePage(${currentPage + 1})"
        ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>
    `

    pagination.innerHTML = html
  }

  window.changePage = (page) => {
    currentPage = page
    fetchProducts()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  document.getElementById('search').addEventListener('input', () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      currentPage = 1
      fetchProducts()
    }, 500)
  })

  document.getElementById('category').addEventListener('change', () => {
    currentPage = 1
    fetchProducts()
  })

  document.getElementById('sort').addEventListener('change', () => {
    currentPage = 1
    fetchProducts()
  })

  document.getElementById('limit').addEventListener('change', () => {
    currentPage = 1
    fetchProducts()
  })

  fetchProducts()
}

init()