'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, Lock, Loader2, AlertCircle } from 'lucide-react'

const checklist = [
  'Food checked visually',
  'Quantity confirmed',
  'Packing condition okay',
]

function PickupVerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pickupId = searchParams.get('id')

  const [checked, setChecked] = useState<boolean[]>(checklist.map(() => false))
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const toggle = (i: number) =>
    setChecked(prev => prev.map((v, j) => (j === i ? !v : v)))

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = otp.map((d, i) => (i === index ? digit : d))
    setOtp(next)
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify() {
    if (!pickupId) return setError('No pickup ID provided. Please use the link from your pickups page.')

    const code = otp.join('')
    if (code.length !== 6) return setError('Please enter all 6 digits of the OTP.')
    if (!checked.every(Boolean)) return setError('Please complete all checklist items before verifying.')

    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/pickups/${pickupId}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json?.error?.message ?? 'Verification failed. Please check the OTP and try again.')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push(`/delivery/confirm?pickup_id=${pickupId}`), 1500)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card px-7 py-10 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 size={28} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">OTP Verified!</h2>
          <p className="text-sm text-muted-foreground">Redirecting to delivery confirmation…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card px-7 py-8 shadow-sm space-y-6">
        <h1 className="text-xl font-bold text-foreground">Pickup Verification</h1>

        {!pickupId && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            No pickup ID in URL. Please use the Verify OTP button from your Pickups page.
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Verify Pickup Checklist</h2>
          {checklist.map((item, i) => (
            <label
              key={item}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggle(i)}
                className="h-4 w-4 accent-primary"
              />
              <span className={`text-sm ${checked[i] ? 'text-primary font-medium' : 'text-foreground'}`}>
                {item}
              </span>
              {checked[i] && <CheckCircle2 size={16} className="ml-auto text-primary" />}
            </label>
          ))}
        </div>

        {/* OTP input */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Enter 6-Digit OTP</h2>
          <p className="text-xs text-muted-foreground">
            The donor received this OTP — ask them to share it with you.
          </p>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="h-12 w-12 rounded-xl border-2 border-border bg-background text-center text-xl font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || !pickupId}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Verifying…' : 'Confirm Pickup'}
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock size={11} />
          OTP verification ensures food safety and builds trust.
        </div>
      </div>
    </div>
  )
}

export default function PickupVerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    }>
      <PickupVerifyContent />
    </Suspense>
  )
}
