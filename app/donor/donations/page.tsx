'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Loader2, PlusCircle, Search } from 'lucide-react'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

type DonationStatus =
  | 'available'
  | 'pending_acceptance'
  | 'accepted'
  | 'pickup_assigned'
  | 'picked_up'
  | 'delivered'
  | 'expired'
  | 'cancelled'
  | 'rejected'
  | 'unsafe'

interface ApiDonation {
  id: string
  title: string
  quantity_kg: string
  quantity_description: string | null
  status: DonationStatus
  preferred_pickup_time: string | null
  expiry_time: string | null
  pickup_city: string
  created_at: string
}

const tabs = ['All', 'Active', 'Delivered', 'Expired'] as const
const activeStatuses: DonationStatus[] = ['available', 'pending_acceptance', 'accepted', 'pickup_assigned', 'picked_up']
const expiredStatuses: DonationStatus[] = ['expired', 'rejected', 'cancelled', 'unsafe']

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === yesterday.getTime()) return 'Yesterday'

  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatPickupWindow(d: ApiDonation): string {
  const preferred = formatTime(d.preferred_pickup_time)
  if (preferred) return `Preferred ${preferred}`

  const expiry = formatTime(d.expiry_time)
  if (expiry) return `By ${expiry}`

  return 'Not set'
}

export default function DonorDonationsPage() {
  const [allDonations, setAllDonations] = useState<ApiDonation[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<(typeof tabs)[number]>('All')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function fetchDonations() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/donations?my=true&limit=100')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load donations')
        if (alive) setAllDonations(json.data?.donations ?? [])
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load donations')
      } finally {
        if (alive) setLoading(false)
      }
    }

    fetchDonations()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allDonations.filter(d => {
      const matchesTab =
        tab === 'All' ? true :
        tab === 'Active' ? activeStatuses.includes(d.status) :
        tab === 'Delivered' ? d.status === 'delivered' :
        tab === 'Expired' ? expiredStatuses.includes(d.status) :
        true

      const matchesSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.pickup_city.toLowerCase().includes(q)

      return matchesTab && matchesSearch
    })
  }, [allDonations, search, tab])

  const stats = [
    { label: 'Total Donations', value: allDonations.length, color: 'text-foreground' },
    { label: 'Active Donations', value: allDonations.filter(d => activeStatuses.includes(d.status)).length, color: 'text-blue-600' },
    { label: 'Delivered Donations', value: allDonations.filter(d => d.status === 'delivered').length, color: 'text-green-700' },
    { label: 'Expired Donations', value: allDonations.filter(d => expiredStatuses.includes(d.status)).length, color: 'text-red-500' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="donor" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Active Donations</h1>
            <p className="text-sm text-muted-foreground">Manage and track all your food donations</p>
          </div>
          <Link
            href="/donor/donations/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <PlusCircle size={16} />
            New Donation
          </Link>
        </div>

        <div className="space-y-5 px-8 py-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-card px-5 py-4 shadow-sm">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {tabs.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                      tab === t
                        ? 'bg-secondary text-primary'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search food or city"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-64 rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {error && (
              <div className="border-b border-destructive/20 bg-destructive/10 px-6 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-6 py-3">Food Title</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Pickup Window</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center">
                        <Loader2 size={20} className="mx-auto animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                        No donations match this view.
                      </td>
                    </tr>
                  ) : (
                    filtered.map(d => (
                      <tr key={d.id} className="hover:bg-secondary/30">
                        <td className="px-6 py-3.5">
                          <Link href={`/donor/donations/${d.id}`} className="font-medium text-foreground hover:underline">
                            {d.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {d.quantity_description ?? `${d.quantity_kg} kg`}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{formatPickupWindow(d)}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{formatRelativeDate(d.created_at)}</td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href={`/donor/donations/${d.id}`}
                            className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
              Showing {filtered.length} of {allDonations.length} donations
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
