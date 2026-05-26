import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BarChart2, UtensilsCrossed, CheckCircle2, Leaf } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { db, users, pickup_assignments, donations, impact_reports } from '@/lib/db'
import { eq, and, inArray, desc, sum, count, countDistinct } from 'drizzle-orm'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

function formatRelativeDate(date: Date | null): string {
  if (!date) return '—'
  const d  = new Date(date)
  const now = new Date()
  const diffMs   = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function NGOHistoryPage() {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const [user] = await db.select().from(users).where(eq(users.clerk_id, userId))
  if (!user) redirect('/login')

  const [history, impactRows, [pickupCount], [donorCount]] = await Promise.all([
    db
      .select({
        id:                   pickup_assignments.id,
        pickup_status:        pickup_assignments.pickup_status,
        updated_at:           pickup_assignments.updated_at,
        donation_id:          pickup_assignments.donation_id,
        title:                donations.title,
        quantity_kg:          donations.quantity_kg,
        quantity_description: donations.quantity_description,
        food_condition:       donations.food_condition,
        donor_id:             donations.donor_id,
      })
      .from(pickup_assignments)
      .innerJoin(donations, eq(pickup_assignments.donation_id, donations.id))
      .where(
        and(
          eq(pickup_assignments.receiver_id, user.id),
          inArray(pickup_assignments.pickup_status, ['completed', 'failed'])
        )
      )
      .orderBy(desc(pickup_assignments.updated_at)),

    db
      .select({
        meals: sum(impact_reports.meals_saved),
        waste: sum(impact_reports.food_waste_reduced_kg),
      })
      .from(impact_reports)
      .where(eq(impact_reports.receiver_id, user.id)),

    db
      .select({ total: count() })
      .from(pickup_assignments)
      .where(
        and(
          eq(pickup_assignments.receiver_id, user.id),
          inArray(pickup_assignments.pickup_status, ['completed', 'failed'])
        )
      ),

    db
      .select({ total: countDistinct(donations.donor_id) })
      .from(pickup_assignments)
      .innerJoin(donations, eq(pickup_assignments.donation_id, donations.id))
      .where(
        and(
          eq(pickup_assignments.receiver_id, user.id),
          inArray(pickup_assignments.pickup_status, ['completed', 'failed'])
        )
      ),
  ])

  const totalMeals  = Number(impactRows[0]?.meals ?? 0)
  const totalWaste  = Number(impactRows[0]?.waste ?? 0).toFixed(1)
  const totalPickups = Number(pickupCount?.total ?? 0)
  const uniqueDonors = Number(donorCount?.total ?? 0)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="ngo" userName="" userRole="NGO" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Delivery History</h1>
            <p className="text-sm text-muted-foreground">All completed food pickups and deliveries</p>
          </div>
          <Link
            href="/impact"
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <BarChart2 size={15} />
            View Impact Report
          </Link>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                icon: <CheckCircle2 size={20} className="text-green-600" />,
                bg: 'bg-green-50',
                value: totalPickups,
                label: 'Total Pickups',
              },
              {
                icon: <UtensilsCrossed size={20} className="text-primary" />,
                bg: 'bg-secondary',
                value: totalMeals,
                label: 'Meals Received',
              },
              {
                icon: <Leaf size={20} className="text-emerald-600" />,
                bg: 'bg-emerald-50',
                value: `${totalWaste} kg`,
                label: 'Waste Saved',
              },
              {
                icon: <span className="text-xl">🏅</span>,
                bg: 'bg-yellow-50',
                value: uniqueDonors,
                label: 'Unique Donors',
              },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="font-semibold text-foreground">Past Deliveries</h2>
            </div>

            {history.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                No completed pickups yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {history.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                      🍱
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{d.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.quantity_description ?? `${d.quantity_kg} kg`} ·{' '}
                        {d.food_condition.charAt(0).toUpperCase() + d.food_condition.slice(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(d.updated_at)}
                      </p>
                    </div>
                    <StatusBadge status={d.pickup_status} />
                    <Link
                      href={`/ngo/pickups/${d.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
              {history.length} deliveries shown
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
