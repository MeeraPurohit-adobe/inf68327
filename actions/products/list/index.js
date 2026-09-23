const { generateAccessToken } = require('@adobe/aio-sdk').Core.AuthClient
const libDb = require('@adobe/aio-lib-db')

async function main(params) {
  let client

  try {
    const {
      search = '',
      category = '',
      sortBy = 'title',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = params

    // ─── Connect to App Builder DB ────────────────────────
    const token = await generateAccessToken(params)
    const db = await libDb.init({ token: token.access_token, region: params.DB_REGION || 'apac' })
    client = await db.connect()
    const products = await client.collection('products')

    // ─── Fetch all products ───────────────────────────────
    let allProducts = []
    try {
      allProducts = await products.find({}).toArray()
    } catch (findError) {
      if (findError.message && findError.message.includes('Document not found')) {
        allProducts = []
      } else {
        throw findError
      }
    }

    // ─── Get unique categories (before filtering) ─────────
    const categories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))]

    // ─── Search filter (in-memory) ────────────────────────
    if (search) {
      const s = search.toLowerCase()
      allProducts = allProducts.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(s)) ||
          (p.description && p.description.toLowerCase().includes(s))
      )
    }

    // ─── Category filter ──────────────────────────────────
    if (category) {
      allProducts = allProducts.filter((p) => p.category === category)
    }

    // ─── Total count after filtering ─────────────────────
    const total = allProducts.length

    // ─── Sort (in-memory) ─────────────────────────────────
    allProducts.sort((a, b) => {
      const valA = a[sortBy] !== undefined ? a[sortBy] : ''
      const valB = b[sortBy] !== undefined ? b[sortBy] : ''

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }

      return 0
    })

    // ─── Pagination (in-memory) ───────────────────────────
    const pageNum = Number(page)
    const limitNum = Number(limit)
    const skip = (pageNum - 1) * limitNum
    const result = allProducts.slice(skip, skip + limitNum)

    return {
      statusCode: 200,
      body: {
        products: result,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
        categories
      }
    }
  } catch (error) {
    console.error('List products error:', error.message)
    if (error.name === 'DbError') {
      return { statusCode: 500, body: { error: `Database error: ${error.message}` } }
    }
    return { statusCode: 500, body: { error: error.message } }
  } finally {
    if (client) await client.close()
  }
}

module.exports = { main }