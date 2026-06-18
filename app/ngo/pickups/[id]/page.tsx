'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft, CheckCircle2, Phone, MapPin, Clock,
  Store, Building2, Loader2, AlertCircle, Utensils,
} from 'lucide-react'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'
import { ConfirmDeliveryButton } from '@/components/mealsaver/confirm-delivery-button'

interface PickupDetail {
  id: string
  pickup_status: string
  pickup_type: string
  pickup_notes: string | null
  scheduled_pickup_time: string | null
  assigned_at: string
  otp_verified: boolean
  otp_code: string | null
  donation_id: string
  donations: {
    id: string
    title: string
    status: string
    pickup_address: string
    pickup_city: string
    pickup_instructions: string | null
    contact_number: string
    donation_images: { image_url: string; is_primary: boolean }[]
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

export default function NGOPickupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [pickup,  setPickup]  = useState<PickupDetail | null>(null)
  const [donor,   setDonor]   = useState<DonorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/pickups/${id}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error?.message ?? 'Failed to load pickup')
        const p: PickupDetail = json.data
        setPickup(p)

        // Fetch donor profile via the donation
        if (p.donations?.id) {
          fetch(`/api/donations/${p.donations.id}`)
            .then((dr) => dr.json())
            .then((dj) => {
              if (dj.data?.donor_profiles) setDonor(dj.data.donor_profiles)
            })
            .catch(() => {})
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <DashboardSidebar role="ngo" />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </main>
      </div>
    )
  }

  if (error || !pickup) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <DashboardSidebar role="ngo" />
        <main className="flex flex-1 items-center justify-center px-8">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle size={16} /> {error ?? 'Pickup not found'}
          </div>
        </main>
      </div>
    )
  }

  const d = pickup.donations

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="ngo" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center border-b border-border bg-card px-8 py-4">
          <Link href="/ngo/pickups" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={15} /> Back to Pickups
          </Link>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Acceptance banner */}
          <div className="flex items-center gap-3 rounded-2xl bg-primary px-6 py-4 shadow-sm">
            <CheckCircle2 size={22} className="shrink-0 text-white" />
            <div>
              <p className="font-semibold text-white">Donation Accepted</p>
              <p className="text-sm text-green-100">Assigned {fmt(pickup.assigned_at)}</p>
            </div>
            <div className="ml-auto">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <StatusBadge status={pickup.pickup_status as any} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Left */}
            <div className="space-y-5">
              {/* Food info */}
              {d && (
                <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-orange-50"><Utensils className="h-8 w-8 text-orange-500" /></div>
                    <div>
                      <h2 className="font-semibold text-foreground">{d.title}</h2>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin size={12} /> {d.pickup_address}, {d.pickup_city}
                      </p>
                    </div>
                  </div>
                  {d.pickup_instructions && (
                    <div className="rounded-lg bg-secondary/50 px-3 py-2.5 text-sm text-muted-foreground">
                      {d.pickup_instructions}
                    </div>
                  )}
                </div>
              )}

              {/* Pickup assignment */}
              <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-foreground">Pickup Assignment</h2>
                {[
                  ['Pickup by',    fmt(pickup.scheduled_pickup_time ?? null)],
                  ['Pickup type',  pickup.pickup_type.replace(/_/g, ' ')],
                  ['OTP verified', pickup.otp_verified ? 'Yes' : 'Not yet'],
                  ...(pickup.pickup_notes ? [['Notes', pickup.pickup_notes]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-foreground capitalize">{v}</span>
                  </div>
                ))}
                {!pickup.otp_verified && pickup.otp_code && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-center">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Secure Handover Code</p>
                    <p className="text-xs text-blue-700 mb-3">Show this code to the donor when you arrive to pick up the food.</p>
                    <div className="text-3xl font-mono font-bold tracking-widest text-blue-700 bg-white py-3 rounded-lg border border-blue-200 shadow-sm">
                      {pickup.otp_code.substring(0,3)}-{pickup.otp_code.substring(3)}
                    </div>
                  </div>
                )}
                {pickup.pickup_status === 'completed' && (
                  <ConfirmDeliveryButton pickupId={pickup.id} />
                )}
              </div>
            </div>

            {/* Right */}
            <div className="space-y-5">
              {/* Donor + receiver */}
              <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-4">
                <h2 className="font-semibold text-foreground">Contact Details</h2>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Store size={14} className="text-primary" />
                    <p className="font-semibold text-foreground">
                      {donor?.business_name ?? 'Donor'}
                    </p>
                  </div>
                  {d && (
                    <p className="pl-5 text-sm text-muted-foreground">
                      {d.pickup_address}, {d.pickup_city}
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 pl-5 text-sm text-muted-foreground">
                    <Phone size={12} /> {d?.contact_number ?? donor?.phone ?? '—'}
                  </p>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-primary" />
                    <p className="font-semibold text-foreground">
                      {pickup.receiver_profiles?.organization_name ?? 'Your NGO'}
                    </p>
                  </div>
                  {pickup.receiver_profiles?.phone && (
                    <p className="flex items-center gap-1.5 pl-5 text-sm text-muted-foreground">
                      <Phone size={12} /> {pickup.receiver_profiles.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Pickup timing */}
              <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-3">
                <h2 className="font-semibold text-foreground">Timing</h2>
                {[
                  ['Assigned at',  fmt(pickup.assigned_at)],
                  ['Scheduled',    fmt(pickup.scheduled_pickup_time)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock size={13} /> {k}
                    </span>
                    <span className="font-semibold text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
