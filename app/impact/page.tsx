'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2, AlertCircle } from 'lucide-react'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'

interface ImpactSummary {
  total_meals_saved:          number | null
  total_food_waste_reduced_kg: number | null
  total_co2_impact_kg:        number | null
  total_people_served:        number | null
  total_donations_completed:  number | null
}

interface ImpactReport {
  id: string
  meals_saved: number
  food_waste_reduced_kg: number
  co2_impact_kg: number
  people_served: number
  report_generated_at: string
  donation_id: string
}

export default function ImpactPage() {
  const [role,    setRole]    = useState<'donor' | 'ngo' | null>(null)
  const [name,    setName]    = useState('')
  const [summary, setSummary] = useState<ImpactSummary | null>(null)
  const [reports, setReports] = useState<ImpactReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const meRes  = await fetch('/api/auth/me')
        const meJson = await meRes.json()
        const me     = meJson.data ?? meJson
        const r: 'donor' | 'ngo' = me.role === 'receiver' ? 'ngo' : 'donor'
        setRole(r)
        setName(me.full_name ?? '')

        const impactRes  = await fetch(r === 'ngo' ? '/api/impact/receiver' : '/api/impact/donor')
        const impactJson = await impactRes.json()

        if (impactRes.ok) {
          setSummary(impactJson.data?.summary as ImpactSummary ?? null)
          setReports(impactJson.data?.recent_reports ?? [])
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load impact data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const n = (v: number | null | undefined) => Number(v ?? 0).toLocaleString()

  const stats = [
    { emoji: '🍜', value: n(summary?.total_meals_saved),           label: 'Meals Saved' },
    { emoji: '🌿', value: `${n(summary?.total_food_waste_reduced_kg)} kg`, label: 'Food Waste Reduced' },
    { emoji: '☁️', value: `${n(summary?.total_co2_impact_kg)} kg`,  label: 'CO₂ Impact Avoided' },
    { emoji: '👥', value: n(summary?.total_donations_completed),   label: 'Donations Completed' },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role={role ?? 'donor'} userRole={role === 'ngo' ? 'NGO' : 'Donor'} />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-card px-8 py-5">
          <h1 className="text-lg font-bold text-foreground">Impact Report</h1>
          <p className="text-sm text-muted-foreground">Your impact, our shared mission</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="px-8 py-6 space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
                  <span className="text-2xl">{s.emoji}</span>
                  <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* People served highlight */}
            {(summary?.total_people_served ?? 0) > 0 && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 shadow-sm flex items-center gap-5">
                <span className="text-4xl">🤝</span>
                <div>
                  <p className="text-3xl font-bold text-primary">{n(summary?.total_people_served)}</p>
                  <p className="text-sm font-medium text-foreground">People served through your donations</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Every meal matters. Thank you.</p>
                </div>
              </div>
            )}

            {/* Recent impact reports */}
            <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
              <h2 className="mb-4 font-semibold text-foreground">Recent Impact Activity</h2>
              {reports.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {role === 'ngo'
                    ? 'No impact reports yet. Complete a pickup to see your impact here.'
                    : 'No impact reports yet. Complete a donation to see your impact here.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🍜</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {r.meals_saved} meals saved · {r.food_waste_reduced_kg} kg rescued
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CO₂ avoided: {r.co2_impact_kg} kg · {r.people_served} people served
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.report_generated_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Zero-state encouragement */}
            {!summary?.total_meals_saved && (
              <div className="rounded-2xl border border-border bg-secondary/40 px-6 py-5 text-center shadow-sm">
                <p className="text-2xl mb-2">🌱</p>
                <p className="font-semibold text-foreground">Your impact journey starts here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {role === 'ngo'
                    ? 'Accept and complete your first pickup to see your impact metrics.'
                    : 'Create and complete your first donation to start tracking your environmental impact.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
