'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { AdminSidebar } from '@/components/mealsaver/admin-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

interface ReportData {
  donations_by_status: { status: string; count: number }[]
  impact: {
    total_meals_saved:   string | null
    total_kg_rescued:    string | null
    total_co2_saved:     string | null
    total_people_served: string | null
  } | null
  recent_activity: { donations_last_7_days: number }
  pending_verifications: { donors: number; receivers: number }
}

interface PendingUser {
  id: string
  full_name: string
  role: string
  donor_profiles:    { business_name: string; city: string }[]
  receiver_profiles: { organization_name: string; city: string }[]
}

interface RecentDonation {
  id: string
  title: string
  status: string
  pickup_city: string
}

const ACTIVE_STATUSES = ['available', 'pending_acceptance', 'accepted', 'pickup_assigned', 'picked_up']

export default function AdminDashboard() {
  const [report,          setReport]          = useState<ReportData | null>(null)
  const [pendingUsers,    setPendingUsers]    = useState<PendingUser[]>([])
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/reports'),
      fetch('/api/admin/users?verification_status=pending&limit=5'),
      fetch('/api/admin/donations?limit=5'),
    ])
      .then(async ([rR, uR, dR]) => {
        if (!rR.ok) throw new Error('Failed to load report data')
        const [rJ, uJ, dJ] = await Promise.all([rR.json(), uR.json(), dR.json()])
        setReport(rJ.data)
        setPendingUsers(uJ.data?.users   ?? [])
        setRecentDonations(dJ.data?.donations ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const activeDonations = report?.donations_by_status
    .filter((d) => ACTIVE_STATUSES.includes(d.status))
    .reduce((s, d) => s + d.count, 0) ?? 0

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-card px-8 py-5">
          <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform overview and quick actions</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="m-8 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} /> {error}
          </div>
        ) : (
          <div className="px-8 py-6 space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: 'Pending Donor Verifications', value: report?.pending_verifications.donors ?? 0,    color: 'text-orange-600', href: '/admin/verifications' },
                { label: 'Pending NGO Verifications',   value: report?.pending_verifications.receivers ?? 0, color: 'text-blue-600',   href: '/admin/verifications' },
                { label: 'Active Donations',             value: activeDonations,                              color: 'text-primary',    href: '/admin/donations' },
                { label: 'Donations This Week',          value: report?.recent_activity.donations_last_7_days ?? 0, color: 'text-green-600', href: '/admin/donations' },
              ].map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition-colors hover:bg-secondary/30"
                >
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
                </Link>
              ))}
            </div>

            {/* Middle row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Pending verifications */}
              <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">Pending Verifications</h2>
                  <Link href="/admin/verifications" className="text-xs text-primary hover:underline">View All</Link>
                </div>
                {pendingUsers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No pending verifications</p>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((u) => {
                      const name = u.donor_profiles[0]?.business_name ?? u.receiver_profiles[0]?.organization_name ?? u.full_name
                      const city = u.donor_profiles[0]?.city ?? u.receiver_profiles[0]?.city ?? '—'
                      return (
                        <div key={u.id} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{u.role} · {city}</p>
                          </div>
                          <Link
                            href="/admin/verifications"
                            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                          >
                            Review
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recent donations */}
              <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">Recent Donations</h2>
                  <Link href="/admin/donations" className="text-xs text-primary hover:underline">View All</Link>
                </div>
                {recentDonations.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No donations yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentDonations.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                          <p className="text-xs text-muted-foreground">{d.pickup_city}</p>
                        </div>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <StatusBadge status={d.status as any} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Impact metrics */}
            <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-foreground">Platform Impact</h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Meals Saved',    value: Number(report?.impact?.total_meals_saved   ?? 0).toLocaleString() },
                  { label: 'Kg Rescued',     value: Number(report?.impact?.total_kg_rescued    ?? 0).toLocaleString() },
                  { label: 'CO₂ Saved (kg)', value: Number(report?.impact?.total_co2_saved     ?? 0).toLocaleString() },
                  { label: 'People Served',  value: Number(report?.impact?.total_people_served ?? 0).toLocaleString() },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border p-4 text-center">
                    <p className="text-2xl font-bold text-primary">{s.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Donations by status */}
            {report?.donations_by_status && (
              <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
                <h2 className="mb-4 font-semibold text-foreground">Donations by Status</h2>
                <div className="flex flex-wrap gap-3">
                  {report.donations_by_status.map((d) => (
                    <div key={d.status} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <StatusBadge status={d.status as any} />
                      <span className="text-sm font-semibold text-foreground">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
