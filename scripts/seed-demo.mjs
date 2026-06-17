#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcrypt'

const DEMO_EMAIL_DOMAIN = 'mealsaver.local'
const DEMO_PASSWORD = 'Password123!'
const BENGALURU = {
  donor: { lat: 12.9352, lng: 77.6245 },
  ngo: { lat: 12.9719, lng: 77.6412 },
  closeKitchen: { lat: 12.9398, lng: 77.6257 },
}

const ids = {
  donorUser: '10000000-0000-4000-8000-000000000001',
  ngoUser: '10000000-0000-4000-8000-000000000002',
  dualUser: '10000000-0000-4000-8000-000000000003',
  adminUser: '10000000-0000-4000-8000-000000000004',
  donorProfile: '10000000-0000-4000-8000-000000000101',
  ngoProfile: '10000000-0000-4000-8000-000000000102',
  dualDonorProfile: '10000000-0000-4000-8000-000000000103',
  dualReceiverProfile: '10000000-0000-4000-8000-000000000104',
  availableDonation: '10000000-0000-4000-8000-000000000201',
  pendingDonation: '10000000-0000-4000-8000-000000000202',
  acceptedDonation: '10000000-0000-4000-8000-000000000203',
  assignedDonation: '10000000-0000-4000-8000-000000000204',
  deliveredDonation: '10000000-0000-4000-8000-000000000205',
  expiredDonation: '10000000-0000-4000-8000-000000000206',
  pendingMatch: '10000000-0000-4000-8000-000000000301',
  acceptedMatch: '10000000-0000-4000-8000-000000000302',
  assignedMatch: '10000000-0000-4000-8000-000000000303',
  deliveredMatch: '10000000-0000-4000-8000-000000000304',
  assignedPickup: '10000000-0000-4000-8000-000000000401',
  deliveredPickup: '10000000-0000-4000-8000-000000000402',
  deliveredConfirmation: '10000000-0000-4000-8000-000000000501',
  deliveredImpact: '10000000-0000-4000-8000-000000000601',
  ngoAvailableNotification: '10000000-0000-4000-8000-000000000701',
  ngoPendingNotification: '10000000-0000-4000-8000-000000000702',
  donorDeliveredNotification: '10000000-0000-4000-8000-000000000703',
}

function loadEnvFile(fileName) {
  const filePath = join(process.cwd(), fileName)
  if (!existsSync(filePath)) return false

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key]) continue

    let value = rawValue.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }

  return true
}

