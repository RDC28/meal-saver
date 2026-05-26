'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Loader2, RefreshCw, Clock, MapPin, X } from 'lucide-react'
import { AdminSidebar } from '@/components/mealsaver/admin-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

interface DonationRow {
  id: string
  title: string
  status: string
  pickup_city: string
  quantity_kg: string
  quantity_description: string | null
  food_condition: string
  expiry_time: string | null
  is_urgent: boolean
  created_at: string
}

function minsLeft(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((new Date(iso).getTime() - Date.now()) / 60_000)
}

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function AdminEmergencyPage() {
  const [available, setAvailable] = useState<DonationRow[]>([])
  const [expired,   setExpired]   = useState<DonationRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({})
  const [error,     setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [aRes, eRes] = await Promise.all([
        fetch('/api/admin/donations?status=available&limit=100'),
        fetch('/api/admin/donations?status=expired&limit=50'),
      ])
      const [aJ, eJ] = await Promise.all([aRes.json(), eRes.json()])
      const all: DonationRow[] = aJ.data?.donations ?? []
      // Keep only urgent or expiring within 2 hours
      setAvailable(all.filter((d) => {
        if (d.is_urgent) return true
        const mins = minsLeft(d.expiry_time)
        return mins !== null && mins < 120
      }))
      setExpired(eJ.data?.donations ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCancel(id: string) {
    if (!confirm('Cancel this donation?')) return
    setCancelling((p) => ({ ...p, [id]: true }))
    await fetch(`/api/donations/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled by admin — no takers before expiry' }),
    })
    await load()
    setCancelling((p) => ({ ...p, [id]: false }))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <AlertTriangle size={18} className="text-destructive" /> Emergency Handling
            </h1>
            <p className="text-sm text-muted-foreground">Urgent and expiring donations that need immediate action</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="m-8 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div className="px-8 py-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Urgent / expiring */}
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-700">
                  <Clock size={14} />
                  Urgent / Expiring Soon ({available.length})
                </h2>
                {available.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground shadow-sm">
                    No urgent donations at the moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {available.map((d) => {
                      const mins = minsLeft(d.expiry_time)
                      return (
                        <div key={d.id} className="rounded-2xl border border-orange-200 bg-orange-50/40 px-5 py-4 shadow-sm">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground">{d.title}</p>
                                {d.is_urgent && (
                                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">URGENT</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {d.quantity_description ?? `${d.quantity_kg} kg`} · {d.food_condition}
                              </p>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} className="text-orange-600" />
                                  {mins !== null && mins >= 0
                                    ? <span className="text-orange-700 font-medium">{mins < 60 ? `${mins} min left` : `${Math.floor(mins / 60)}h ${mins % 60}m left`}</span>
                                    : <span className="text-destructive font-medium">Expiry: {fmtTime(d.expiry_time)}</span>
                                  }
                                </span>
                                <span className="flex items-center gap-1"><MapPin size={11} /> {d.pickup_city}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-2">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              <StatusBadge status={d.status as any} />
                              <Link
                                href="/admin/matching"
                                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 text-center"
                              >
                                Assign
                              </Link>
                              <button
                                onClick={() => handleCancel(d.id)}
                                disabled={cancelling[d.id]}
                                className="flex items-center justify-center gap-1 rounded-lg border border-destructive px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
                              >
                                <X size={11} /> Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Expired */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-destructive">Recently Expired ({expired.length})</h2>
                {expired.length === 0 ? (
                  <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground shadow-sm">
                    No expired donations.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                          <th className="px-5 py-3">Title</th>
                          <th className="px-4 py-3">City</th>
                          <th className="px-4 py-3">Expired At</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {expired.map((d) => (
                          <tr key={d.id} className="hover:bg-secondary/30 opacity-70">
                            <td className="px-5 py-3 font-medium text-foreground">{d.title}</td>
                            <td className="px-4 py-3 text-muted-foreground">{d.pickup_city}</td>
                            <td className="px-4 py-3 text-muted-foreground">{fmtTime(d.expiry_time)}</td>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            <td className="px-4 py-3"><StatusBadge status={d.status as any} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
