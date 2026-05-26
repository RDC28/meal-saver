import Link from 'next/link'
import { BarChart2, CheckCircle2, UtensilsCrossed, Leaf } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { db, donations, users, impact_reports, pickup_assignments, receiver_profiles } from '@/lib/db'
import { eq, inArray, desc, sum, and } from 'drizzle-orm'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

const HISTORY_STATUSES = ['delivered', 'expired', 'cancelled', 'rejected'] as const

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === yesterday.getTime()) return 'Yesterday'

  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 14) return '1 week ago'

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function DonorHistoryPage() {
  const { userId } = await auth()

  let history: {
    id: string
    title: string
    qty: string
    ngo: string
    date: string
    meals: number
    status: string
  }[] = []

  let totalDelivered = 0
  let totalMeals = 0
  let totalWaste = 0
  let totalExpired = 0

  if (userId) {
    const [user] = await db.select().from(users).where(eq(users.clerk_id, userId))

    if (user) {
      const [historyRows, impactAgg] = await Promise.all([
        db
          .select()
          .from(donations)
          .where(and(eq(donations.donor_id, user.id), inArray(donations.status, [...HISTORY_STATUSES])))
          .orderBy(desc(donations.updated_at)),

        db
          .select({
            meals: sum(impact_reports.meals_saved),
            waste: sum(impact_reports.food_waste_reduced_kg),
          })
          .from(impact_reports)
          .where(eq(impact_reports.donor_id, user.id)),
      ])

      totalMeals = Number(impactAgg[0]?.meals ?? 0)
      totalWaste = Number(impactAgg[0]?.waste ?? 0)
      totalDelivered = historyRows.filter(d => d.status === 'delivered').length
      totalExpired = historyRows.filter(d => d.status === 'expired' || d.status === 'rejected' || d.status === 'cancelled').length

      const donationIds = historyRows.map(d => d.id)

      const [impactRows, pickupRows] = donationIds.length > 0
        ? await Promise.all([
            db
              .select({ donation_id: impact_reports.donation_id, meals_saved: impact_reports.meals_saved })
              .from(impact_reports)
              .where(inArray(impact_reports.donation_id, donationIds)),

            db
              .select({
                donation_id: pickup_assignments.donation_id,
                organization_name: receiver_profiles.organization_name,
              })
              .from(pickup_assignments)
              .innerJoin(receiver_profiles, eq(pickup_assignments.receiver_profile_id, receiver_profiles.id))
              .where(inArray(pickup_assignments.donation_id, donationIds)),
          ])
        : [[], []]

      const impactMap = new Map(impactRows.map(r => [r.donation_id, r.meals_saved ?? 0]))
      const ngoMap = new Map(pickupRows.map(r => [r.donation_id, r.organization_name]))

      history = historyRows.map(d => ({
        id: d.id,
        title: d.title,
        qty: d.quantity_description ?? `${d.quantity_kg} kg`,
        ngo: ngoMap.get(d.id) ?? '—',
        date: formatRelativeDate(d.updated_at),
        meals: Number(impactMap.get(d.id) ?? 0),
        status: d.status,
      }))
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="donor" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Donation History</h1>
            <p className="text-sm text-muted-foreground">All your completed, expired, and rejected donations</p>
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
              { icon: <CheckCircle2 size={20} className="text-green-600" />, value: totalDelivered,                              label: 'Successful Deliveries', bg: 'bg-green-50' },
              { icon: <UtensilsCrossed size={20} className="text-primary" />, value: totalMeals,                                label: 'Total Meals Saved',      bg: 'bg-secondary' },
              { icon: <Leaf size={20} className="text-emerald-600" />,        value: `${totalWaste.toFixed(0)} kg`,             label: 'Waste Prevented',        bg: 'bg-emerald-50' },
              { icon: <span className="text-xl">🏅</span>,                   value: totalExpired,                               label: 'Expired / Rejected',     bg: 'bg-red-50' },
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
              <h2 className="font-semibold text-foreground">All Past Donations</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-6 py-3">Food Title</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Received by</th>
                    <th className="px-4 py-3">Meals</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-muted-foreground">
                        No past donations yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((d) => (
                      <tr key={d.id} className="hover:bg-secondary/30">
                        <td className="px-6 py-3.5 font-medium text-foreground">
                          <Link href={`/donor/donations/${d.id}`} className="hover:underline">
                            {d.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{d.qty}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{d.ngo}</td>
                        <td className="px-4 py-3.5 font-medium text-foreground">
                          {d.meals > 0 ? d.meals : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={d.status as Parameters<typeof StatusBadge>[0]['status']} />
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{d.date}</td>
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/donor/donations/${d.id}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
              {history.length} past donation{history.length !== 1 ? 's' : ''} shown
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
