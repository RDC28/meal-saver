import { NextResponse } from 'next/server'

// ─────────────────────────────────────────────────────────────
// Standard API response shapes — every route returns one of these
// ─────────────────────────────────────────────────────────────

type ApiSuccess<T> = {
  data: T
  error: null
}

type ApiError = {
  data: null
  error: {
    message: string
    code: string
  }
}

// ── Success responses
export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>(
    { data, error: null },
    { status }
  )
}

export function created<T>(data: T) {
  return NextResponse.json<ApiSuccess<T>>(
    { data, error: null },
    { status: 201 }
  )
}

// ── Error responses
export function err(message: string, status = 400, code = 'BAD_REQUEST') {
  return NextResponse.json<ApiError>(
    { data: null, error: { message, code } },
    { status }
  )
}

// ── Common error shortcuts
export const unauthorized = (msg = 'You must be logged in') =>
  err(msg, 401, 'UNAUTHORIZED')

export const forbidden = (msg = 'You do not have permission') =>
  err(msg, 403, 'FORBIDDEN')

export const notFound = (resource = 'Resource') =>
  err(`${resource} not found`, 404, 'NOT_FOUND')

export const conflict = (msg: string) =>
  err(msg, 409, 'CONFLICT')

export const serverError = (msg = 'Something went wrong. Please try again.') =>
  err(msg, 500, 'SERVER_ERROR')
