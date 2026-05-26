import { clerkClient } from '@clerk/nextjs/server'
import { db, users, donor_profiles, receiver_profiles } from '@/lib/db'
import { validateBody, z } from '@/lib/api/validate'
import { created, err, serverError } from '@/lib/api/response'

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

  // ── Donor profile fields (required when role === 'donor')
  business_name:       z.string().min(2).max(100).optional(),
  business_type:       z.enum([
    'restaurant', 'bakery', 'cafe', 'caterer',
    'supermarket', 'vegetable_vendor', 'individual', 'grocery', 'other',
  ]).optional(),
  address:             z.string().min(5).optional(),
  city:                z.string().min(2).optional(),
  food_license_number: z.string().optional(),

  // ── Receiver profile fields (required when role === 'receiver')
  organization_name: z.string().min(2).max(150).optional(),
  organization_type: z.enum([
    'ngo', 'shelter', 'orphanage', 'community_kitchen',
    'animal_shelter', 'feeding_program', 'other',
  ]).optional(),
  service_area_km:  z.number().int().min(1).max(100).optional(),
  accepts_veg:      z.boolean().optional(),
  accepts_non_veg:  z.boolean().optional(),
  accepts_vegan:    z.boolean().optional(),
  accepts_cooked:   z.boolean().optional(),
  accepts_raw:      z.boolean().optional(),
  accepts_packaged: z.boolean().optional(),
  accepts_short_term: z.boolean().optional(),
  accepts_long_term:  z.boolean().optional(),
})

export async function POST(req: Request) {
  try {
    const { data, error } = await validateBody(req, signupSchema)
    if (error) return error

    const clerk = await clerkClient()

    // 1. Create user in Clerk
    let clerkUser
    try {
      clerkUser = await clerk.users.createUser({
        emailAddress: [data.email],
        password: data.password,
        firstName: data.full_name.split(' ')[0],
        lastName: data.full_name.split(' ').slice(1).join(' ') || undefined,
        publicMetadata: { role: data.role },
      })
    } catch (clerkErr: unknown) {
      const clerkError = clerkErr as { errors?: { code?: string; message?: string }[] }
      const code = clerkError?.errors?.[0]?.code ?? ''
      if (
        code === 'form_identifier_exists' ||
        code === 'user_already_exists'
      ) {
        return err('An account with this email already exists', 409, 'EMAIL_TAKEN')
      }
      const message = clerkError?.errors?.[0]?.message ?? 'Failed to create account'
      return err(message, 400, 'AUTH_ERROR')
    }

    // 2. Insert into our Neon users table
    const [newUser] = await db
      .insert(users)
      .values({
        email:     data.email,
        full_name: data.full_name,
        phone:     data.phone ?? null,
        role:      data.role,
        clerk_id:  clerkUser.id,
        is_active: true,
      })
      .returning()

    if (!newUser) {
      await clerk.users.deleteUser(clerkUser.id).catch(() => null)
      return serverError('Account creation failed')
    }

    // 3. Create profile inline — avoids needing an active session
    let profile = null

    if (data.role === 'donor' && data.business_name && data.address && data.city) {
      try {
        const [donorProfile] = await db
          .insert(donor_profiles)
          .values({
            user_id:             newUser.id,
            business_name:       data.business_name,
            business_type:       data.business_type ?? 'restaurant',
            phone:               data.phone ?? null,
            address:             data.address,
            city:                data.city,
            food_license_number: data.food_license_number ?? null,
          })
          .returning()
        profile = donorProfile
      } catch (e) {
        console.error('[POST /api/auth/signup] donor profile creation failed:', e)
        // non-fatal — user can complete profile later
      }
    }

    if (data.role === 'receiver' && data.organization_name && data.address && data.city) {
      try {
        const [receiverProfile] = await db
          .insert(receiver_profiles)
          .values({
            user_id:           newUser.id,
            organization_name: data.organization_name,
            organization_type: data.organization_type ?? 'ngo',
            phone:             data.phone ?? null,
            address:           data.address,
            city:              data.city,
            service_area_km:   data.service_area_km ?? 10,
            accepts_veg:       data.accepts_veg       ?? true,
            accepts_non_veg:   data.accepts_non_veg   ?? false,
            accepts_vegan:     data.accepts_vegan      ?? true,
            accepts_cooked:    data.accepts_cooked     ?? true,
            accepts_raw:       data.accepts_raw        ?? true,
            accepts_packaged:  data.accepts_packaged   ?? true,
            accepts_short_term: data.accepts_short_term ?? true,
            accepts_long_term:  data.accepts_long_term  ?? true,
          })
          .returning()
        profile = receiverProfile
      } catch (e) {
        console.error('[POST /api/auth/signup] receiver profile creation failed:', e)
        // non-fatal — user can complete profile later
      }
    }

    return created({
      user: {
        id:    newUser.id,
        email: newUser.email,
        role:  newUser.role,
      },
      profile,
      message: 'Account created successfully.',
    })
  } catch (e) {
    console.error('[POST /api/auth/signup]', e)
    return serverError()
  }
}
