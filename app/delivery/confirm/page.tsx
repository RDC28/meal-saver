'use client'

import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface PickupDetail {
  id: string
  pickup_status: string
  otp_verified: boolean
  donation_id: string
  donations: {
    title: string
    pickup_city: string
  } | null
  receiver_profiles: { organization_name: string } | null
}

function DeliveryConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pickupId = searchParams.get('pickup_id') ?? searchParams.get('id')

  const [pickup,    setPickup]    = useState<PickupDetail | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [confirmed,  setConfirmed]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [checks,    setChecks]    = useState([false, false, false])

  const checklist = ['Quantity received correctly', 'Food condition confirmed safe', 'Delivery completed on time']

  useEffect(() => {
    if (!pickupId) { setLoading(false); return }
    fetch(`/api/pickups/${pickupId}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error?.message ?? 'Failed to load')
        setPickup(json.data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [pickupId])

  async function handleConfirm() {
    if (!pickupId) return
    setConfirming(true)
    setError(null)
    try {
      const res  = await fetch(`/api/pickups/${pickupId}/complete`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to confirm')
      setConfirmed(true)
      setTimeout(() => router.push('/ngo/pickups'), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to confirm')
    } finally {
      setConfirming(false)
    }
  }

  if (!pickupId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <p className="font-semibold text-foreground">No pickup ID provided</p>
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card px-7 py-8 shadow-sm space-y-6">
        {confirmed ? (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 size={36} className="text-primary" />
              </div>
            </div>
            <p className="text-lg font-bold text-foreground">Delivery Confirmed!</p>
            <p className="text-sm text-muted-foreground">Thank you for completing this delivery. Redirecting…</p>
          </div>
        ) : (
          <>
            {/* Banner */}
            <div className="flex items-center gap-3 rounded-xl bg-primary px-4 py-3">
              <CheckCircle2 size={20} className="shrink-0 text-white" />
              <div>
                <p className="text-sm font-semibold text-white">Confirm Delivery</p>
                <p className="text-xs text-green-100">
                  {pickup?.donations?.title
                    ? `"${pickup.donations.title}"`
                    : 'Complete this delivery'}
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Checklist */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Confirm Before Completing</h2>
              {checklist.map((item, i) => (
                <button
                  key={item}
                  onClick={() => setChecks((c) => c.map((v, j) => j === i ? !v : v))}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors ${
                    checks[i] ? 'border-primary bg-primary/5' : 'border-border bg-background'
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    checks[i] ? 'border-primary bg-primary' : 'border-border'
                  }`}>
                    {checks[i] && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-foreground">{item}</span>
                </button>
              ))}
            </div>

            {/* Info */}
            {pickup && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">NGO</p>
                  <p className="font-medium text-foreground">{pickup.receiver_profiles?.organization_name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium text-foreground">{pickup.donations?.pickup_city ?? '—'}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={confirming || !checks.every(Boolean)}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {confirming ? <Loader2 size={16} className="mx-auto animate-spin" /> : 'Confirm Delivery'}
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Check all boxes above to enable confirmation
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function DeliveryConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    }>
      <DeliveryConfirmContent />
    </Suspense>
  )
}
