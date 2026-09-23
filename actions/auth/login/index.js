const { generateAccessToken } = require('@adobe/aio-sdk').Core.AuthClient
const libDb = require('@adobe/aio-lib-db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

async function main(params) {
  let client

  try {
    const { email, password } = params

    if (!email || !password) {
      return {
        statusCode: 400,
        body: { error: 'Email and password are required' }
      }
    }

    // ─── Connect to App Builder DB ────────────────────────
    const token = await generateAccessToken(params)
    const db = await libDb.init({ token: token.access_token, region: params.DB_REGION || 'apac' })
    client = await db.connect()
    const users = await client.collection('users')

    // ─── Find user ────────────────────────────────────────
    let user = null
    try {
      user = await users.findOne({ email })
    } catch (findError) {
      if (findError.message && findError.message.includes('Document not found')) {
        user = null
      } else {
        throw findError
      }
    }

    if (!user) {
      return {
        statusCode: 401,
        body: { error: 'Invalid credentials' }
      }
    }

    // ─── Verify password ──────────────────────────────────
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return {
        statusCode: 401,
        body: { error: 'Invalid credentials' }
      }
    }

    // ─── Generate JWT ─────────────────────────────────────
    const jwtToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      params.JWT_SECRET || 'app-builder-secret',
      { expiresIn: '24h' }
    )

    // ─── Store token in DB ────────────────────────────────
    const tokens = await client.collection('tokens')
    await tokens.insertOne({
      token: jwtToken,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    })

    return {
      statusCode: 200,
      body: {
        token: jwtToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: ''
        }
      }
    }
  } catch (error) {
    console.error('Login error:', error.message)
    if (error.name === 'DbError') {
      return { statusCode: 500, body: { error: `Database error: ${error.message}` } }
    }
    return { statusCode: 500, body: { error: error.message } }
  } finally {
    if (client) await client.close()
  }
}

module.exports = { main }