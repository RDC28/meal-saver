'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { PlusCircle, Search, Filter, MoreVertical, Loader2 } from 'lucide-react'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

type DonationStatus = 'available' | 'pending_acceptance' | 'accepted' | 'pickup_assigned' | 'picked_up' | 'delivered' | 'expired' | 'cancelled' | 'rejected'

interface Donation {
  id: string
  title: string
  qty: string
  status: DonationStatus
  window: string
  date: string
}

const tabs = ['All', 'Active', 'Delivered', 'Expired']

const activeStatuses: DonationStatus[] = ['available', 'pending_acceptance', 'accepted', 'pickup_assigned', 'picked_up']

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
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTimeWindow(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function DonorDonationsPage() {
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [allDonations, setAllDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDonations() {
      try {
        const res = await fetch('/api/donations?my=true&limit=100')
        if (!res.ok) return
        const json = await res.json()
        const raw = json.data?.donations ?? []
        setAllDonations(
          raw.map((d: {
            id: string
            title: string
            quantity_description?: string
            quantity_kg: string | number
            status: DonationStatus
            preferred_pickup_time?: string | null
            created_at: string
          }) => ({
            id: d.id,
            title: d.title,
            qty: d.quantity_description ?? `${d.quantity_kg} kg`,
            status: d.status,
            window: formatTimeWindow(d.preferred_pickup_time ?? null),
            date: formatRelativeDate(d.created_at),
          }))
        )
      } finally {
        setLoading(false)
      }
    }

    fetchDonations()
  }, [])

  const filtered = allDonations.filter((d) => {
    const matchesTab =
      tab === 'All'       ? true :
      tab === 'Active'    ? activeStatuses.includes(d.status) :
      tab === 'Delivered' ? d.status === 'delivered' :
      tab === 'Expired'   ? (d.status === 'expired' || d.status === 'rejected' || d.status === 'cancelled') :
      true
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

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

        <div className="px-8 py-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Total',     value: allDonations.length,                                                           color: 'text-foreground' },
              { label: 'Active',    value: allDonations.filter(d => activeStatuses.includes(d.status)).length,            color: 'text-blue-600' },
              { label: 'Delivered', value: allDonations.filter(d => d.status === 'delivered').length,                     color: 'text-green-700' },
              { label: 'Expired',   value: allDonations.filter(d => d.status === 'expired' || d.status === 'rejected' || d.status === 'cancelled').length, color: 'text-red-500' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label} Donations</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
              <div className="flex gap-1">
                {tabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                      tab === t
                        ? 'bg-secondary text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search donations…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-52 rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary">
                  <Filter size={14} />
                  Filter
                </button>
              </div>
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
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center">
                        <Loader2 size={20} className="mx-auto animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-muted-foreground">
                        No donations match this filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d) => (
                      <tr key={d.id} className="hover:bg-secondary/30">
                        <td className="px-6 py-3.5 font-medium text-foreground">
                          <Link href={`/donor/donations/${d.id}`} className="hover:underline">
                            {d.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{d.qty}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={d.status} />
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{d.window}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{d.date}</td>
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

            <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
              Showing {filtered.length} of {allDonations.length} donations
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
