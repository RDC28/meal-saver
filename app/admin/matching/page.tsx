'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, AlertCircle, UserPlus } from 'lucide-react'
import { AdminSidebar } from '@/components/mealsaver/admin-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

interface Donation {
  id: string
  title: string
  status: string
  pickup_city: string
  quantity_kg: string
  quantity_description: string | null
  food_condition: string
  expiry_time: string | null
  is_urgent: boolean
}

interface ReceiverUser {
  id: string
  full_name: string
  receiver_profiles: { organization_name: string; city: string; verification_status: string }[]
}

export default function AdminMatchingPage() {
  const [donations,       setDonations]       = useState<Donation[]>([])
  const [receivers,       setReceivers]       = useState<ReceiverUser[]>([])
  const [loadingD,        setLoadingD]        = useState(true)
  const [loadingR,        setLoadingR]        = useState(true)
  const [selectedDon,     setSelectedDon]     = useState<string | null>(null)
  const [selectedRcv,     setSelectedRcv]     = useState<string | null>(null)
  const [assigning,       setAssigning]       = useState(false)
  const [successMsg,      setSuccessMsg]      = useState<string | null>(null)
  const [error,           setError]           = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/donations?status=available&limit=50')
      .then((r) => r.json())
      .then((j) => setDonations(j.data?.donations ?? []))
      .finally(() => setLoadingD(false))

    fetch('/api/admin/users?role=receiver&limit=100')
      .then((r) => r.json())
      .then((j) => setReceivers(j.data?.users ?? []))
      .finally(() => setLoadingR(false))
  }, [])

  async function handleAssign() {
    if (!selectedDon || !selectedRcv) return
    setAssigning(true)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/donations/${selectedDon}/assign`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ receiver_id: selectedRcv, pickup_type: 'ngo_pickup' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to assign')
      setSuccessMsg(json.data?.message ?? 'Assigned successfully')
      setTimeout(() => setSuccessMsg(null), 4000)
      setDonations((prev) => prev.filter((d) => d.id !== selectedDon))
      setSelectedDon(null)
      setSelectedRcv(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  const donationObj  = donations.find((d)  => d.id === selectedDon)
  const receiverObj  = receivers.find((r)  => r.id === selectedRcv)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-card px-8 py-5">
          <h1 className="text-lg font-bold text-foreground">Manual Matching</h1>
          <p className="text-sm text-muted-foreground">Manually assign available donations to verified NGOs</p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Assignment summary */}
          {(donationObj || receiverObj) && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Assignment Preview</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Donation</p>
                  {donationObj ? (
                    <p className="font-medium text-foreground">{donationObj.title} <span className="text-muted-foreground">({donationObj.pickup_city})</span></p>
                  ) : <p className="text-muted-foreground">Not selected</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">NGO</p>
                  {receiverObj ? (
                    <p className="font-medium text-foreground">
                      {receiverObj.receiver_profiles[0]?.organization_name ?? receiverObj.full_name}
                      <span className="text-muted-foreground"> ({receiverObj.receiver_profiles[0]?.city ?? '—'})</span>
                    </p>
                  ) : <p className="text-muted-foreground">Not selected</p>}
                </div>
              </div>
              <button
                onClick={handleAssign}
                disabled={!selectedDon || !selectedRcv || assigning}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {assigning ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Assign Donation
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Donations */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                Available Donations ({donations.length})
              </h2>
              {loadingD ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : donations.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground shadow-sm">
                  No available donations to assign.
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                  {donations.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDon(d.id === selectedDon ? null : d.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                        selectedDon === d.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:bg-secondary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.quantity_description ?? `${d.quantity_kg} kg`} · {d.pickup_city}
                          </p>
                          {d.expiry_time && (
                            <p className={`text-xs ${d.is_urgent ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                              Expires: {new Date(d.expiry_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                            </p>
                          )}
                        </div>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <StatusBadge status={d.status as any} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Receivers */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">
                NGOs ({receivers.length})
              </h2>
              {loadingR ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : receivers.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground shadow-sm">
                  No NGOs found. Ensure NGOs have completed their profiles.
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                  {receivers.map((r) => {
                    const profile = r.receiver_profiles[0]
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedRcv(r.id === selectedRcv ? null : r.id)}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                          selectedRcv === r.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:bg-secondary/40'
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">
                          {profile?.organization_name ?? r.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile?.city ?? '—'} ·{' '}
                          <span className={profile?.verification_status === 'verified' ? 'text-green-600' : 'text-orange-600'}>
                            {profile?.verification_status ?? 'no profile'}
                          </span>
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
