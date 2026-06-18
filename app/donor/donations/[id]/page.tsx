'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft, Phone, CheckCircle2, Circle,
  Store, Building2, Loader2, AlertCircle, Utensils, Leaf,
} from 'lucide-react'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'
import { MatchMap } from '@/components/mealsaver/match-map'
import { OtpHandoverForm } from '@/components/mealsaver/otp-handover-form'

interface DonationDetail {
  id: string
  title: string
  description: string | null
  status: string
  food_type: string
  food_condition: string
  quantity_kg: string
  quantity_description: string | null
  serves_approx: number | null
  preparation_time: string | null
  expiry_time: string | null
  preferred_pickup_time: string | null
  pickup_address: string
  pickup_city: string
  pickup_instructions: string | null
  contact_number: string
  is_urgent: boolean
  created_at: string
  updated_at: string
  donation_images: { image_url: string; is_primary: boolean }[]
  donor_profiles: { business_name: string; city: string; phone: string | null } | null
}

const STATUS_ORDER = ['available', 'pending_acceptance', 'accepted', 'pickup_assigned', 'picked_up', 'delivered']

const STEPS = [
  { key: 'available',          label: 'Uploaded' },
  { key: 'pending_acceptance', label: 'NGOs\nNotified' },
  { key: 'accepted',           label: 'Accepted\nby NGO' },
  { key: 'pickup_assigned',    label: 'Pickup\nAssigned' },
  { key: 'picked_up',          label: 'Picked Up' },
  { key: 'delivered',          label: 'Delivered' },
]

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
}

function MatchMapSection({ donationId }: { donationId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapData, setMapData] = useState<any>(null)
  useEffect(() => {
    fetch(`/api/donations/${donationId}/match-status`)
      .then(res => res.json())
      .then(json => {
        if (json.data) setMapData(json.data)
      })
      .catch(console.error)
  }, [donationId])

  if (!mapData || !mapData.donation?.lat) return null

  return (
    <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-3">
      <h2 className="font-semibold text-foreground">Spatial Match Routing</h2>
      <p className="text-sm text-muted-foreground pb-2">
        Live map showing the routed ping to nearby verified NGOs.
      </p>
      <MatchMap 
        donorLocation={{ lat: mapData.donation.lat, lng: mapData.donation.lng }} 
        receivers={mapData.notifiedReceivers} 
      />
    </div>
  )
}

