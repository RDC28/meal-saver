import { eq } from 'drizzle-orm'
import * as bcrypt from 'bcrypt'
import { db, users, donor_profiles, receiver_profiles } from '@/lib/db'
import { validateBody, z } from '@/lib/api/validate'
import { created, err, ok, serverError } from '@/lib/api/response'
import { setSessionCookie } from '@/lib/auth/session'

const signupSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
  full_name: z
    .string({ required_error: 'Full name is required' })
    .min(2, 'Name must be at least 2 characters')
    .max(100),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Invalid phone number format')
    .optional(),
  role: z.enum(['donor', 'receiver'], {
    required_error: 'Role is required',
    invalid_type_error: 'Role must be donor or receiver',
  }),

  // Donor profile fields
  business_name: z.string().min(2).max(100).optional(),
  business_type: z.enum([
    'restaurant', 'bakery', 'cafe', 'caterer',
    'supermarket', 'vegetable_vendor', 'individual', 'grocery', 'other',
  ]).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  food_license_number: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Receiver profile fields
  organization_name: z.string().min(2).max(150).optional(),
  organization_type: z.enum([
    'ngo', 'shelter', 'orphanage', 'community_kitchen',
    'animal_shelter', 'feeding_program', 'other',
  ]).optional(),
  service_area_km: z.number().int().min(1).max(100).optional(),
  accepts_veg: z.boolean().optional(),
  accepts_non_veg: z.boolean().optional(),
  accepts_vegan: z.boolean().optional(),
  accepts_cooked: z.boolean().optional(),
  accepts_raw: z.boolean().optional(),
  accepts_packaged: z.boolean().optional(),
  accepts_short_term: z.boolean().optional(),
  accepts_long_term: z.boolean().optional(),
})

type ProfileResult =
  | { profile: unknown; alreadyExists: boolean }
  | { errorResponse: Response }

export async function POST(req: Request) {
  try {
    const { data, error } = await validateBody(req, signupSchema)
    if (error || !data) return error ?? err('Invalid request body', 400, 'INVALID_BODY')
    const payload = data

    const normalizedEmail = payload.email.trim().toLowerCase()
    const normalizedPhone = payload.phone ?? null

    async function ensureDonorProfile(userId: string): Promise<ProfileResult> {
      const [existing] = await db
        .select()
        .from(donor_profiles)
        .where(eq(donor_profiles.user_id, userId))

      if (existing) return { profile: existing, alreadyExists: true }

      if (!payload.business_name || !payload.address || !payload.city) {
        return {
          errorResponse: err(
            'business_name, address, and city are required to register as donor',
            400,
            'PROFILE_FIELDS_REQUIRED'
          ),
        }
      }

      const location =
        payload.latitude != null && payload.longitude != null
          ? `POINT(${payload.longitude} ${payload.latitude})`
          : undefined

      const [createdProfile] = await db
        .insert(donor_profiles)
        .values({
          user_id: userId,
          business_name: payload.business_name,
          business_type: payload.business_type ?? 'restaurant',
          phone: normalizedPhone,
          address: payload.address,
          city: payload.city,
          food_license_number: payload.food_license_number ?? null,
          location,
        })
        .returning()

      return { profile: createdProfile, alreadyExists: false }
    }

    async function ensureReceiverProfile(userId: string): Promise<ProfileResult> {
      const [existing] = await db
        .select()
        .from(receiver_profiles)
        .where(eq(receiver_profiles.user_id, userId))

      if (existing) return { profile: existing, alreadyExists: true }

      if (!payload.organization_name || !payload.address || !payload.city) {
        return {
          errorResponse: err(
            'organization_name, address, and city are required to register as NGO',
            400,
            'PROFILE_FIELDS_REQUIRED'
          ),
        }
      }

      const location =
        payload.latitude != null && payload.longitude != null
          ? `POINT(${payload.longitude} ${payload.latitude})`
          : undefined

      const [createdProfile] = await db
        .insert(receiver_profiles)
        .values({
          user_id: userId,
          organization_name: payload.organization_name,
          organization_type: payload.organization_type ?? 'ngo',
          phone: normalizedPhone,
          address: payload.address,
          city: payload.city,
          service_area_km: payload.service_area_km ?? 10,
          accepts_veg: payload.accepts_veg ?? true,
          accepts_non_veg: payload.accepts_non_veg ?? false,
          accepts_vegan: payload.accepts_vegan ?? true,
          accepts_cooked: payload.accepts_cooked ?? true,
          accepts_raw: payload.accepts_raw ?? true,
          accepts_packaged: payload.accepts_packaged ?? true,
          accepts_short_term: payload.accepts_short_term ?? true,
          accepts_long_term: payload.accepts_long_term ?? true,
          location,
        })
        .returning()

      return { profile: createdProfile, alreadyExists: false }
    }

    async function ensureRoleProfile(userId: string) {
      return payload.role === 'donor'
        ? ensureDonorProfile(userId)
        : ensureReceiverProfile(userId)
    }

    let accountId: string | null = null
    let accountRole: 'donor' | 'receiver' | 'admin' | 'delivery_partner' = payload.role
    let usingExistingAccount = false

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))

    if (existingUser) {
      // User exists, check password to allow adding a new role profile
      const isPasswordValid = await bcrypt.compare(payload.password, existingUser.password_hash ?? '')
      if (!isPasswordValid) {
        return err('This email already exists. Enter the correct password to add another role.', 401, 'INVALID_PASSWORD')
      }
      usingExistingAccount = true
      accountId = existingUser.id
      accountRole = existingUser.role
    } else {
      const hashedPassword = await bcrypt.hash(payload.password, 10)
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          full_name: payload.full_name,
          phone: normalizedPhone,
          role: payload.role,
          password_hash: hashedPassword,
          is_active: true,
        })
        .returning()

      if (!newUser) {
        return serverError('Account creation failed')
      }

      accountId = newUser.id
      accountRole = newUser.role
    }

    if (!accountId) return serverError('Account creation failed')

    const profileResult = await ensureRoleProfile(accountId)
    if ('errorResponse' in profileResult) return profileResult.errorResponse

    const { profile, alreadyExists } = profileResult

    if (usingExistingAccount) {
      // Promote the account's current role to the one just registered, so the
      // post-signup redirect — and any later bare /login — resolve to the new
      // role's dashboard instead of the original one. Without this, adding an
      // NGO role to a donor account left role='donor', so the user kept landing
      // on the donor dashboard.
      accountRole = payload.role
      await db
        .update(users)
        .set({
          full_name: payload.full_name,
          phone: normalizedPhone,
          role: payload.role,
        })
        .where(eq(users.id, accountId))
    }

    // Set JWT Session Cookie
    await setSessionCookie({ userId: accountId, role: accountRole })

    const responseData = {
      user: {
        id: accountId,
        email: normalizedEmail,
        role: accountRole,
        added_role: payload.role,
      },
      profile,
      message:
        usingExistingAccount
          ? (alreadyExists
              ? `Already registered as ${payload.role === 'donor' ? 'donor' : 'NGO'}.`
              : `Added ${payload.role === 'donor' ? 'donor' : 'NGO'} role to your existing account.`)
          : 'Account created successfully.',
    }

    if (usingExistingAccount || alreadyExists) return ok(responseData)
    return created(responseData)
  } catch (e) {
    console.error('[POST /api/auth/signup]', e)
    return serverError()
  }
}