if (!process.env.DATABASE_URL) {
  loadEnvFile('.env.local') || loadEnvFile('.env')
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local or export it before running this script.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

function point({ lng, lat }) {
  return `POINT(${lng} ${lat})`
}

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

function hoursAgo(hours) {
  return hoursFromNow(-hours)
}

function daysAgo(days) {
  return hoursFromNow(-days * 24)
}

async function insertUser({ id, email, fullName, phone, role, passwordHash }) {
  await sql`
    INSERT INTO users (id, email, full_name, phone, role, is_active, password_hash, created_at, updated_at)
    VALUES (${id}, ${email}, ${fullName}, ${phone}, CAST(${role} AS user_role), true, ${passwordHash}, now(), now())
  `
}

async function insertDonorProfile({
  id,
  userId,
  businessName,
  businessType,
  phone,
  address,
  city,
  state,
  pincode,
  location,
  foodLicenseNumber,
}) {
  await sql`
    INSERT INTO donor_profiles (
      id, user_id, business_name, business_type, phone, address, city, state, pincode, location,
      food_license_number, verification_status, verified_at, created_at, updated_at
    )
    VALUES (
      ${id}, ${userId}, ${businessName}, CAST(${businessType} AS business_type), ${phone}, ${address},
      ${city}, ${state}, ${pincode}, ST_GeogFromText(${point(location)}), ${foodLicenseNumber},
      'verified', now(), now(), now()
    )
  `
}

async function insertReceiverProfile({
  id,
  userId,
  organizationName,
  organizationType,
  phone,
  address,
  city,
  state,
  pincode,
  location,
  serviceAreaKm,
  maxCapacityKg,
  acceptsNonVeg = false,
}) {
  await sql`
    INSERT INTO receiver_profiles (
      id, user_id, organization_name, organization_type, phone, address, city, state, pincode, location,
      service_area_km, max_capacity_kg, accepts_veg, accepts_non_veg, accepts_vegan,
      accepts_cooked, accepts_raw, accepts_packaged, accepts_short_term, accepts_long_term,
      registration_number, verification_status, verified_at, created_at, updated_at
    )
    VALUES (
      ${id}, ${userId}, ${organizationName}, CAST(${organizationType} AS organization_type), ${phone},
      ${address}, ${city}, ${state}, ${pincode}, ST_GeogFromText(${point(location)}),
      ${serviceAreaKm}, ${maxCapacityKg}, true, ${acceptsNonVeg}, true,
      true, true, true, true, true, ${`REG-${id.slice(-4)}`}, 'verified', now(), now(), now()
    )
  `
}

async function insertDonation({
  id,
  donorId,
  donorProfileId,
  title,
  description,
  foodCategory,
  foodType,
  foodCondition,
  quantityKg,
  quantityDescription,
  servesApprox,
  preparationTime,
  expiryTime,
  preferredPickupTime,
  pickupAddress,
  pickupCity,
  pickupLocation,
  pickupInstructions,
  contactNumber,
  status,
  isUrgent,
  createdAt,
}) {
  await sql`
    INSERT INTO donations (
      id, donor_id, donor_profile_id, title, description, food_category, food_type, food_condition,
      quantity_kg, quantity_description, serves_approx, preparation_time, expiry_time,
      preferred_pickup_time, pickup_address, pickup_city, pickup_location, pickup_instructions,
      contact_number, status, is_urgent, created_at, updated_at
    )
    VALUES (
      ${id}, ${donorId}, ${donorProfileId}, ${title}, ${description}, CAST(${foodCategory} AS food_category),
      CAST(${foodType} AS food_type), CAST(${foodCondition} AS food_condition), ${quantityKg},
      ${quantityDescription}, ${servesApprox}, ${preparationTime}, ${expiryTime}, ${preferredPickupTime},
      ${pickupAddress}, ${pickupCity}, ST_GeogFromText(${point(pickupLocation)}), ${pickupInstructions},
      ${contactNumber}, CAST(${status} AS donation_status), ${isUrgent}, ${createdAt}, now()
    )
  `
}

async function insertReceiverMatch({ id, donationId, receiverId, response, respondedAt = null }) {
  await sql`
    INSERT INTO donation_receiver_notifications (id, donation_id, receiver_id, response, responded_at, notified_at)
    VALUES (${id}, ${donationId}, ${receiverId}, ${response}, ${respondedAt}, now())
  `
}

async function insertPickup({
  id,
  donationId,
  receiverId,
  receiverProfileId,
  pickupStatus,
  scheduledPickupTime,
  actualPickupTime = null,
  otpCode,
  otpVerified,
  pickupNotes,
  assignedAt,
}) {
  await sql`
    INSERT INTO pickup_assignments (
      id, donation_id, receiver_id, receiver_profile_id, pickup_type, pickup_status,
      scheduled_pickup_time, actual_pickup_time, otp_code, otp_verified, pickup_notes, assigned_at, updated_at
    )
    VALUES (
      ${id}, ${donationId}, ${receiverId}, ${receiverProfileId}, 'ngo_pickup', CAST(${pickupStatus} AS pickup_status),
      ${scheduledPickupTime}, ${actualPickupTime}, ${otpCode}, ${otpVerified}, ${pickupNotes}, ${assignedAt}, now()
    )
  `
}

async function insertAppNotification({ id, userId, type, title, message, donationId, data = {}, isRead = false }) {
  await sql`
    INSERT INTO notifications (id, user_id, type, title, message, related_donation_id, data, is_read, created_at)
    VALUES (
      ${id}, ${userId}, CAST(${type} AS notification_type), ${title}, ${message}, ${donationId},
      CAST(${JSON.stringify(data)} AS jsonb), ${isRead}, now()
    )
  `
}

async function clearDemoData() {
  await sql`
    DELETE FROM delivery_confirmations
    WHERE pickup_assignment_id IN (
      SELECT pa.id
      FROM pickup_assignments pa
      LEFT JOIN donations d ON d.id = pa.donation_id
      LEFT JOIN users donor ON donor.id = d.donor_id
      LEFT JOIN users receiver ON receiver.id = pa.receiver_id
      WHERE donor.email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`}
         OR receiver.email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`}
    )
  `
  await sql`
    DELETE FROM impact_reports
    WHERE donation_id IN (
      SELECT d.id
      FROM donations d
      JOIN users u ON u.id = d.donor_id
      WHERE u.email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`}
    )
    OR donor_id IN (SELECT id FROM users WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`})
    OR receiver_id IN (SELECT id FROM users WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`})
  `
  await sql`
    DELETE FROM pickup_assignments
    WHERE donation_id IN (
      SELECT d.id
      FROM donations d
      JOIN users u ON u.id = d.donor_id
      WHERE u.email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`}
    )
    OR receiver_id IN (SELECT id FROM users WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`})
  `
  await sql`
    DELETE FROM donation_receiver_notifications
    WHERE donation_id IN (
      SELECT d.id
      FROM donations d
      JOIN users u ON u.id = d.donor_id
      WHERE u.email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`}
    )
    OR receiver_id IN (SELECT id FROM users WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`})
  `
  await sql`
    DELETE FROM donation_images
    WHERE donation_id IN (
      SELECT d.id
      FROM donations d
      JOIN users u ON u.id = d.donor_id
      WHERE u.email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`}
    )
  `
  await sql`
    DELETE FROM notifications
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`})
    OR related_donation_id IN (
      SELECT d.id
      FROM donations d
      JOIN users u ON u.id = d.donor_id
      WHERE u.email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`}
    )
  `
  await sql`
    DELETE FROM donations
    WHERE donor_id IN (SELECT id FROM users WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`})
  `
  await sql`
    DELETE FROM user_verifications
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`})
  `
  await sql`
    DELETE FROM admin_actions
    WHERE admin_id IN (SELECT id FROM users WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`})
    OR target_id IN (SELECT id FROM users WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`})
    OR target_id IN (
      SELECT d.id
      FROM donations d
      JOIN users u ON u.id = d.donor_id
      WHERE u.email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`}
    )
  `
  await sql`
    DELETE FROM users
    WHERE email LIKE ${`demo.%@${DEMO_EMAIL_DOMAIN}`}
  `
}

async function seed() {
  const databaseHost = new URL(process.env.DATABASE_URL).hostname
  console.log(`Seeding demo data into ${databaseHost}...`)

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS postgis`
  } catch (error) {
    console.warn('Could not create PostGIS extension. Continuing because it may already exist.')
    console.warn(error instanceof Error ? error.message : error)
  }

  await clearDemoData()

  const demoUsers = [
    {
      id: ids.donorUser,
      email: `demo.donor@${DEMO_EMAIL_DOMAIN}`,
      fullName: 'Demo Donor',
      phone: '+91 90000 10001',
      role: 'donor',
    },
    {
      id: ids.ngoUser,
      email: `demo.ngo@${DEMO_EMAIL_DOMAIN}`,
      fullName: 'Demo NGO',
      phone: '+91 90000 10002',
      role: 'receiver',
    },
    {
      id: ids.dualUser,
      email: `demo.dual@${DEMO_EMAIL_DOMAIN}`,
      fullName: 'Demo Dual Role',
      phone: '+91 90000 10003',
      role: 'donor',
    },
    {
      id: ids.adminUser,
      email: `demo.admin@${DEMO_EMAIL_DOMAIN}`,
      fullName: 'Demo Admin',
      phone: '+91 90000 10004',
      role: 'admin',
    },
  ]

  for (const user of demoUsers) {
    await insertUser({ ...user, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) })
  }

  await insertDonorProfile({
    id: ids.donorProfile,
    userId: ids.donorUser,
    businessName: 'Demo Tiffin Kitchen',
    businessType: 'restaurant',
    phone: '+91 90000 20001',
    address: '80 Feet Road, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560095',
    location: BENGALURU.donor,
    foodLicenseNumber: 'FSSAI-DEMO-1001',
  })

  await insertReceiverProfile({
    id: ids.ngoProfile,
    userId: ids.ngoUser,
    organizationName: 'Demo Feeding Foundation',
    organizationType: 'ngo',
    phone: '+91 90000 20002',
    address: '12th Main Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    location: BENGALURU.ngo,
    serviceAreaKm: 12,
    maxCapacityKg: '150.00',
  })

  await insertDonorProfile({
    id: ids.dualDonorProfile,
    userId: ids.dualUser,
    businessName: 'Demo Dual Cafe',
    businessType: 'cafe',
    phone: '+91 90000 20003',
    address: 'Sony World Signal, Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    location: BENGALURU.closeKitchen,
    foodLicenseNumber: 'FSSAI-DEMO-1003',
  })

  await insertReceiverProfile({
    id: ids.dualReceiverProfile,
    userId: ids.dualUser,
    organizationName: 'Demo Dual Relief Trust',
    organizationType: 'community_kitchen',
    phone: '+91 90000 20004',
    address: 'CMH Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    location: BENGALURU.ngo,
    serviceAreaKm: 8,
    maxCapacityKg: '80.00',
  })

  const donationDefaults = {
    donorId: ids.donorUser,
    donorProfileId: ids.donorProfile,
    pickupAddress: 'Demo Tiffin Kitchen, 80 Feet Road, Koramangala, Bengaluru',
    pickupCity: 'Bengaluru',
    pickupLocation: BENGALURU.donor,
    contactNumber: '+91 90000 20001',
  }

  await insertDonation({
    ...donationDefaults,
    id: ids.availableDonation,
    title: 'Dal Rice Dinner Trays',
    description: 'Fresh vegetarian dal, steamed rice, and mixed vegetable curry packed in clean trays.',
    foodCategory: 'short_term',
    foodType: 'veg',
    foodCondition: 'cooked',
    quantityKg: '18.50',
    quantityDescription: '5 trays, around 55 servings',
    servesApprox: 55,
    preparationTime: hoursAgo(1),
    expiryTime: hoursFromNow(5),
    preferredPickupTime: hoursFromNow(2),
    pickupInstructions: 'Ask for the evening donation batch at the billing counter.',
    status: 'available',
    isUrgent: true,
    createdAt: hoursAgo(1),
  })

  await insertDonation({
    ...donationDefaults,
    id: ids.pendingDonation,
    title: 'Packed Fruit and Sandwich Kits',
    description: 'Individually packed banana, apple, and vegetable sandwich kits from a corporate event.',
    foodCategory: 'short_term',
    foodType: 'veg',
    foodCondition: 'packaged',
    quantityKg: '10.00',
    quantityDescription: '35 sealed snack kits',
    servesApprox: 35,
    preparationTime: hoursAgo(2),
    expiryTime: hoursFromNow(8),
    preferredPickupTime: hoursFromNow(3),
    pickupInstructions: 'Security desk has the donation cartons ready.',
    status: 'pending_acceptance',
    isUrgent: false,
    createdAt: hoursAgo(2),
  })

  await insertDonation({
    ...donationDefaults,
    id: ids.acceptedDonation,
    title: 'Bakery Bread Loaves',
    description: 'Packed whole wheat loaves and dinner rolls, safe for next-day distribution.',
    foodCategory: 'long_term',
    foodType: 'vegan',
    foodCondition: 'packaged',
    quantityKg: '14.00',
    quantityDescription: '28 wrapped loaves',
    servesApprox: 80,
    preparationTime: hoursAgo(4),
    expiryTime: hoursFromNow(28),
    preferredPickupTime: hoursFromNow(4),
    pickupInstructions: 'Use the rear bakery entrance.',
    status: 'accepted',
    isUrgent: false,
    createdAt: hoursAgo(4),
  })

  await insertDonation({
    ...donationDefaults,
    id: ids.assignedDonation,
    title: 'Vegetable Pulao Lunch Boxes',
    description: 'Sealed lunch boxes with vegetable pulao and curd from today noon service.',
    foodCategory: 'short_term',
    foodType: 'veg',
    foodCondition: 'cooked',
    quantityKg: '22.00',
    quantityDescription: '70 sealed lunch boxes',
    servesApprox: 70,
    preparationTime: hoursAgo(3),
    expiryTime: hoursFromNow(4),
    preferredPickupTime: hoursFromNow(1),
    pickupInstructions: 'Pickup from loading bay. Boxes are stacked by donation ID.',
    status: 'pickup_assigned',
    isUrgent: true,
    createdAt: hoursAgo(3),
  })

  await insertDonation({
    ...donationDefaults,
    id: ids.deliveredDonation,
    title: 'Paneer Wraps',
    description: 'Delivered demo donation used to populate NGO history and impact totals.',
    foodCategory: 'short_term',
    foodType: 'veg',
    foodCondition: 'cooked',
    quantityKg: '16.00',
    quantityDescription: '48 wraps',
    servesApprox: 48,
    preparationTime: daysAgo(1),
    expiryTime: hoursAgo(12),
    preferredPickupTime: hoursAgo(18),
    pickupInstructions: 'Completed demo pickup.',
    status: 'delivered',
    isUrgent: false,
    createdAt: daysAgo(1),
  })

  await insertDonation({
    ...donationDefaults,
    id: ids.expiredDonation,
    title: 'Yesterday Salad Bowls',
    description: 'Expired demo row for admin and donor status views.',
    foodCategory: 'short_term',
    foodType: 'veg',
    foodCondition: 'raw',
    quantityKg: '6.00',
    quantityDescription: '20 salad bowls',
    servesApprox: 20,
    preparationTime: daysAgo(2),
    expiryTime: daysAgo(1),
    preferredPickupTime: daysAgo(1),
    pickupInstructions: 'Expired demo donation.',
    status: 'expired',
    isUrgent: false,
    createdAt: daysAgo(2),
  })

  await insertReceiverMatch({
    id: ids.pendingMatch,
    donationId: ids.pendingDonation,
    receiverId: ids.ngoUser,
    response: 'no_response',
  })
  await insertReceiverMatch({
    id: ids.acceptedMatch,
    donationId: ids.acceptedDonation,
    receiverId: ids.ngoUser,
    response: 'accepted',
    respondedAt: hoursAgo(3),
  })
  await insertReceiverMatch({
    id: ids.assignedMatch,
    donationId: ids.assignedDonation,
    receiverId: ids.ngoUser,
    response: 'accepted',
    respondedAt: hoursAgo(2),
  })
  await insertReceiverMatch({
    id: ids.deliveredMatch,
    donationId: ids.deliveredDonation,
    receiverId: ids.ngoUser,
    response: 'accepted',
    respondedAt: daysAgo(1),
  })

  await insertPickup({
    id: '10000000-0000-4000-8000-000000000403',
    donationId: ids.acceptedDonation,
    receiverId: ids.ngoUser,
    receiverProfileId: ids.ngoProfile,
    pickupStatus: 'assigned',
    scheduledPickupTime: hoursFromNow(2),
    pickupNotes: 'Accepted demo donation ready for pickup.',
    assignedAt: hoursAgo(2),
  })

  await insertPickup({
    id: ids.assignedPickup,
    donationId: ids.assignedDonation,
    receiverId: ids.ngoUser,
    receiverProfileId: ids.ngoProfile,
    pickupStatus: 'assigned',
    scheduledPickupTime: hoursFromNow(1),
    otpCode: '428613',
    otpVerified: false,
    pickupNotes: 'Driver should carry insulated bags.',
    assignedAt: hoursAgo(1),
  })

  await insertPickup({
    id: ids.deliveredPickup,
    donationId: ids.deliveredDonation,
    receiverId: ids.ngoUser,
    receiverProfileId: ids.ngoProfile,
    pickupStatus: 'completed',
    scheduledPickupTime: hoursAgo(18),
    actualPickupTime: hoursAgo(17),
    otpCode: '913204',
    otpVerified: true,
    pickupNotes: 'Completed demo pickup.',
    assignedAt: daysAgo(1),
  })

  await sql`
    INSERT INTO delivery_confirmations (
      id, pickup_assignment_id, donation_id, receiver_id, quantity_received_kg, food_condition_on_arrival,
      is_food_safe, receiver_notes, confirmed_at
    )
    VALUES (
      ${ids.deliveredConfirmation}, ${ids.deliveredPickup}, ${ids.deliveredDonation}, ${ids.ngoUser},
      '15.50', 'Good condition',
      true, 'Food was distributed at the evening community meal.', ${hoursAgo(16)}
    )
  `

  await sql`
    INSERT INTO impact_reports (
      id, donation_id, donor_id, receiver_id, meals_saved, food_waste_reduced_kg, co2_impact_kg,
      people_served, receiver_confirmed, donor_report_generated, report_generated_at, created_at
    )
    VALUES (
      ${ids.deliveredImpact}, ${ids.deliveredDonation}, ${ids.donorUser}, ${ids.ngoUser}, 48,
      '15.50', '39.68', 48, true, true, ${hoursAgo(16)}, ${hoursAgo(16)}
    )
    ON CONFLICT (donation_id) DO UPDATE SET
      donor_id = EXCLUDED.donor_id,
      receiver_id = EXCLUDED.receiver_id,
      meals_saved = EXCLUDED.meals_saved,
      food_waste_reduced_kg = EXCLUDED.food_waste_reduced_kg,
      co2_impact_kg = EXCLUDED.co2_impact_kg,
      people_served = EXCLUDED.people_served,
      receiver_confirmed = EXCLUDED.receiver_confirmed,
      donor_report_generated = EXCLUDED.donor_report_generated,
      report_generated_at = EXCLUDED.report_generated_at
  `

  await insertAppNotification({
    id: ids.ngoAvailableNotification,
    userId: ids.ngoUser,
    type: 'donation_available',
    title: 'Nearby donation available',
    message: 'Dal Rice Dinner Trays is within your 12 km service radius.',
    donationId: ids.availableDonation,
    data: { distance_km: 4.4 },
  })
  await insertAppNotification({
    id: ids.ngoPendingNotification,
    userId: ids.ngoUser,
    type: 'donation_available',
    title: 'Matched donation awaiting response',
    message: 'Packed Fruit and Sandwich Kits is ready for NGO confirmation.',
    donationId: ids.pendingDonation,
    data: { match_status: 'no_response' },
  })
  await insertAppNotification({
    id: ids.donorDeliveredNotification,
    userId: ids.donorUser,
    type: 'delivery_confirmed',
    title: 'Donation delivered',
    message: 'Paneer Wraps reached Demo Feeding Foundation and served 48 people.',
    donationId: ids.deliveredDonation,
    data: { meals_saved: 48 },
    isRead: true,
  })

  console.log('')
  console.log('Demo seed complete.')
  console.log(`Password for every demo account: ${DEMO_PASSWORD}`)
  console.log('')
  console.table([
    { role: 'Donor', email: `demo.donor@${DEMO_EMAIL_DOMAIN}` },
    { role: 'NGO', email: `demo.ngo@${DEMO_EMAIL_DOMAIN}` },
    { role: 'Donor + NGO tabs', email: `demo.dual@${DEMO_EMAIL_DOMAIN}` },
    { role: 'Admin', email: `demo.admin@${DEMO_EMAIL_DOMAIN}` },
  ])
}

seed().catch((error) => {
  console.error('Demo seed failed.')
  console.error(error)
  process.exit(1)
})
