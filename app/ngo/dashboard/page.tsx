import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RefreshCw, Clock, MapPin, Heart } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { db, users, receiver_profiles, donations, pickup_assignments, impact_reports } from '@/lib/db'
import { eq, and, ilike, sql, count, sum } from 'drizzle-orm'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'

const tagColorMap: Record<string, string> = {
  green:  'bg-green-50 text-green-700',
  blue:   'bg-blue-50 text-blue-700',
  orange: 'bg-orange-50 text-orange-700',
  red:    'bg-red-50 text-red-700',
}

function buildTags(foodType: string, foodCondition: string, isUrgent: boolean) {
  const tags: { label: string; color: string }[] = []
  if (foodType === 'veg')   tags.push({ label: 'Veg',      color: 'green' })
  if (foodType === 'vegan') tags.push({ label: 'Vegan',    color: 'green' })
  if (foodType === 'non_veg') tags.push({ label: 'Non-Veg', color: 'red' })
  if (foodCondition === 'cooked')   tags.push({ label: 'Cooked',   color: 'green' })
  if (foodCondition === 'raw')      tags.push({ label: 'Raw',      color: 'orange' })
  if (foodCondition === 'packaged') tags.push({ label: 'Packaged', color: 'blue' })
  if (isUrgent) tags.push({ label: 'Urgent', color: 'red' })
  return tags
}

function formatTime(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default async function NGODashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const [user] = await db.select().from(users).where(eq(users.clerk_id, userId))
  if (!user) redirect('/login')

  const [receiverProfile] = await db
    .select()
    .from(receiver_profiles)
    .where(eq(receiver_profiles.user_id, user.id))

  const orgName = receiverProfile?.organization_name ?? user.full_name ?? 'NGO'
  const city    = receiverProfile?.city ?? ''
  const radiusKm = receiverProfile?.service_area_km ?? 10

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [nearbyDonations, [availableCount], [acceptedToday], impactRow] = await Promise.all([
    city
      ? db
          .select()
          .from(donations)
          .where(and(eq(donations.status, 'available'), ilike(donations.pickup_city, `%${city}%`)))
          .limit(3)
      : Promise.resolve([]),

    city
      ? db
          .select({ total: count() })
          .from(donations)
          .where(and(eq(donations.status, 'available'), ilike(donations.pickup_city, `%${city}%`)))
      : Promise.resolve([{ total: 0 }]),

    db
      .select({ total: count() })
      .from(pickup_assignments)
      .where(
        and(
          eq(pickup_assignments.receiver_id, user.id),
          sql`${pickup_assignments.assigned_at} >= ${today}`
        )
      ),

    db
      .select({ meals: sum(impact_reports.meals_saved) })
      .from(impact_reports)
      .where(eq(impact_reports.receiver_id, user.id)),
  ])

  const totalMeals = Number(impactRow[0]?.meals ?? 0)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="ngo" userName={orgName} userRole="NGO" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Nearby Donations</h1>
            <p className="text-sm text-muted-foreground">
              {city
                ? `Showing donations in ${city} · Nearest first`
                : 'Complete your profile to see nearby donations'}
            </p>
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { icon: '✅', value: String(availableCount?.total ?? 0), label: 'Available Nearby' },
              { icon: '📦', value: String(acceptedToday?.total ?? 0), label: 'Accepted Today' },
              { icon: '🍜', value: String(totalMeals),                 label: 'Meals Received' },
              { icon: '📍', value: `${radiusKm} km`,                   label: 'Service Radius' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm text-center"
              >
                <span className="text-2xl">{s.icon}</span>
                <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {nearbyDonations.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm">
                {city ? 'No donations available nearby right now.' : 'Complete your profile to see nearby donations.'}
              </div>
            ) : (
              nearbyDonations.map((d) => {
                const tags = buildTags(d.food_type, d.food_condition, d.is_urgent)
                return (
                  <div
                    key={d.id}
                    className={`rounded-2xl border bg-card px-5 py-4 shadow-sm ${
                      d.is_urgent ? 'border-orange-200' : 'border-border'
                    }`}
                  >
                    {d.is_urgent && (
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                        Urgent
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-3xl">
                        🍱
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <h3 className="font-semibold text-foreground">{d.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {d.quantity_description ?? `${d.quantity_kg} kg`} ·{' '}
                          {d.food_condition.charAt(0).toUpperCase() + d.food_condition.slice(1)} Food
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> Pickup by {formatTime(d.expiry_time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {d.pickup_city}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tags.map((tag) => (
                            <span
                              key={tag.label}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                tagColorMap[tag.color] ?? 'bg-secondary text-foreground'
                              }`}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Link
                        href={`/ngo/donations/${d.id}`}
                        className="shrink-0 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-secondary"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                )
              })
            )}

            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Heart size={14} className="text-primary" />
              {nearbyDonations.length > 0 ? 'Showing top 3 nearby' : 'No more donations nearby'}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm inline-block">
            <p className="text-sm text-muted-foreground">Service Radius</p>
            <p className="text-2xl font-bold text-foreground">{radiusKm} km</p>
            <p className="text-xs text-muted-foreground mb-3">
              You will see donations within this radius.
            </p>
            <Link href="/ngo/profile" className="text-sm font-semibold text-primary hover:underline">
              Change Radius
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
