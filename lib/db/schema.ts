import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  pgEnum,
  customType,
  unique,
} from 'drizzle-orm/pg-core'

// ─────────────────────────────────────────────────────────────
// Custom geography type (PostGIS)
// ─────────────────────────────────────────────────────────────
const geography = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'geography(POINT, 4326)'
  },
})

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', [
  'donor',
  'receiver',
  'admin',
  'delivery_partner',
])

export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'verified',
  'rejected',
  'suspended',
])

export const donationStatusEnum = pgEnum('donation_status', [
  'available',
  'pending_acceptance',
  'accepted',
  'pickup_assigned',
  'picked_up',
  'delivered',
  'expired',
  'cancelled',
  'rejected',
  'unsafe',
])

export const foodTypeEnum = pgEnum('food_type', ['veg', 'non_veg', 'vegan'])

export const foodConditionEnum = pgEnum('food_condition', [
  'cooked',
  'raw',
  'packaged',
])

export const foodCategoryEnum = pgEnum('food_category', [
  'short_term',
  'long_term',
])

export const pickupTypeEnum = pgEnum('pickup_type', [
  'ngo_pickup',
  'donor_dropoff',
  'delivery_partner',
])

export const pickupStatusEnum = pgEnum('pickup_status', [
  'assigned',
  'in_progress',
  'verified',
  'completed',
  'failed',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'donation_available',
  'donation_accepted',
  'donation_rejected',
  'pickup_assigned',
  'pickup_completed',
  'delivery_confirmed',
  'donation_expired',
  'verification_update',
  'general',
])

export const businessTypeEnum = pgEnum('business_type', [
  'restaurant',
  'bakery',
  'cafe',
  'caterer',
  'supermarket',
  'vegetable_vendor',
  'individual',
  'grocery',
  'other',
])

export const organizationTypeEnum = pgEnum('organization_type', [
  'ngo',
  'shelter',
  'orphanage',
  'community_kitchen',
  'animal_shelter',
  'feeding_program',
  'other',
])

