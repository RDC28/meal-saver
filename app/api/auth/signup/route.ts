import { auth, clerkClient } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import { db, users, donor_profiles, receiver_profiles } from '@/lib/db'
import { validateBody, z } from '@/lib/api/validate'
import { created, err, ok, serverError } from '@/lib/api/response'

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

    const clerk = await clerkClient()
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
        })
        .returning()

      return { profile: createdProfile, alreadyExists: false }
    }

    async function ensureRoleProfile(userId: string) {
      return payload.role === 'donor'
        ? ensureDonorProfile(userId)
        : ensureReceiverProfile(userId)
    }

    let clerkUserId: string | null = null
    let accountId: string | null = null
    let accountRole: 'donor' | 'receiver' | 'admin' | 'delivery_partner' = payload.role
    let usingExistingAccount = false

    try {
      const clerkUser = await clerk.users.createUser({
        emailAddress: [normalizedEmail],
        password: data.password,
        firstName: payload.full_name.split(' ')[0],
        lastName: payload.full_name.split(' ').slice(1).join(' ') || undefined,
        publicMetadata: { role: payload.role },
      })
      clerkUserId = clerkUser.id
    } catch (clerkErr: unknown) {
      const clerkError = clerkErr as { errors?: { code?: string; message?: string }[] }
      const code = clerkError?.errors?.[0]?.code ?? ''

      if (code === 'form_identifier_exists' || code === 'user_already_exists') {
        const { userId: signedInClerkId } = await auth()
        if (!signedInClerkId) {
          return err(
            'This email already exists. Sign in first, then register the second role.',
            409,
            'EMAIL_EXISTS_SIGN_IN_REQUIRED'
          )
        }

        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.clerk_id, signedInClerkId))

        if (!existingUser) {
          return err('Account setup incomplete. Please sign up again.', 401, 'ACCOUNT_INCOMPLETE')
        }

        if (existingUser.email.toLowerCase() !== normalizedEmail) {
          return err(
            'You are signed in with a different email. Use the same email account to add another role.',
            403,
            'EMAIL_MISMATCH'
          )
        }

        usingExistingAccount = true
        accountId = existingUser.id
        accountRole = existingUser.role
        clerkUserId = existingUser.clerk_id ?? signedInClerkId
      } else {
        const message = clerkError?.errors?.[0]?.message ?? 'Failed to create account'
        return err(message, 400, 'AUTH_ERROR')
      }
    }

    if (!usingExistingAccount) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: normalizedEmail,
          full_name: payload.full_name,
          phone: normalizedPhone,
          role: payload.role,
          clerk_id: clerkUserId,
          is_active: true,
        })
        .returning()

      if (!newUser) {
        if (clerkUserId) await clerk.users.deleteUser(clerkUserId).catch(() => null)
        return serverError('Account creation failed')
      }

      accountId = newUser.id
      accountRole = newUser.role
    }

    if (!accountId) return serverError('Account creation failed')

    const profileResult = await ensureRoleProfile(accountId)
    if ('errorResponse' in profileResult) return profileResult.errorResponse

    const { profile, alreadyExists } = profileResult

    if (accountRole !== payload.role) {
      await db
        .update(users)
        .set({
          role: payload.role,
          full_name: payload.full_name,
          phone: normalizedPhone,
        })
        .where(eq(users.id, accountId))

      if (clerkUserId) {
        await clerk.users
          .updateUser(clerkUserId, { publicMetadata: { role: payload.role } })
          .catch(() => null)
      }
    }

    const responseData = {
      user: {
        id: accountId,
        email: normalizedEmail,
        role: payload.role,
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
