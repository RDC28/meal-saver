'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { AdminSidebar } from '@/components/mealsaver/admin-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

interface ReportData {
  donations_by_status: { status: string; count: number }[]
  impact: {
    total_meals_saved:   string | null
    total_kg_rescued:    string | null
    total_co2_saved:     string | null
    total_people_served: string | null
    total_reports:       string | null
  } | null
  recent_activity: { donations_last_7_days: number }
  pending_verifications: { donors: number; receivers: number }
  generated_at: string
}

export default function AdminReportsPage() {
  const [report,  setReport]  = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  async function loadReport() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/admin/reports')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load')
      setReport(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, [])

  const totalDonations = report?.donations_by_status.reduce((s, d) => s + d.count, 0) ?? 0

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Reports</h1>
            <p className="text-sm text-muted-foreground">Platform-wide impact and activity statistics</p>
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {loading && !report ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="m-8 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} /> {error}
          </div>
        ) : report && (
          <div className="px-8 py-6 space-y-6">
            {report.generated_at && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(report.generated_at).toLocaleString('en-IN')}
              </p>
            )}

            {/* Impact */}
            <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
              <h2 className="mb-5 font-semibold text-foreground">Platform Impact</h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Total Meals Saved',   value: Number(report.impact?.total_meals_saved   ?? 0), unit: 'meals' },
                  { label: 'Food Rescued',         value: Number(report.impact?.total_kg_rescued    ?? 0), unit: 'kg' },
                  { label: 'CO₂ Emissions Saved',  value: Number(report.impact?.total_co2_saved     ?? 0), unit: 'kg CO₂' },
                  { label: 'People Served',        value: Number(report.impact?.total_people_served ?? 0), unit: 'people' },
                ].map((s) => (
                  <div key={s.label} className="space-y-1 rounded-xl border border-border p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{s.value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{s.unit}</p>
                    <p className="text-[11px] font-medium text-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Total Donations</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{totalDonations}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Donations This Week</p>
                <p className="mt-1 text-3xl font-bold text-primary">{report.recent_activity.donations_last_7_days}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                <p className="text-sm text-muted-foreground">Impact Reports Generated</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{Number(report.impact?.total_reports ?? 0)}</p>
              </div>
            </div>

            {/* Pending verifications */}
            <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-foreground">Pending Verifications</h2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                  { label: 'Pending Donors',    value: report.pending_verifications.donors,    color: 'text-orange-600' },
                  { label: 'Pending NGOs',      value: report.pending_verifications.receivers, color: 'text-blue-600' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Donations by status */}
            <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-foreground">Donations by Status</h2>
              <div className="space-y-3">
                {report.donations_by_status.map((d) => {
                  const pct = totalDonations > 0 ? Math.round((d.count / totalDonations) * 100) : 0
                  return (
                    <div key={d.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <StatusBadge status={d.status as any} />
                        <span className="font-semibold text-foreground">{d.count} <span className="font-normal text-muted-foreground">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