export default function DonorDonationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [donation,   setDonation]   = useState<DonationDetail | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    fetch(`/api/donations/${id}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error?.message ?? 'Failed to load')
        setDonation(json.data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCancel() {
    if (!confirm('Cancel this donation? This cannot be undone.')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/donations/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by donor' }),
      })
      if (res.ok) router.push('/donor/donations')
      else {
        const j = await res.json()
        setError(j.error?.message ?? 'Could not cancel')
      }
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <DashboardSidebar role="donor" />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </main>
      </div>
    )
  }

  if (error || !donation) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <DashboardSidebar role="donor" />
        <main className="flex flex-1 items-center justify-center px-8">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle size={16} /> {error ?? 'Donation not found'}
          </div>
        </main>
      </div>
    )
  }

  const statusIdx  = STATUS_ORDER.indexOf(donation.status)
  const isCancelled = ['cancelled', 'rejected', 'expired'].includes(donation.status)
  const canCancel   = ['available', 'pending_acceptance', 'accepted'].includes(donation.status)
  const canEdit     = donation.status === 'available'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="donor" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
          <Link href="/donor/donations" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={15} /> Back to Donations
          </Link>
          <span className="text-xs text-muted-foreground truncate max-w-48">ID: {donation.id.slice(0, 8)}…</span>
        </div>

        {error && (
          <div className="mx-8 mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="px-8 py-6 space-y-6 max-w-4xl">
          {/* Title + status stepper */}
          <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-orange-50"><Utensils className="h-10 w-10 text-orange-500" /></div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{donation.title}</h1>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <StatusBadge status={donation.status as any} />
                  {donation.is_urgent && (
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">Urgent</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    donation.food_type.replace('_', ' '),
                    donation.food_condition,
                    donation.quantity_description ?? `${donation.quantity_kg} kg`,
                  ].map((tag) => (
                    <span key={tag} className="rounded-full border border-border bg-secondary px-2.5 py-1 font-medium text-foreground capitalize">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress stepper */}
            {!isCancelled && (
              <div className="mt-6 flex items-center overflow-x-auto gap-0">
                {STEPS.map((step, i) => {
                  const done    = statusIdx >= i
                  const current = statusIdx === i
                  return (
                    <div key={step.key} className="flex items-center">
                      <div className="flex flex-col items-center gap-1 min-w-[80px] text-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                          done && !current ? 'border-primary bg-primary text-white'
                          : current        ? 'border-orange-400 bg-orange-400 text-white'
                          : 'border-border bg-background text-muted-foreground'
                        }`}>
                          {done && !current ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        </div>
                        <p className="whitespace-pre-line text-[10px] font-medium leading-tight text-foreground">{step.label}</p>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`mx-1 h-0.5 w-8 shrink-0 ${done ? 'bg-primary' : 'bg-border'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Details + location */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-3">
              <h2 className="font-semibold text-foreground">Donation Details</h2>
              {[
                ['Food Type',       `${donation.food_condition} · ${donation.food_type.replace('_', ' ')}`],
                ['Quantity',        donation.quantity_description ?? `${donation.quantity_kg} kg`],
                ...(donation.serves_approx ? [['Serves Approx', `${donation.serves_approx} people`]] : []),
                ...(donation.preparation_time ? [['Prepared At', fmt(donation.preparation_time)]] : []),
                ['Expiry',          fmt(donation.expiry_time)],
                ['Preferred Pickup', fmt(donation.preferred_pickup_time)],
                ['Contact',         donation.contact_number],
                ...(donation.pickup_instructions ? [['Instructions', donation.pickup_instructions]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right font-medium text-foreground">{v}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-foreground">Location &amp; Donor</h2>
                <div>
                  <div className="flex items-center gap-1.5 mb-1 text-sm font-medium text-foreground">
                    <Store size={13} className="text-primary" /> Your Business
                  </div>
                  {donation.donor_profiles && (
                    <p className="text-sm font-semibold text-muted-foreground">{donation.donor_profiles.business_name}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{donation.pickup_address}, {donation.pickup_city}</p>
                  {donation.donor_profiles?.phone && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone size={11} /> {donation.donor_profiles.phone}
                    </p>
                  )}
                </div>

                {['accepted', 'pickup_assigned', 'picked_up', 'delivered'].includes(donation.status) && (
                  <>
                    <div className="h-px bg-border" />
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 text-sm font-medium text-foreground">
                        <Building2 size={13} className="text-primary" /> Receiver NGO
                      </div>
                      <p className="text-sm text-muted-foreground">
                        An NGO has accepted this donation. Check back for pickup details.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-secondary/40 px-5 py-4 text-sm">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Leaf className="h-5 w-5 text-green-500" /> Thank you for your generosity!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Posted {fmt(donation.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Map Section */}
          {!isCancelled && statusIdx >= 1 && donation.status !== 'pickup_assigned' && donation.status !== 'picked_up' && donation.status !== 'delivered' && (
            <MatchMapSection donationId={id} />
          )}

          {/* OTP Handover Section */}
          {donation.status === 'pickup_assigned' && (
            <OtpHandoverForm donationId={id} />
          )}

          {/* Actions */}
          {(canEdit || canCancel) && (
            <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm flex flex-col gap-3">
              <p className="font-semibold text-foreground">Manage Donation</p>
              <div className="flex gap-3">
                {canEdit && (
                  <Link
                    href={`/donor/donations/${id}/edit`}
                    className="flex-1 rounded-lg border border-border bg-white py-2.5 text-center text-sm font-semibold text-foreground hover:bg-secondary"
                  >
                    Edit Donation
                  </Link>
                )}
                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 rounded-lg border border-destructive bg-white py-2.5 text-sm font-semibold text-destructive hover:bg-red-50 disabled:opacity-60"
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel Donation'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
