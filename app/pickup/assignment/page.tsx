'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Store, Phone, MapPin, Clock, Package, CheckCircle2, Building2, Loader2, AlertCircle } from 'lucide-react'
import { StatusBadge } from '@/components/mealsaver/status-badge'

interface PickupDetail {
  id: string
  pickup_status: string
  pickup_type: string
  pickup_notes: string | null
  scheduled_pickup_time: string | null
  assigned_at: string
  donation_id: string
  donations: {
    id: string
    title: string
    status: string
    pickup_address: string
    pickup_city: string
    contact_number: string
    pickup_instructions: string | null
  } | null
  receiver_profiles: { organization_name: string; phone: string | null } | null
}

interface DonorProfile {
  business_name: string
  phone: string | null
  city: string
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

function AssignmentContent() {
  const searchParams = useSearchParams()
  const pickupId = searchParams.get('id')

  const [pickup,  setPickup]  = useState<PickupDetail | null>(null)
  const [donor,   setDonor]   = useState<DonorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!pickupId) { setLoading(false); return }

    fetch(`/api/pickups/${pickupId}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error?.message ?? 'Failed to load pickup')
        const p: PickupDetail = json.data
        setPickup(p)
        if (p.donations?.id) {
          fetch(`/api/donations/${p.donations.id}`)
            .then((dr) => dr.json())
            .then((dj) => { if (dj.data?.donor_profiles) setDonor(dj.data.donor_profiles) })
            .catch(() => {})
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [pickupId])

  if (!pickupId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <p className="font-semibold text-foreground">No pickup ID provided</p>
          <p className="text-sm text-muted-foreground">Navigate here from the pickups page.</p>
          <Link href="/ngo/pickups" className="text-sm text-primary hover:underline">Go to Pickups</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !pickup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle size={16} /> {error ?? 'Pickup not found'}
        </div>
      </div>
    )
  }

  const d = pickup.donations

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Pickup Assignment</h1>
            <p className="text-sm text-muted-foreground">Details for this pickup</p>
          </div>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <StatusBadge status={pickup.pickup_status as any} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            {/* Assignment details */}
            <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Assignment Details</h2>
              {[
                ['Pickup Method',  pickup.pickup_type.replace(/_/g, ' ')],
                ['Assigned At',    fmt(pickup.assigned_at)],
                ['Scheduled',      fmt(pickup.scheduled_pickup_time)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {k === 'Assigned At' || k === 'Scheduled' ? <Clock size={13} /> : <Package size={13} />}
                    {k}
                  </span>
                  <span className="font-medium text-foreground capitalize">{v}</span>
                </div>
              ))}
            </div>

            {/* Donor */}
            <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-2">
              <h2 className="text-sm font-semibold text-foreground">Donor</h2>
              <div className="flex items-center gap-1.5">
                <Store size={13} className="text-primary" />
                <p className="font-semibold text-foreground">{donor?.business_name ?? 'Donor'}</p>
              </div>
              {d?.contact_number && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone size={12} /> {d.contact_number}
                </p>
              )}
              {d && (
                <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin size={12} className="mt-0.5 shrink-0" />
                  {d.pickup_address}, {d.pickup_city}
                </p>
              )}
            </div>

            {/* Receiver */}
            {pickup.receiver_profiles && (
              <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-2">
                <h2 className="text-sm font-semibold text-foreground">Receiver NGO</h2>
                <div className="flex items-center gap-1.5">
                  <Building2 size={13} className="text-primary" />
                  <p className="font-semibold text-foreground">{pickup.receiver_profiles.organization_name}</p>
                </div>
                {pickup.receiver_profiles.phone && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone size={12} /> {pickup.receiver_profiles.phone}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-5">
            {/* Donation details */}
            {d && (
              <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Donation</h2>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-3xl">🍛</div>
                  <div>
                    <p className="font-semibold text-foreground">{d.title}</p>
                    <p className="text-sm text-muted-foreground">{d.pickup_city}</p>
                  </div>
                </div>
                {d.pickup_instructions && (
                  <p className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">{d.pickup_instructions}</p>
                )}
                <Link
                  href={`/ngo/donations/${d.id}`}
                  className="block text-center text-sm font-medium text-primary hover:underline"
                >
                  View Donation Details →
                </Link>
              </div>
            )}

            {/* Notes */}
            {pickup.pickup_notes && (
              <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-2">
                <h2 className="text-sm font-semibold text-foreground">Notes</h2>
                <p className="text-sm text-muted-foreground">{pickup.pickup_notes}</p>
              </div>
            )}

            <Link
              href={`/pickup/verify?id=${pickup.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <CheckCircle2 size={16} />
              Verify OTP at Pickup
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PickupAssignmentPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    }>
      <AssignmentContent />
    </Suspense>
  )
}
