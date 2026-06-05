import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || 'super-secret-key-for-local-dev-only'
const encodedKey = new TextEncoder().encode(secretKey)

export async function signJWT(payload: any, expiresIn: string | number = '7d') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedKey)
}

export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey)
    return payload
  } catch (error) {
    return null
  }
}
