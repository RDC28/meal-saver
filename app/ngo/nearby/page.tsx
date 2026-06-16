'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, MapPin, Phone, RefreshCw, Search, SlidersHorizontal, Utensils } from 'lucide-react'
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
  distance_km: number | string | null
}

const foodTypeFilters = ['All', 'Cooked', 'Raw', 'Packaged', 'Urgent']
const tagColorMap: Record<string, string> = {
  green: 'bg-green-50 text-green-700',
  blue: 'bg-blue-50 text-blue-700',
  orange: 'bg-orange-50 text-orange-700',
  red: 'bg-red-50 text-red-700',
  slate: 'bg-slate-100 text-slate-700',
}

function formatDistance(value: number | string | null): string | null {
  if (value == null) return null
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(n)) return null
  if (n < 1) return `${Math.round(n * 1000)} m`
  return `${n.toFixed(1)} km`
}

function formatTime(iso: string | null): string {
  if (!iso) return 'time not set'
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function buildTags(foodType: string, foodCondition: string, isUrgent: boolean, status: string) {
  const tags: { label: string; color: string }[] = []
  if (foodType === 'veg') tags.push({ label: 'Veg', color: 'green' })
  if (foodType === 'vegan') tags.push({ label: 'Vegan', color: 'green' })
  if (foodType === 'non_veg') tags.push({ label: 'Non-Veg', color: 'red' })
  if (foodCondition === 'cooked') tags.push({ label: 'Cooked', color: 'green' })
  if (foodCondition === 'raw') tags.push({ label: 'Raw', color: 'orange' })
  if (foodCondition === 'packaged') tags.push({ label: 'Packaged', color: 'blue' })
  if (status === 'pending_acceptance') tags.push({ label: 'Awaiting claim', color: 'slate' })
  if (isUrgent) tags.push({ label: 'Urgent', color: 'red' })
  return tags
}

async function readError(res: Response) {
  const json = await res.json().catch(() => null)
  return json?.error?.message ?? `Request failed (${res.status})`
}

export default function NGONearbyPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setType] = useState('All')
  const [search, setSearch] = useState('')
  const [accepting, setAccepting] = useState<Record<string, boolean>>({})
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchDonations = useCallback(async (filter: string) => {
    setLoading(true)
    setFetchError(null)

    try {
      let url = '/api/receiver/donations?limit=50'
      if (filter === 'Cooked') url += '&food_condition=cooked'
      if (filter === 'Raw') url += '&food_condition=raw'
      if (filter === 'Packaged') url += '&food_condition=packaged'
      if (filter === 'Urgent') url += '&is_urgent=true'

      const res = await fetch(url)
      if (!res.ok) throw new Error(await readError(res))

      const json = await res.json()
      setDonations(json.data?.donations ?? [])
    } catch (e) {
      setDonations([])
      setFetchError(e instanceof Error ? e.message : 'Failed to fetch nearby donations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDonations(typeFilter)
  }, [fetchDonations, typeFilter])

  async function handleAccept(id: string) {
    setAccepting(prev => ({ ...prev, [id]: true }))
    setFetchError(null)

    try {
      const res = await fetch(`/api/donations/${id}/accept`, { method: 'POST' })
      if (!res.ok) throw new Error(await readError(res))
      await fetchDonations(typeFilter)
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to accept donation')
    } finally {
      setAccepting(prev => ({ ...prev, [id]: false }))
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return donations
    return donations.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.pickup_city.toLowerCase().includes(q) ||
      d.pickup_address.toLowerCase().includes(q)
    )
  }, [donations, search])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="ngo" userName="" userRole="NGO" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Nearby Donations</h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Loading...'
                : fetchError
                  ? fetchError
                  : `${filtered.length} donation${filtered.length !== 1 ? 's' : ''} available · nearest first`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchDonations(typeFilter)}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="px-8 py-6">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search food, area, or address"
                className="w-full rounded-lg border border-border bg-white py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-white p-1">
              {foodTypeFilters.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setType(f)}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                    typeFilter === f ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
            >
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
              <div className="rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm">
                {fetchError ?? 'No donations match your filters right now.'}
              </div>
            ) : (
              filtered.map(d => {
                const tags = buildTags(d.food_type, d.food_condition, d.is_urgent, d.status)
                const distance = formatDistance(d.distance_km)

                return (
                  <div
                    key={d.id}
                    className={`rounded-lg border bg-card px-5 py-4 shadow-sm ${
                      d.is_urgent ? 'border-orange-200' : 'border-border'
                    }`}
                  >
                    {d.is_urgent && (
                      <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                        Pickup by {formatTime(d.expiry_time)} - urgent
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        <Utensils size={28} />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h3 className="font-semibold text-foreground">{d.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {d.quantity_description ?? `${d.quantity_kg} kg`} ·{' '}
                          {d.food_condition.charAt(0).toUpperCase() + d.food_condition.slice(1)} food
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Pickup by {formatTime(d.expiry_time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {d.pickup_city}
                            {distance && (
                              <span className="ml-1 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                {distance}
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {d.contact_number}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tags.map(tag => (
                            <span
                              key={tag.label}
                              className={`rounded-md px-2.5 py-0.5 text-xs font-medium ${
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
                          type="button"
                          onClick={() => handleAccept(d.id)}
                          disabled={accepting[d.id]}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                        >
                          {accepting[d.id] ? 'Accepting...' : 'Accept'}
                        </button>
                        <Link
                          href={`/ngo/donations/${d.id}`}
                          className="rounded-lg border border-border bg-white px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-secondary"
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