// ─────────────────────────────────────────────────────────────
// Tables
// ─────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:         uuid('id').primaryKey().defaultRandom(),
  email:      text('email').notNull().unique(),
  full_name:  text('full_name'),
  phone:      text('phone'),
  avatar_url: text('avatar_url'),
  role:       userRoleEnum('role').notNull().default('donor'),
  is_active:  boolean('is_active').notNull().default(true),
  clerk_id:   text('clerk_id').unique(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const donor_profiles = pgTable('donor_profiles', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  user_id:             uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  business_name:       text('business_name').notNull(),
  business_type:       businessTypeEnum('business_type').notNull().default('restaurant'),
  phone:               text('phone'),
  address:             text('address').notNull(),
  city:                text('city').notNull(),
  state:               text('state'),
  pincode:             text('pincode'),
  location:            geography('location'),
  food_license_number: text('food_license_number'),
  gst_number:          text('gst_number'),
  verification_status: verificationStatusEnum('verification_status').notNull().default('pending'),
  verified_at:         timestamp('verified_at', { withTimezone: true }),
  verified_by:         uuid('verified_by').references(() => users.id),
  created_at:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const receiver_profiles = pgTable('receiver_profiles', {
  id:                uuid('id').primaryKey().defaultRandom(),
  user_id:           uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  organization_name: text('organization_name').notNull(),
  organization_type: organizationTypeEnum('organization_type').notNull().default('ngo'),
  phone:             text('phone'),
  address:           text('address').notNull(),
  city:              text('city').notNull(),
  state:             text('state'),
  pincode:           text('pincode'),
  location:          geography('location'),
  service_area_km:   integer('service_area_km').notNull().default(10),
  max_capacity_kg:   decimal('max_capacity_kg', { precision: 10, scale: 2 }),
  accepts_veg:       boolean('accepts_veg').notNull().default(true),
  accepts_non_veg:   boolean('accepts_non_veg').notNull().default(false),
  accepts_vegan:     boolean('accepts_vegan').notNull().default(true),
  accepts_cooked:    boolean('accepts_cooked').notNull().default(true),
  accepts_raw:       boolean('accepts_raw').notNull().default(true),
  accepts_packaged:  boolean('accepts_packaged').notNull().default(true),
  accepts_short_term: boolean('accepts_short_term').notNull().default(true),
  accepts_long_term:  boolean('accepts_long_term').notNull().default(true),
  registration_number: text('registration_number'),
  verification_status: verificationStatusEnum('verification_status').notNull().default('pending'),
  verified_at:       timestamp('verified_at', { withTimezone: true }),
  verified_by:       uuid('verified_by').references(() => users.id),
  created_at:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const donations = pgTable('donations', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  donor_id:             uuid('donor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  donor_profile_id:     uuid('donor_profile_id').notNull().references(() => donor_profiles.id),
  title:                text('title').notNull(),
  description:          text('description'),
  food_category:        foodCategoryEnum('food_category').notNull(),
  food_type:            foodTypeEnum('food_type').notNull(),
  food_condition:       foodConditionEnum('food_condition').notNull(),
  quantity_kg:          decimal('quantity_kg', { precision: 10, scale: 2 }).notNull(),
  quantity_description: text('quantity_description'),
  serves_approx:        integer('serves_approx'),
  preparation_time:     timestamp('preparation_time', { withTimezone: true }),
  expiry_time:          timestamp('expiry_time', { withTimezone: true }).notNull(),
  preferred_pickup_time: timestamp('preferred_pickup_time', { withTimezone: true }),
  pickup_address:       text('pickup_address').notNull(),
  pickup_city:          text('pickup_city').notNull(),
  pickup_location:      geography('pickup_location'),
  pickup_instructions:  text('pickup_instructions'),
  contact_number:       text('contact_number').notNull(),
  status:               donationStatusEnum('status').notNull().default('available'),
  is_urgent:            boolean('is_urgent').notNull().default(false),
  admin_notes:          text('admin_notes'),
  created_at:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const donation_images = pgTable('donation_images', {
  id:           uuid('id').primaryKey().defaultRandom(),
  donation_id:  uuid('donation_id').notNull().references(() => donations.id, { onDelete: 'cascade' }),
  image_url:    text('image_url').notNull(),
  storage_path: text('storage_path'),
  is_primary:   boolean('is_primary').notNull().default(false),
  uploaded_at:  timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
})

export const donation_receiver_notifications = pgTable(
  'donation_receiver_notifications',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    donation_id:      uuid('donation_id').notNull().references(() => donations.id, { onDelete: 'cascade' }),
    receiver_id:      uuid('receiver_id').notNull().references(() => users.id),
    notified_at:      timestamp('notified_at', { withTimezone: true }).notNull().defaultNow(),
    response:         text('response').default('no_response'),
    responded_at:     timestamp('responded_at', { withTimezone: true }),
    rejection_reason: text('rejection_reason'),
  },
  (t) => [unique().on(t.donation_id, t.receiver_id)]
)

export const pickup_assignments = pgTable('pickup_assignments', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  donation_id:           uuid('donation_id').notNull().unique().references(() => donations.id, { onDelete: 'cascade' }),
  receiver_id:           uuid('receiver_id').notNull().references(() => users.id),
  receiver_profile_id:   uuid('receiver_profile_id').notNull().references(() => receiver_profiles.id),
  pickup_type:           pickupTypeEnum('pickup_type').notNull().default('ngo_pickup'),
  delivery_partner_id:   uuid('delivery_partner_id').references(() => users.id),
  pickup_status:         pickupStatusEnum('pickup_status').notNull().default('assigned'),
  scheduled_pickup_time: timestamp('scheduled_pickup_time', { withTimezone: true }),
  actual_pickup_time:    timestamp('actual_pickup_time', { withTimezone: true }),
  otp_code:              text('otp_code'),
  otp_verified:          boolean('otp_verified').notNull().default(false),
  pickup_notes:          text('pickup_notes'),
  assigned_at:           timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at:            timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const delivery_confirmations = pgTable('delivery_confirmations', {
  id:                       uuid('id').primaryKey().defaultRandom(),
  pickup_assignment_id:     uuid('pickup_assignment_id').notNull().unique().references(() => pickup_assignments.id, { onDelete: 'cascade' }),
  donation_id:              uuid('donation_id').notNull().references(() => donations.id),
  receiver_id:              uuid('receiver_id').notNull().references(() => users.id),
  quantity_received_kg:     decimal('quantity_received_kg', { precision: 10, scale: 2 }),
  food_condition_on_arrival: text('food_condition_on_arrival'),
  is_food_safe:             boolean('is_food_safe').notNull().default(true),
  receiver_notes:           text('receiver_notes'),
  confirmed_at:             timestamp('confirmed_at', { withTimezone: true }).notNull().defaultNow(),
})

export const impact_reports = pgTable('impact_reports', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  donation_id:            uuid('donation_id').notNull().unique().references(() => donations.id, { onDelete: 'cascade' }),
  donor_id:               uuid('donor_id').notNull().references(() => users.id),
  receiver_id:            uuid('receiver_id').notNull().references(() => users.id),
  meals_saved:            integer('meals_saved'),
  food_waste_reduced_kg:  decimal('food_waste_reduced_kg', { precision: 10, scale: 2 }),
  co2_impact_kg:          decimal('co2_impact_kg', { precision: 10, scale: 2 }),
  people_served:          integer('people_served'),
  receiver_confirmed:     boolean('receiver_confirmed').notNull().default(false),
  donor_report_generated: boolean('donor_report_generated').notNull().default(false),
  report_generated_at:    timestamp('report_generated_at', { withTimezone: true }),
  created_at:             timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const notifications = pgTable('notifications', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  user_id:             uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:                notificationTypeEnum('type').notNull(),
  title:               text('title').notNull(),
  message:             text('message').notNull(),
  related_donation_id: uuid('related_donation_id').references(() => donations.id, { onDelete: 'set null' }),
  data:                jsonb('data').notNull().default({}),
  is_read:             boolean('is_read').notNull().default(false),
  read_at:             timestamp('read_at', { withTimezone: true }),
  created_at:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const user_verifications = pgTable('user_verifications', {
  id:               uuid('id').primaryKey().defaultRandom(),
  user_id:          uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  document_type:    text('document_type').notNull(),
  document_url:     text('document_url').notNull(),
  storage_path:     text('storage_path'),
  status:           verificationStatusEnum('status').notNull().default('pending'),
  reviewed_by:      uuid('reviewed_by').references(() => users.id),
  reviewed_at:      timestamp('reviewed_at', { withTimezone: true }),
  rejection_reason: text('rejection_reason'),
  uploaded_at:      timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
})

export const admin_actions = pgTable('admin_actions', {
  id:          uuid('id').primaryKey().defaultRandom(),
  admin_id:    uuid('admin_id').notNull().references(() => users.id),
  action_type: text('action_type').notNull(),
  target_type: text('target_type').notNull(),
  target_id:   uuid('target_id').notNull(),
  description: text('description'),
  metadata:    jsonb('metadata').notNull().default({}),
  created_at:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────────────────────────
export type User                         = typeof users.$inferSelect
export type DonorProfile                 = typeof donor_profiles.$inferSelect
export type ReceiverProfile              = typeof receiver_profiles.$inferSelect
export type Donation                     = typeof donations.$inferSelect
export type DonationImage                = typeof donation_images.$inferSelect
export type DonationReceiverNotification = typeof donation_receiver_notifications.$inferSelect
export type PickupAssignment             = typeof pickup_assignments.$inferSelect
export type DeliveryConfirmation         = typeof delivery_confirmations.$inferSelect
export type ImpactReport                 = typeof impact_reports.$inferSelect
export type Notification                 = typeof notifications.$inferSelect
export type UserVerification             = typeof user_verifications.$inferSelect
export type AdminAction                  = typeof admin_actions.$inferSelect

// Role types from enum
export type UserRole = typeof userRoleEnum.enumValues[number]
