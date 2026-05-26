'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, AlertCircle, Filter } from 'lucide-react'
import { AdminSidebar } from '@/components/mealsaver/admin-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

interface DonationRow {
  id: string
  title: string
  status: string
  food_type: string
  food_condition: string
  quantity_kg: string
  quantity_description: string | null
  pickup_city: string
  is_urgent: boolean
  expiry_time: string | null
  created_at: string
}

interface Pagination { page: number; limit: number; total: number; pages: number }

const STATUS_OPTS = [
  '', 'available', 'pending_acceptance', 'accepted',
  'pickup_assigned', 'picked_up', 'delivered', 'expired', 'cancelled',
]

export default function AdminDonationsPage() {
  const [donations,  setDonations]  = useState<DonationRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [status,     setStatus]     = useState('')
  const [city,       setCity]       = useState('')
  const [page,       setPage]       = useState(1)

  const fetchDonations = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: '25' })
    if (status) params.set('status', status)
    if (city)   params.set('city', city)
    try {
      const res  = await fetch(`/api/admin/donations?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load donations')
      setDonations(json.data?.donations ?? [])
      setPagination(json.data?.pagination ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [page, status, city])

  useEffect(() => { fetchDonations() }, [fetchDonations])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-card px-8 py-5">
          <h1 className="text-lg font-bold text-foreground">Donations</h1>
          <p className="text-sm text-muted-foreground">All donations across the platform</p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by city…"
                value={city}
                onChange={(e) => { setCity(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {STATUS_OPTS.map((s) => (
                <option key={s} value={s}>{s === '' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <Link
              href="/admin/matching"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Filter size={14} /> Assign Donation
            </Link>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-5 py-3">Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Food</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Expiry</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center">
                        <Loader2 size={20} className="mx-auto animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : donations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        No donations found.
                      </td>
                    </tr>
                  ) : donations.map((d) => (
                    <tr key={d.id} className={`hover:bg-secondary/30 ${d.is_urgent ? 'bg-orange-50/30' : ''}`}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-foreground">{d.title}</p>
                        {d.is_urgent && (
                          <span className="text-[10px] font-semibold text-orange-600">URGENT</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <StatusBadge status={d.status as any} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">
                        {d.food_type.replace('_', ' ')} · {d.food_condition}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.quantity_description ?? `${d.quantity_kg} kg`}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{d.pickup_city}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.expiry_time
                          ? new Date(d.expiry_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
                <span>Showing {donations.length} of {pagination.total} donations</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded px-2 py-1 hover:bg-secondary disabled:opacity-40">← Prev</button>
                  <span className="px-2 py-1">{page} / {pagination.pages}</span>
                  <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="rounded px-2 py-1 hover:bg-secondary disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
