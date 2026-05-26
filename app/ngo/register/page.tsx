'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Upload, UserCircle2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { Logo } from '@/components/mealsaver/logo'

type FormState = {
  organization_name: string
  organization_type: string
  full_name: string
  phone: string
  email: string
  city: string
  address: string
  service_area_km: string
  accepts_cooked: boolean
  accepts_raw: boolean
  accepts_packaged: boolean
  accepts_non_veg: boolean
  password: string
  confirm_password: string
}

const INITIAL: FormState = {
  organization_name: '',
  organization_type: 'ngo',
  full_name: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  service_area_km: '10',
  accepts_cooked: true,
  accepts_raw: true,
  accepts_packaged: true,
  accepts_non_veg: false,
  password: '',
  confirm_password: '',
}

export default function NGORegisterPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>(INITIAL)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const field = (key: keyof FormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  })

  const checkbox = (key: keyof FormState) => ({
    checked: form[key] as boolean,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.checked })),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // ── Client-side validation
    if (!form.organization_name.trim()) return setError('Please enter your organization name')
    if (!form.full_name.trim())         return setError('Please enter the contact person name')
    if (!form.email.trim())             return setError('Please enter your email')
    if (!form.address.trim())           return setError('Please enter your address')
    if (!form.city.trim())              return setError('Please enter your city')
    if (form.password.length < 8)       return setError('Password must be at least 8 characters')
    if (form.password !== form.confirm_password) return setError('Passwords do not match')
    if (!agreed)                        return setError('Please agree to the terms to continue')

    setLoading(true)

    try {
      // ── Create account + profile in one request
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:             form.email.trim(),
          password:          form.password,
          full_name:         form.full_name.trim(),
          phone:             form.phone ? `+91${form.phone.replace(/\D/g, '')}` : undefined,
          role:              'receiver',
          organization_name: form.organization_name.trim(),
          organization_type: form.organization_type,
          address:           form.address.trim(),
          city:              form.city.trim(),
          service_area_km:   parseInt(form.service_area_km) || 10,
          accepts_veg:       true,
          accepts_non_veg:   form.accepts_non_veg,
          accepts_vegan:     true,
          accepts_cooked:    form.accepts_cooked,
          accepts_raw:       form.accepts_raw,
          accepts_packaged:  form.accepts_packaged,
          accepts_short_term: true,
          accepts_long_term:  true,
        }),
      })

      const signupJson = await safeJson(signupRes)
      if (!signupRes.ok) {
        setError(signupJson?.error?.message ?? `Signup failed (${signupRes.status})`)
        return
      }

      // ── Success — prompt login
      setEmailSent(true)

    } catch (e) {
      console.error('[NGORegister]', e)
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
          <h2 className="mb-2 text-xl font-bold text-foreground">Organisation registered!</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Your NGO account for <strong>{form.email}</strong> is ready.<br />
            Log in to start accepting food donations.
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
        <div className="mb-8 flex items-center gap-3">
          <Logo />
        </div>

        <div className="rounded-2xl border border-border bg-card px-8 py-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <UserCircle2 size={16} className="text-primary" />
            Register your organisation to start receiving donations.
          </div>

          <h1 className="mb-6 text-xl font-bold text-foreground">NGO / Receiver Registration Form</h1>

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Organisation Details */}
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserCircle2 size={15} className="text-primary" />
              Organisation Details
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Organization Name" required>
                <input
                  type="text"
                  placeholder="Enter organization name"
                  className={inputCls}
                  {...field('organization_name')}
                />
              </Field>
              <Field label="Organization Type" required>
                <select className={inputCls} {...field('organization_type')}>
                  <option value="ngo">NGO / Food Bank</option>
                  <option value="shelter">Shelter / Old Age Home</option>
                  <option value="community_kitchen">Community Kitchen</option>
                  <option value="orphanage">Orphanage</option>
                  <option value="animal_shelter">Animal Shelter</option>
                  <option value="feeding_program">Feeding Program</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Contact Person" required>
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

            {/* Row 3 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Email" required>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={inputCls}
                  {...field('email')}
                />
              </Field>
              <Field label="Service Area Radius" required>
                <select className={inputCls} {...field('service_area_km')}>
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="15">Within 15 km</option>
                  <option value="25">Within 25 km</option>
                  <option value="50">Within 50 km</option>
                </select>
              </Field>
            </div>

            {/* Address */}
            <Field label="Address" required>
              <input
                type="text"
                placeholder="Enter full address"
                className={inputCls}
                {...field('address')}
              />
            </Field>

            {/* City */}
            <Field label="City" required>
              <input
                type="text"
                placeholder="e.g. Bengaluru"
                className={inputCls}
                {...field('city')}
              />
            </Field>

            {/* Food preferences */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Food Types Accepted <span className="text-destructive">*</span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { key: 'accepts_cooked' as const,   label: 'Cooked food' },
                  { key: 'accepts_raw' as const,      label: 'Raw / vegetables' },
                  { key: 'accepts_packaged' as const, label: 'Packaged goods' },
                  { key: 'accepts_non_veg' as const,  label: 'Non-vegetarian' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground hover:bg-secondary"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      {...checkbox(key)}
                    />
                    {label}
                  </label>
                ))}
              </div>
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

            {/* Document Verification */}
            <div className="pt-2">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary">
                  <span className="text-[10px] text-primary">✓</span>
                </span>
                Document Verification
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Organization Verification">
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/50 px-4 py-6 text-center hover:bg-secondary">
                    <Upload size={22} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Upload document</span>
                    <span className="text-xs text-muted-foreground">PDF, JPG or PNG (Max 5MB)</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.png" />
                  </label>
                </Field>
                <Field label="Registration Proof">
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/50 px-4 py-6 text-center hover:bg-secondary">
                    <Upload size={22} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Upload document</span>
                    <span className="text-xs text-muted-foreground">PDF, JPG or PNG (Max 5MB)</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.png" />
                  </label>
                </Field>
              </div>
            </div>

            {/* Agreement */}
            <label className="flex cursor-pointer items-start gap-2 text-sm text-primary">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              I agree to MealSaver's{' '}
              <Link href="#" className="underline">Terms & Conditions</Link> and{' '}
              <Link href="#" className="underline">Privacy Policy</Link>.
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating account…' : 'Create NGO Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

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
