'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Clock, MapPin, Phone, Search, SlidersHorizontal } from 'lucide-react'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'

interface Donation {
  id: string
  title: string
  quantity_kg: string
  quantity_description: string | null
  status: string
  food_condition: string
  food_type: string
  is_urgent: boolean
  expiry_time: string | null
  pickup_city: string
  pickup_address: string
  contact_number: string
}

const tagColorMap: Record<string, string> = {
  green:  'bg-green-50 text-green-700',
  blue:   'bg-blue-50 text-blue-700',
  orange: 'bg-orange-50 text-orange-700',
  red:    'bg-red-50 text-red-700',
}

function buildTags(foodType: string, foodCondition: string, isUrgent: boolean) {
  const tags: { label: string; color: string }[] = []
  if (foodType === 'veg')   tags.push({ label: 'Veg',      color: 'green' })
  if (foodType === 'vegan') tags.push({ label: 'Vegan',    color: 'green' })
  if (foodType === 'non_veg') tags.push({ label: 'Non-Veg', color: 'red' })
  if (foodCondition === 'cooked')   tags.push({ label: 'Cooked',   color: 'green' })
  if (foodCondition === 'raw')      tags.push({ label: 'Raw',      color: 'orange' })
  if (foodCondition === 'packaged') tags.push({ label: 'Packaged', color: 'blue' })
  if (isUrgent) tags.push({ label: 'Urgent', color: 'red' })
  return tags
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const foodTypeFilters = ['All', 'Cooked', 'Raw', 'Packaged', 'Urgent']

export default function NGONearbyPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading]     = useState(true)
  const [typeFilter, setType]     = useState('All')
  const [search, setSearch]       = useState('')
  const [accepting, setAccepting] = useState<Record<string, boolean>>({})

  const fetchDonations = useCallback(async (filter: string) => {
    setLoading(true)
    try {
      let url = '/api/receiver/donations?limit=50'
      if (filter === 'Cooked')   url += '&food_condition=cooked'
      if (filter === 'Raw')      url += '&food_condition=raw'
      if (filter === 'Packaged') url += '&food_condition=packaged'
      if (filter === 'Urgent')   url += '&is_urgent=true'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setDonations(json.data?.donations ?? [])
    } catch {
      setDonations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDonations(typeFilter)
  }, [fetchDonations, typeFilter])

  async function handleAccept(id: string) {
    setAccepting((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/donations/${id}/accept`, { method: 'POST' })
      if (res.ok) {
        await fetchDonations(typeFilter)
      }
    } finally {
      setAccepting((prev) => ({ ...prev, [id]: false }))
    }
  }

  const filtered = donations.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.pickup_city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="ngo" userName="" userRole="NGO" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Nearby Donations</h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Loading…'
                : `${filtered.length} donation${filtered.length !== 1 ? 's' : ''} available · Nearest first`}
            </p>
          </div>
          <button
            onClick={() => fetchDonations(typeFilter)}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="px-8 py-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by food name or city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-white py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-border bg-white p-1">
              {foodTypeFilters.map((f) => (
                <button
                  key={f}
                  onClick={() => setType(f)}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    typeFilter === f ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
              <SlidersHorizontal size={14} />
              More Filters
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm">
                No donations match your filters right now.
              </div>
            ) : (
              filtered.map((d) => {
                const tags = buildTags(d.food_type, d.food_condition, d.is_urgent)
                return (
                  <div
                    key={d.id}
                    className={`rounded-2xl border bg-card px-5 py-4 shadow-sm ${
                      d.is_urgent ? 'border-orange-200' : 'border-border'
                    }`}
                  >
                    {d.is_urgent && (
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                        Pickup by {formatTime(d.expiry_time)} — urgent
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-4xl">
                        🍱
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <h3 className="font-semibold text-foreground">{d.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {d.quantity_description ?? `${d.quantity_kg} kg`} ·{' '}
                          {d.food_condition.charAt(0).toUpperCase() + d.food_condition.slice(1)} Food
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> Pickup by {formatTime(d.expiry_time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {d.pickup_city}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={12} /> {d.contact_number}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tags.map((tag) => (
                            <span
                              key={tag.label}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                tagColorMap[tag.color] ?? 'bg-secondary text-foreground'
                              }`}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          onClick={() => handleAccept(d.id)}
                          disabled={accepting[d.id]}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {accepting[d.id] ? 'Accepting…' : 'Accept'}
                        </button>
                        <Link
                          href={`/ngo/donations/${d.id}`}
                          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary text-center"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
