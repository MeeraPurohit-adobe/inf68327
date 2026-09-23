const { generateAccessToken } = require('@adobe/aio-sdk').Core.AuthClient
const libDb = require('@adobe/aio-lib-db')
const jwt = require('jsonwebtoken')

async function main(params) {
  let client

  try {
    const { token: userToken } = params

    if (!userToken) {
      return {
        statusCode: 400,
        body: { error: 'Token is required' }
      }
    }

    // ─── Verify JWT signature ─────────────────────────────
    let decoded
    try {
      decoded = jwt.verify(userToken, params.JWT_SECRET || 'app-builder-secret')
    } catch (jwtErr) {
      return {
        statusCode: 401,
        body: { error: 'Invalid or expired token' }
      }
    }

    // ─── Connect to App Builder DB ────────────────────────
    const accessToken = await generateAccessToken(params)
    const db = await libDb.init({ token: accessToken.access_token, region: params.DB_REGION || 'apac' })
    client = await db.connect()
    const tokens = await client.collection('tokens')

    // ─── Find token in DB ─────────────────────────────────
    let storedToken = null
    try {
      storedToken = await tokens.findOne({ token: userToken })
    } catch (findError) {
      if (findError.message && findError.message.includes('Document not found')) {
        storedToken = null
      } else {
        throw findError
      }
    }

    if (!storedToken) {
      return {
        statusCode: 401,
        body: { error: 'Token not found or revoked' }
      }
    }

    // ─── Check expiry ─────────────────────────────────────
    if (new Date(storedToken.expiresAt) < new Date()) {
      return {
        statusCode: 401,
        body: { error: 'Token has expired' }
      }
    }

    return {
      statusCode: 200,
      body: {
        valid: true,
        user: {
          id: decoded.id,
          name: decoded.name,
          email: decoded.email
        }
      }
    }
  } catch (error) {
    console.error('Validate token error:', error.message)
    if (error.name === 'DbError') {
      return { statusCode: 500, body: { error: `Database error: ${error.message}` } }
    }
    return { statusCode: 500, body: { error: error.message } }
  } finally {
    if (client) await client.close()
  }
}

module.exports = { main }