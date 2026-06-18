'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Lock, Loader2, AlertCircle } from 'lucide-react'

export function OtpHandoverForm({ donationId }: { donationId: string }) {
  const router = useRouter()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Slight delay to ensure inputs are mounted
    const timer = setTimeout(() => inputRefs.current[0]?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = otp.map((d, i) => (i === index ? digit : d))
    setOtp(next)
    
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify() {
    const code = otp.join('')
    if (code.length !== 6) return setError('Please enter all 6 digits of the OTP.')

    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/donations/${donationId}/verify-handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: code }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json?.error?.message ?? 'Verification failed. Please check the OTP and try again.')
        setLoading(false)
        return
      }

      setSuccess(true)
      // Hard refresh to update parent server states or navigate naturally
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
      <div className="rounded-2xl border border-border bg-card px-6 py-10 shadow-sm text-center animate-in fade-in zoom-in duration-500">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">Handover Verified!</h2>
        <p className="text-sm text-muted-foreground">The donation has been securely picked up.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-6 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <Lock size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Verify Secure Handover</h2>
          <p className="text-sm text-muted-foreground">
            The NGO representative has arrived. Ask them for their 6-digit Secure Handover Code to release the food.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 justify-center md:justify-start">
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
              className="h-12 w-10 sm:w-12 rounded-xl border-2 border-primary/20 bg-white text-center text-xl font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
          className="flex w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Verifying…' : 'Complete Handover'}
        </button>
      </div>
    </div>
  )
}
