const token = localStorage.getItem('token')
const app = document.getElementById('app')

async function init() {
  if (!token) {
    app.appendChild(loadTemplate('tmpl-not-logged-in'))
    return
  }

  app.appendChild(renderHeader('plp.html'))
  app.appendChild(loadTemplate('tmpl-pdp-shell'))

  document.getElementById('back-link').addEventListener('click', () => {
    window.location.href = 'plp.html'
  })

  const content = document.getElementById('content')
  const urlParams = new URLSearchParams(window.location.search)
  const productId = urlParams.get('id')

  if (!productId) {
    content.innerHTML = `
      <div class="fetch-error">
        Product not found.
        <br><br>
        <a href="plp.html">Back to Products</a>
      </div>`
    return
  }

  async function fetchProduct(id) {
    try {
      const res = await fetch(`${ACTION_BASE_URL}/product-details?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      renderProduct(data.product)
    } catch (err) {
      content.innerHTML = `
        <div class="fetch-error">
          ${err.message}
          <br><br>
          <a href="plp.html">Back to Products</a>
        </div>`
    }
  }

  function renderProduct(p) {
    const detail = loadTemplate('tmpl-product-detail')
    const images = p.images && p.images.length ? p.images : [p.thumbnail]

    detail.querySelector('#main-image').src = images[0]
    detail.querySelector('#main-image').alt = p.title
    detail.querySelector('#detail-category').textContent = p.category
    detail.querySelector('#detail-title').textContent = p.title
    detail.querySelector('#detail-rating').textContent = `${p.rating} rating`
    detail.querySelector('#detail-price').textContent = `$${p.price}`
    detail.querySelector('#detail-discount').textContent = `${p.discountPercentage}% off`
    detail.querySelector('#detail-description').textContent = p.description

    const thumbnails = detail.querySelector('#thumbnails')
    thumbnails.innerHTML = images.map((img, i) => `
      <img src="${img}" alt="${p.title} ${i + 1}"
        class="${i === 0 ? 'active' : ''}"
        onclick="changeImage(this, '${img}')">
    `).join('')

    const meta = detail.querySelector('#detail-meta')
    const metaItems = [
      { label: 'Brand', value: p.brand || 'N/A' },
      { label: 'Stock', value: `${p.stock} units` },
      { label: 'Availability', value: p.availabilityStatus || 'In Stock' },
      { label: 'Warranty', value: p.warrantyInformation || 'N/A' },
      { label: 'Shipping', value: p.shippingInformation || 'Standard' },
      { label: 'Return Policy', value: p.returnPolicy || 'N/A' }
    ]

    meta.innerHTML = metaItems.map((item) => `
      <div class="meta-row">
        <span class="meta-label">${item.label}</span>
        <span class="meta-value">${item.value}</span>
      </div>
    `).join('')

    detail.querySelector('#add-to-cart').addEventListener('click', () => {
      alert(`"${p.title}" added to cart!`)
    })

    content.innerHTML = ''
    content.appendChild(detail)
  }

  fetchProduct(productId)
}

window.changeImage = (thumb, src) => {
  document.getElementById('main-image').src = src
  document.querySelectorAll('.thumbnails img').forEach((img) => {
    img.classList.remove('active')
  })
  thumb.classList.add('active')
}

init()