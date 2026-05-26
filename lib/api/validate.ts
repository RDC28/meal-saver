import { z } from 'zod'
import { err } from './response'

// ─────────────────────────────────────────────────────────────
// Zod request body validator
// Usage:
//   const { data, error } = await validateBody(req, mySchema)
//   if (error) return error   ← returns a NextResponse directly
// ─────────────────────────────────────────────────────────────

type ValidationSuccess<T> = { data: T; error: null }
type ValidationFailure = { data: null; error: Response }

// z.ZodType<T, any, any> (rather than ZodSchema<T>) allows schemas with
// .transform() where the input and output types differ.
export async function validateBody<T>(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<T, any, any>
): Promise<ValidationSuccess<T> | ValidationFailure> {
  let body: unknown

  try {
    body = await req.json()
  } catch {
    return {
      data: null,
      error: err('Request body must be valid JSON', 400, 'INVALID_JSON') as unknown as Response,
    }
  }

  const result = schema.safeParse(body)

  if (!result.success) {
    // Collect all field errors into a readable message
    const message = result.error.errors
      .map((e) => {
        const field = e.path.length > 0 ? `${e.path.join('.')}: ` : ''
        return `${field}${e.message}`
      })
      .join(' | ')

    return {
      data: null,
      error: err(message, 422, 'VALIDATION_ERROR') as unknown as Response,
    }
  }

  return { data: result.data, error: null }
}

// ─────────────────────────────────────────────────────────────
// Validate URL query params
// Usage:
//   const { data, error } = validateParams(req, mySchema)
// ─────────────────────────────────────────────────────────────
export function validateParams<T>(
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<T, any, any>
): ValidationSuccess<T> | ValidationFailure {
  const { searchParams } = new URL(req.url)
  const params = Object.fromEntries(searchParams.entries())

  const result = schema.safeParse(params)

  if (!result.success) {
    const message = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(' | ')

    return {
      data: null,
      error: err(message, 422, 'INVALID_PARAMS') as unknown as Response,
    }
  }

  return { data: result.data, error: null }
}

// ─────────────────────────────────────────────────────────────
// Re-export zod so routes only need one import for validation
// ─────────────────────────────────────────────────────────────
export { z }
