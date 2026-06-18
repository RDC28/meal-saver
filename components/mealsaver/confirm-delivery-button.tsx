'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

export function ConfirmDeliveryButton({ pickupId }: { pickupId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_assignment_id: pickupId,
          is_food_safe: true,
          food_condition_on_arrival: 'excellent'
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json?.error?.message ?? 'Failed to confirm delivery.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-center text-sm font-semibold text-green-700 flex items-center justify-center gap-2">
        <CheckCircle2 size={18} /> Delivery Confirmed!
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? 'Confirming…' : 'Confirm Safe Delivery'}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        Clicking this confirms the food has arrived safely at your facility.
      </p>
    </div>
  )
}
