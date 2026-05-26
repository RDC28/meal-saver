'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Eye, EyeOff, Building2, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
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

const checkbox = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground hover:bg-secondary">
    <input
      type="checkbox"
      className="h-4 w-4 accent-primary"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    {label}
  </label>
)

export default function NGOProfilePage() {
  const router = useRouter()

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [org, setOrg] = useState({
    organization_name: '',
    organization_type: 'ngo',
    full_name:         '',
    phone:             '',
    email:             '',
    address:           '',
    city:              '',
    service_area_km:   '10',
  })
  const [foodPrefs, setFoodPrefs] = useState({
    accepts_cooked:  true,
    accepts_raw:     true,
    accepts_packaged: true,
    accepts_non_veg: false,
  })
  const [showOld, setShowOld]     = useState(false)
  const [showNew, setShowNew]     = useState(false)
  const [passwords, setPasswords] = useState({ old: '', new: '' })
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const [profileRes, meRes] = await Promise.all([
          fetch('/api/receiver/profile'),
          fetch('/api/auth/me'),
        ])

        if (profileRes.ok) {
          const data = await profileRes.json()
          const p = data.data ?? data
          setOrg((prev) => ({
            ...prev,
            organization_name: p.organization_name ?? prev.organization_name,
            organization_type: p.organization_type  ?? prev.organization_type,
            phone:             p.phone              ?? prev.phone,
            address:           p.address            ?? prev.address,
            city:              p.city               ?? prev.city,
            service_area_km:   String(p.service_area_km ?? prev.service_area_km),
          }))
          setFoodPrefs({
            accepts_cooked:   p.accepts_cooked  ?? true,
            accepts_raw:      p.accepts_raw     ?? true,
            accepts_packaged: p.accepts_packaged ?? true,
            accepts_non_veg:  p.accepts_non_veg ?? false,
          })
        }

        if (meRes.ok) {
          const me = await meRes.json()
          const u = me.data ?? me
          setOrg((prev) => ({
            ...prev,
            full_name: u.full_name ?? prev.full_name,
            email:     u.email     ?? prev.email,
          }))
        }
      } finally {
        setLoadingProfile(false)
      }
    }
    loadProfile()
  }, [])

  const of = (key: keyof typeof org) => ({
    value: org[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setOrg((prev) => ({ ...prev, [key]: e.target.value })),
  })

  async function handleSave() {
    setError(null)
    if (!org.organization_name.trim()) return setError('Organization name is required')
    if (!org.full_name.trim())         return setError('Contact person name is required')
    setSaving(true)
    try {
      const [profileRes, meRes] = await Promise.all([
        fetch('/api/receiver/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_name: org.organization_name,
            organization_type: org.organization_type,
            phone:             org.phone,
            address:           org.address,
            city:              org.city,
            service_area_km:   Number(org.service_area_km),
            accepts_cooked:    foodPrefs.accepts_cooked,
            accepts_raw:       foodPrefs.accepts_raw,
            accepts_packaged:  foodPrefs.accepts_packaged,
            accepts_non_veg:   foodPrefs.accepts_non_veg,
          }),
        }),
        fetch('/api/auth/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: org.full_name, phone: org.phone }),
        }),
      ])
      if (!profileRes.ok) {
        const body = await profileRes.json().catch(() => ({}))
        setError(body.error?.message ?? 'Failed to save profile')
      } else if (!meRes.ok) {
        const body = await meRes.json().catch(() => ({}))
        setError(body.error?.message ?? 'Failed to update account details')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!passwords.new || passwords.new.length < 8) {
      return setError('New password must be at least 8 characters')
    }
    setError(null)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: passwords.new }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Failed to change password')
      } else {
        setPasswords({ old: '', new: '' })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setError('Network error — please try again')
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure? This cannot be undone.')) return
    try {
      await fetch('/api/auth/account', { method: 'DELETE' })
      router.push('/')
    } catch {
      setError('Failed to delete account')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar role="ngo" userName={org.organization_name || 'NGO'} userRole="NGO" />

      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">My Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your organisation info and account settings</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loadingProfile}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="px-8 py-6 space-y-6 max-w-3xl">
            {saved && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 size={16} /> Profile saved successfully.
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 size={15} className="text-primary" />
                Organisation Information
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Organisation Name" required>
                  <input type="text" className={inputCls} {...of('organization_name')} />
                </Field>
                <Field label="Organisation Type" required>
                  <select className={inputCls} {...of('organization_type')}>
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Contact Person" required>
                  <input type="text" className={inputCls} {...of('full_name')} />
                </Field>
                <Field label="Phone Number" required>
                  <div className="flex">
                    <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-secondary px-3 text-sm text-muted-foreground">
                      +91
                    </span>
                    <input type="tel" className={inputCls + ' rounded-l-none'} {...of('phone')} />
                  </div>
                </Field>
              </div>

              <Field label="Email Address" required>
                <input type="email" className={inputCls} {...of('email')} readOnly />
              </Field>

              <Field label="Address" required>
                <input type="text" className={inputCls} {...of('address')} />
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="City" required>
                  <input type="text" className={inputCls} {...of('city')} />
                </Field>
                <Field label="Service Area Radius" required>
                  <select className={inputCls} {...of('service_area_km')}>
                    <option value="5">Within 5 km</option>
                    <option value="10">Within 10 km</option>
                    <option value="15">Within 15 km</option>
                    <option value="25">Within 25 km</option>
                    <option value="50">Within 50 km</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm space-y-4">
              <p className="text-sm font-semibold text-foreground">Food Types Accepted</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {checkbox('Cooked food',    foodPrefs.accepts_cooked,   (v) => setFoodPrefs((p) => ({ ...p, accepts_cooked: v })))}
                {checkbox('Raw / veg',      foodPrefs.accepts_raw,      (v) => setFoodPrefs((p) => ({ ...p, accepts_raw: v })))}
                {checkbox('Packaged goods', foodPrefs.accepts_packaged, (v) => setFoodPrefs((p) => ({ ...p, accepts_packaged: v })))}
                {checkbox('Non-vegetarian', foodPrefs.accepts_non_veg,  (v) => setFoodPrefs((p) => ({ ...p, accepts_non_veg: v })))}
              </div>
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
                      onChange={(e) => setPasswords((p) => ({ ...p, old: e.target.value }))}
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
                      onChange={(e) => setPasswords((p) => ({ ...p, new: e.target.value }))}
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
              <button
                onClick={handleChangePassword}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
              >
                Update Password
              </button>
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
        )}
      </main>
    </div>
  )
}
