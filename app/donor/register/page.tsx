'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, UserCircle2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/mealsaver/logo'

type FormState = {
  business_name: string
  business_type: string
  full_name: string
  phone: string
  email: string
  address: string
  city: string
  food_license_number: string
  password: string
  confirm_password: string
}

const INITIAL: FormState = {
  business_name: '',
  business_type: 'restaurant',
  full_name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  food_license_number: '',
  password: '',
  confirm_password: '',
}

export default function DonorRegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>(INITIAL)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  // Controlled input helper
  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // ── Client-side validation
    if (!form.full_name.trim())        return setError('Please enter your name')
    if (!form.email.trim())            return setError('Please enter your email')
    if (!form.business_name.trim())    return setError('Please enter your business name')
    if (!form.address.trim())          return setError('Please enter your address')
    if (!form.city.trim())             return setError('Please enter your city')
    if (form.password.length < 8)      return setError('Password must be at least 8 characters')
    if (form.password !== form.confirm_password) return setError('Passwords do not match')
    if (!agreed)                       return setError('Please agree to the terms to continue')

    setLoading(true)

    try {
      // ── Create account + profile in one request
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:               form.email.trim(),
          password:            form.password,
          full_name:           form.full_name.trim(),
          phone:               form.phone ? `+91${form.phone.replace(/\D/g, '')}` : undefined,
          role:                'donor',
          business_name:       form.business_name.trim(),
          business_type:       form.business_type,
          address:             form.address.trim(),
          city:                form.city.trim(),
          food_license_number: form.food_license_number.trim() || undefined,
        }),
      })

      const signupJson = await safeJson(signupRes)
      if (!signupRes.ok) {
        setError(signupJson?.error?.message ?? `Signup failed (${signupRes.status})`)
        return
      }

      // ── Success — prompt login (Clerk requires a sign-in after server-side user creation)
      setEmailSent(true)

    } catch (e) {
      console.error('[DonorRegister]', e)
      setError('Something went wrong. Open DevTools → Console for details.')
    } finally {
      setLoading(false)
    }
  }

  // ── Account created screen
  if (emailSent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 size={28} className="text-primary" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">Account created!</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Your donor account for <strong>{form.email}</strong> is ready.<br />
            Log in to start donating food.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Log in to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Logo />
        </div>

        <div className="rounded-2xl border border-border bg-card px-8 py-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <UserCircle2 size={16} className="text-primary" />
            Create your donor account and start making an impact.
          </div>

          <h1 className="mb-6 text-xl font-bold text-foreground">Donor Registration Form</h1>

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Row 1 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Business Name" required>
                <input
                  type="text"
                  placeholder="e.g. Green Leaf Café"
                  className={inputCls}
                  {...field('business_name')}
                />
              </Field>
              <Field label="Business Type" required>
                <select className={inputCls} {...field('business_type')}>
                  <option value="restaurant">Restaurant / Café</option>
                  <option value="bakery">Bakery</option>
                  <option value="caterer">Caterer / Hotel</option>
                  <option value="supermarket">Supermarket / Grocery</option>
                  <option value="vegetable_vendor">Vegetable Vendor</option>
                  <option value="individual">Individual</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Owner / Contact Person" required>
                <input
                  type="text"
                  placeholder="Full name"
                  className={inputCls}
                  {...field('full_name')}
                />
              </Field>
              <Field label="Phone Number" required>
                <div className="flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-secondary px-3 text-sm text-muted-foreground">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    className={inputCls + ' rounded-l-none'}
                    {...field('phone')}
                  />
                </div>
              </Field>
            </div>

            {/* Email */}
            <Field label="Email" required>
              <input
                type="email"
                placeholder="you@example.com"
                className={inputCls}
                {...field('email')}
              />
            </Field>

            {/* Address */}
            <Field label="Business Address" required>
              <input
                type="text"
                placeholder="Street address"
                className={inputCls}
                {...field('address')}
              />
            </Field>

            {/* Row 3 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="City / Area" required>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru"
                  className={inputCls}
                  {...field('city')}
                />
              </Field>
              <Field label="Food License Number">
                <input
                  type="text"
                  placeholder="FSSAI / LIC number (optional)"
                  className={inputCls}
                  {...field('food_license_number')}
                />
              </Field>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Password" required>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    className={inputCls + ' pr-10'}
                    {...field('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password" required>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat password"
                    className={inputCls + ' pr-10'}
                    {...field('confirm_password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
            </div>

            {/* Document upload */}
            <Field label="Food License / Verification Document">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
                  <span className="text-xs font-bold text-red-600">PDF</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {fileName ?? 'No file chosen'}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF, JPG or PNG – Max 5MB</p>
                </div>
                <label className="cursor-pointer rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
                  Browse
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFileName(e.target.files[0].name)
                    }}
                  />
                </label>
              </div>
            </Field>

            {/* Agreement */}
            <label className="flex cursor-pointer items-start gap-2 text-sm text-primary">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              I agree to follow food safety guidelines and the MealSaver platform terms.
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create Donor Account'}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Log in here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

// Safely parse JSON — returns null if the response is HTML (e.g. Next.js error page)
async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    const text = await res.text().catch(() => '')
    console.error('API returned non-JSON response:', res.status, text.slice(0, 300))
    return null
  }
}

const inputCls =
  'w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}
