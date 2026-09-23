const { generateAccessToken } = require('@adobe/aio-sdk').Core.AuthClient
const libDb = require('@adobe/aio-lib-db')

async function main(params) {
  let client

  try {
    const { id } = params

    if (!id) {
      return {
        statusCode: 400,
        body: { error: 'Product ID is required' }
      }
    }

    // ─── Connect to App Builder DB ────────────────────────
    const token = await generateAccessToken(params)
    const db = await libDb.init({ token: token.access_token, region: params.DB_REGION || 'apac' })
    client = await db.connect()
    const products = await client.collection('products')

    // ─── Find product ─────────────────────────────────────
    let product = null
    try {
      product = await products.findOne({ id: Number(id) })
    } catch (findError) {
      if (findError.message && findError.message.includes('Document not found')) {
        product = null
      } else {
        throw findError
      }
    }

    if (!product) {
      return {
        statusCode: 404,
        body: { error: 'Product not found' }
      }
    }

    return {
      statusCode: 200,
      body: { product }
    }
  } catch (error) {
    console.error('Product details error:', error.message)
    if (error.name === 'DbError') {
      return { statusCode: 500, body: { error: `Database error: ${error.message}` } }
    }
    return { statusCode: 500, body: { error: error.message } }
  } finally {
    if (client) await client.close()
  }
}

module.exports = { main }