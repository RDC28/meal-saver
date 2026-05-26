'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Eye, EyeOff, Building2, User, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { DashboardSidebar } from '@/components/mealsaver/dashboard-sidebar'

const inputCls =
  'w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function DonorProfilePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState({
    business_name: '',
    business_type: 'restaurant',
    full_name: '',
    phone: '',
    address: '',
    city: '',
    food_license_number: '',
  })
  const [email, setEmail] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [passwords, setPasswords] = useState({ old: '', new: '' })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const [meRes, profileRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/donor/profile'),
        ])

        if (meRes.ok) {
          const me = await meRes.json()
          setEmail(me.data?.email ?? '')
          setBusiness(prev => ({
            ...prev,
            full_name: me.data?.full_name ?? '',
            phone: me.data?.phone ?? '',
          }))
        }

        if (profileRes.ok) {
          const profile = await profileRes.json()
          const p = profile.data ?? profile
          setBusiness(prev => ({
            ...prev,
            business_name: p.business_name ?? '',
            business_type: p.business_type ?? 'restaurant',
            phone: p.phone ?? prev.phone,
            address: p.address ?? '',
            city: p.city ?? '',
            food_license_number: p.food_license_number ?? '',
          }))
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  async function handleSave() {
    setError(null)
    if (!business.business_name.trim()) return setError('Business name is required')
    if (!business.full_name.trim()) return setError('Contact name is required')

    try {
      const [profileRes, meRes] = await Promise.all([
        fetch('/api/donor/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_name:       business.business_name,
            business_type:       business.business_type,
            phone:               business.phone,
            address:             business.address,
            city:                business.city,
            food_license_number: business.food_license_number || undefined,
          }),
        }),
        fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: business.full_name, phone: business.phone }),
        }),
      ])

      if (!profileRes.ok) {
        const json = await profileRes.json()
        return setError(json.error?.message ?? 'Failed to save profile')
      }
      if (!meRes.ok) {
        const json = await meRes.json()
        return setError(json.error?.message ?? 'Failed to update account details')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Network error. Please try again.')
    }
  }

  async function handlePasswordChange() {
    setError(null)
    if (!passwords.new || passwords.new.length < 8) {
      return setError('New password must be at least 8 characters')
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: passwords.new }),
      })

      if (!res.ok) {
        const json = await res.json()
        return setError(json.error ?? 'Failed to change password')
      }

      setPasswords({ old: '', new: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Network error. Please try again.')
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure? This is permanent and cannot be undone.')) return

    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' })
      if (res.ok) {
        router.push('/')
      } else {
        const json = await res.json()
        setError(json.error ?? 'Failed to delete account')
      }
    } catch {
      setError('Network error. Please try again.')
    }
  }

  const bf = (key: keyof typeof business) => ({
    value: business[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBusiness(prev => ({ ...prev, [key]: e.target.value })),
  })

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

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="donor" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">My Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your business info and account settings</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Save size={15} />
            Save Changes
          </button>
        </div>

        <div className="px-8 py-6 space-y-6 max-w-3xl">
          {saved && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={16} />
              Changes saved successfully.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Building2 size={15} className="text-primary" />
              Business Information
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Business Name" required>
                <input type="text" className={inputCls} {...bf('business_name')} />
              </Field>
              <Field label="Business Type" required>
                <select className={inputCls} {...bf('business_type')}>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Contact Person" required>
                <input type="text" className={inputCls} {...bf('full_name')} />
              </Field>
              <Field label="Phone Number" required>
                <div className="flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-secondary px-3 text-sm text-muted-foreground">
                    +91
                  </span>
                  <input type="tel" className={inputCls + ' rounded-l-none'} {...bf('phone')} />
                </div>
              </Field>
            </div>

            <Field label="Business Address" required>
              <input type="text" className={inputCls} {...bf('address')} />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="City" required>
                <input type="text" className={inputCls} {...bf('city')} />
              </Field>
              <Field label="Food License Number">
                <input type="text" placeholder="FSSAI / LIC number" className={inputCls} {...bf('food_license_number')} />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User size={15} className="text-primary" />
              Account Details
            </div>

            <Field label="Email Address" required>
              <input
                type="email"
                className={inputCls + ' opacity-60 cursor-not-allowed'}
                value={email}
                readOnly
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lock size={15} className="text-primary" />
              Change Password
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Current Password">
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    placeholder="Enter current password"
                    className={inputCls + ' pr-10'}
                    value={passwords.old}
                    onChange={(e) => setPasswords(p => ({ ...p, old: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              <Field label="New Password">
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    className={inputCls + ' pr-10'}
                    value={passwords.new}
                    onChange={(e) => setPasswords(p => ({ ...p, new: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
            </div>
            {(passwords.old || passwords.new) && (
              <button
                onClick={handlePasswordChange}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Update Password
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-card px-6 py-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-destructive">Danger Zone</h3>
            <p className="mb-3 text-sm text-muted-foreground">Deleting your account is permanent and cannot be undone.</p>
            <button
              onClick={handleDeleteAccount}
              className="rounded-lg border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Delete Account
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
