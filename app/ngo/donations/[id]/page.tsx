'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Clock, MapPin, Phone, CheckCircle2, X, Loader2, AlertCircle, Store, Utensils } from 'lucide-react'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'

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
  donation_images: { image_url: string; is_primary: boolean }[]
  donor_profiles: { business_name: string; city: string; phone: string | null; verification_status: string } | null
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function NGODonationDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [donation, setDonation] = useState<DonationDetail | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [acting,   setActing]   = useState<'accept' | 'reject' | null>(null)

  useEffect(() => {
    fetch(`/api/donations/${id}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error?.message ?? 'Failed to load donation')
        setDonation(json.data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleAccept() {
    setActing('accept')
    setError(null)
    try {
      const res  = await fetch(`/api/donations/${id}/accept`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Could not accept')
      router.push('/ngo/pickups')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Accept failed')
      setActing(null)
    }
  }

  async function handleReject() {
    setActing('reject')
    setError(null)
    try {
      const res  = await fetch(`/api/donations/${id}/reject`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Could not reject')
      router.push('/ngo/nearby')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed')
      setActing(null)
    }
  }

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

  if (error && !donation) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <DashboardSidebar role="ngo" />
        <main className="flex flex-1 items-center justify-center px-8">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle size={16} /> {error}
          </div>
        </main>
      </div>
    )
  }

  if (!donation) return null

  const acceptable = ['available', 'pending_acceptance'].includes(donation.status)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="ngo" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center border-b border-border bg-card px-8 py-4">
          <Link href="/ngo/nearby" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={15} /> Back to Nearby Donations
          </Link>
        </div>

        <div className="px-8 py-6 space-y-5 max-w-3xl">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Food card */}
          <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-orange-50"><Utensils className="h-10 w-10 text-orange-500" /></div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground">{donation.title}</h1>
                  {donation.is_urgent && (
                    <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">Urgent</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {donation.food_condition} food · {donation.quantity_description ?? `${donation.quantity_kg} kg`}
                  {donation.serves_approx ? ` · ~${donation.serves_approx} people` : ''}
                </p>
                {donation.donor_profiles && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Store size={11} />
                    <span className="font-medium text-foreground">{donation.donor_profiles.business_name}</span>
                    {donation.donor_profiles.verification_status === 'verified' && (
                      <CheckCircle2 size={12} className="text-primary" />
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="space-y-2.5 border-t border-border pt-3">
              {[
                ['Pickup by',       fmt(donation.expiry_time)],
                ['Preferred Time',  fmt(donation.preferred_pickup_time)],
                ['Donor Phone',     donation.contact_number],
                ['Food Type',       `${donation.food_type.replace('_', ' ')} · ${donation.food_condition}`],
                ...(donation.pickup_instructions ? [['Instructions', donation.pickup_instructions]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex items-start gap-3 text-sm">
                  <span className="w-32 shrink-0 text-muted-foreground">{k}</span>
                  <span className="font-medium text-foreground capitalize">{v}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 space-y-1">
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin size={13} /> {donation.pickup_address}, {donation.pickup_city}
              </p>
              {donation.donor_profiles?.phone && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone size={13} /> {donation.donor_profiles.phone}
                </p>
              )}
            </div>

            {donation.is_urgent && (
              <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                <Clock size={14} className="mt-0.5 shrink-0 text-orange-500" />
                This is an urgent donation — it must be picked up before {fmt(donation.expiry_time)}.
              </div>
            )}

            {acceptable ? (
              <>
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-blue-500" />
                  Once accepted, this donation is reserved and other NGOs cannot claim it.
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleAccept}
                    disabled={!!acting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {acting === 'accept' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {acting === 'accept' ? 'Accepting…' : 'Accept Donation'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!!acting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-destructive bg-white py-3 text-sm font-semibold text-destructive hover:bg-red-50 disabled:opacity-60"
                  >
                    {acting === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
                    {acting === 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
                This donation is no longer available for acceptance (status: <span className="capitalize font-medium text-foreground">{donation.status.replace(/_/g, ' ')}</span>).
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
