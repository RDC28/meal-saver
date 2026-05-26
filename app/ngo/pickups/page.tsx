import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, MapPin, Phone, Package } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { db, users, pickup_assignments, donations } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

function formatPickupTime(date: Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default async function NGOPickupsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/login')

  const [user] = await db.select().from(users).where(eq(users.clerk_id, userId))
  if (!user) redirect('/login')

  const activePickups = await db
    .select({
      id:                    pickup_assignments.id,
      pickup_status:         pickup_assignments.pickup_status,
      scheduled_pickup_time: pickup_assignments.scheduled_pickup_time,
      assigned_at:           pickup_assignments.assigned_at,
      pickup_notes:          pickup_assignments.pickup_notes,
      donation_id:           pickup_assignments.donation_id,
      title:                 donations.title,
      quantity_kg:           donations.quantity_kg,
      quantity_description:  donations.quantity_description,
      food_condition:        donations.food_condition,
      pickup_address:        donations.pickup_address,
      pickup_city:           donations.pickup_city,
      contact_number:        donations.contact_number,
    })
    .from(pickup_assignments)
    .innerJoin(donations, eq(pickup_assignments.donation_id, donations.id))
    .where(
      and(
        eq(pickup_assignments.receiver_id, user.id),
        inArray(pickup_assignments.pickup_status, ['assigned', 'in_progress'])
      )
    )
    .orderBy(pickup_assignments.assigned_at)

  const assignedCount    = activePickups.filter((p) => p.pickup_status === 'assigned').length
  const inProgressCount  = activePickups.filter((p) => p.pickup_status === 'in_progress').length

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="ngo" userName="" userRole="NGO" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Accepted Pickups</h1>
            <p className="text-sm text-muted-foreground">Track your in-progress food pickups</p>
          </div>
          <Link
            href="/ngo/nearby"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse More Donations
          </Link>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Assigned',    value: assignedCount,   color: 'text-blue-600',   bg: 'bg-blue-50' },
              { label: 'In Progress', value: inProgressCount, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Active Total', value: activePickups.length, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                  <Package size={18} className={s.color} />
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Active Pickups ({activePickups.length})
            </h2>

            {activePickups.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm">
                No active pickups. Browse nearby donations to get started.
              </div>
            ) : (
              activePickups.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-3xl">
                      🍱
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground">{p.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {p.quantity_description ?? `${p.quantity_kg} kg`} ·{' '}
                            {p.food_condition.charAt(0).toUpperCase() + p.food_condition.slice(1)}
                          </p>
                        </div>
                        <StatusBadge status={p.pickup_status} />
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock size={13} />
                          {p.scheduled_pickup_time
                            ? formatPickupTime(p.scheduled_pickup_time)
                            : `Accepted ${formatPickupTime(p.assigned_at)}`}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin size={13} /> {p.pickup_address}, {p.pickup_city}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone size={13} /> {p.contact_number}
                        </span>
                        {p.pickup_notes && (
                          <span className="text-xs text-muted-foreground">{p.pickup_notes}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      <Link
                        href={`/ngo/pickups/${p.id}`}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 text-center"
                      >
                        Track Pickup
                      </Link>
                      <Link
                        href={`/pickup/verify?id=${p.id}`}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary text-center"
                      >
                        Verify OTP
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
