const { generateAccessToken } = require('@adobe/aio-sdk').Core.AuthClient
const libDb = require('@adobe/aio-lib-db')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

async function main(params) {
  let client

  try {
    const { name, email, password } = params

    // ─── Validate ─────────────────────────────────────────
    if (!name || !email || !password) {
      return {
        statusCode: 400,
        body: { error: 'Name, email and password are required' }
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        body: { error: 'Invalid email format' }
      }
    }

    if (password.length < 6) {
      return {
        statusCode: 400,
        body: { error: 'Password must be at least 6 characters' }
      }
    }

    // ─── Connect to App Builder DB ────────────────────────
    const token = await generateAccessToken(params)
    const db = await libDb.init({ token: token.access_token, region: params.DB_REGION || 'apac' })
    client = await db.connect()
    const users = await client.collection('users')

    // ─── Check existing user ──────────────────────────────
    let existingUser = null
    try {
      existingUser = await users.findOne({ email })
    } catch (findError) {
      if (findError.message && findError.message.includes('Document not found')) {
        existingUser = null
      } else {
        throw findError
      }
    }

    if (existingUser) {
      return {
        statusCode: 409,
        body: { error: 'User already exists with this email' }
      }
    }

    // ─── Hash password ────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10)

    // ─── Create user ──────────────────────────────────────
    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    }

    await users.insertOne(user)

    return {
      statusCode: 201,
      body: {
        message: 'Account created successfully',
        user: { id: user.id, name: user.name, email: user.email }
      }
    }
  } catch (error) {
    console.error('Signup error:', error.message)
    if (error.name === 'DbError') {
      return { statusCode: 500, body: { error: `Database error: ${error.message}` } }
    }
    return { statusCode: 500, body: { error: error.message } }
  } finally {
    if (client) await client.close()
  }
}

module.exports = { main }