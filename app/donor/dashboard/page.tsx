import Link from 'next/link'
import { PlusCircle, MoreVertical, BarChart2 } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { db, donations, users, donor_profiles, impact_reports } from '@/lib/db'
import { eq, desc, inArray, count, sum, and } from 'drizzle-orm'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

const ACTIVE_STATUSES = ['available', 'pending_acceptance', 'accepted', 'pickup_assigned', 'picked_up'] as const

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === yesterday.getTime()) return 'Yesterday'

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimeWindow(dt: Date | null): string {
  if (!dt) return '—'
  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default async function DonorDashboardPage() {
  const { userId } = await auth()

  let businessName = 'there'
  let recentDonations: {
    id: string
    title: string
    qty: string
    status: string
    window: string
    time: string
  }[] = []
  let activeDonations = 0
  let deliveredDonations = 0
  let mealsSaved = 0
  let wasteReduced = 0

  if (userId) {
    const [user] = await db.select().from(users).where(eq(users.clerk_id, userId))

    if (user) {
      const [donorProfile] = await db
        .select({ business_name: donor_profiles.business_name })
        .from(donor_profiles)
        .where(eq(donor_profiles.user_id, user.id))

      if (donorProfile) businessName = donorProfile.business_name

      const [recent, [activeRow], [deliveredRow], impactRow] = await Promise.all([
        db
          .select()
          .from(donations)
          .where(eq(donations.donor_id, user.id))
          .orderBy(desc(donations.created_at))
          .limit(5),

        db
          .select({ count: count() })
          .from(donations)
          .where(and(eq(donations.donor_id, user.id), inArray(donations.status, [...ACTIVE_STATUSES]))),

        db
          .select({ count: count() })
          .from(donations)
          .where(and(eq(donations.donor_id, user.id), eq(donations.status, 'delivered'))),

        db
          .select({
            meals: sum(impact_reports.meals_saved),
            waste: sum(impact_reports.food_waste_reduced_kg),
          })
          .from(impact_reports)
          .where(eq(impact_reports.donor_id, user.id)),
      ])

      activeDonations = Number(activeRow?.count ?? 0)
      deliveredDonations = Number(deliveredRow?.count ?? 0)
      mealsSaved = Number(impactRow[0]?.meals ?? 0)
      wasteReduced = Number(impactRow[0]?.waste ?? 0)

      recentDonations = recent.map((d) => ({
        id: d.id,
        title: d.title,
        qty: d.quantity_description ?? `${d.quantity_kg} kg`,
        status: d.status,
        window: formatTimeWindow(d.preferred_pickup_time ?? d.expiry_time),
        time: formatRelativeDate(d.created_at),
      }))
    }
  }

  const stats = [
    { icon: '🍱', value: String(activeDonations), label: 'Active Donations', sub: 'View all', href: '/donor/donations' },
    { icon: '✅', value: String(deliveredDonations), label: 'Successful Deliveries', sub: 'View all', href: '/donor/history' },
    { icon: '🍜', value: mealsSaved.toLocaleString('en-IN'), label: 'Meals Saved', sub: 'All time' },
    { icon: '🌿', value: `${wasteReduced.toLocaleString('en-IN')} kg`, label: 'Waste Reduced', sub: 'All time' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="donor" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-start justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Welcome back, {businessName}! 🌿
            </h1>
            <p className="text-sm text-muted-foreground">
              Together, we&apos;re reducing waste and feeding more people.
            </p>
          </div>
          <Link
            href="/donor/donations/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlusCircle size={16} />
            Create New Donation
          </Link>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm"
              >
                <span className="text-2xl">{s.icon}</span>
                <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                {s.href ? (
                  <Link href={s.href} className="mt-1 text-xs font-medium text-primary hover:underline">
                    {s.sub}
                  </Link>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-semibold text-foreground">Recent Donations</h2>
              <Link href="/donor/donations" className="text-sm font-medium text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-6 py-3">Food Title</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Pickup Window</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentDonations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                        No donations yet. Create your first donation!
                      </td>
                    </tr>
                  ) : (
                    recentDonations.map((d) => (
                      <tr key={d.id} className="hover:bg-secondary/30">
                        <td className="px-6 py-3.5 font-medium text-foreground">{d.title}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{d.qty}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={d.status as Parameters<typeof StatusBadge>[0]['status']} />
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{d.window}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{d.time}</td>
                        <td className="px-4 py-3.5">
                          <button className="text-muted-foreground hover:text-foreground">
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/40 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌿</span>
              <div>
                <p className="font-semibold text-foreground">Great going!</p>
                <p className="text-sm text-muted-foreground">
                  You&apos;ve made a positive impact in your community.
                </p>
              </div>
            </div>
            <Link
              href="/impact"
              className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              <BarChart2 size={15} />
              View Impact Report
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
