'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, X, Loader2, AlertCircle } from 'lucide-react'
import { AdminSidebar } from '@/components/mealsaver/admin-sidebar'

interface PendingUser {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  donor_profiles:    { business_name: string; city: string; phone: string | null }[]
  receiver_profiles: { organization_name: string; organization_type: string; city: string; phone: string | null }[]
}

export default function AdminVerificationsPage() {
  const [tab,       setTab]       = useState<'donor' | 'receiver'>('donor')
  const [users,     setUsers]     = useState<PendingUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [acting,    setActing]    = useState<Record<string, boolean>>({})
  const [notes,     setNotes]     = useState<Record<string, string>>({})
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/admin/users?verification_status=pending&role=${tab}&limit=50`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load')
      setUsers(json.data?.users ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { fetchPending() }, [fetchPending])

  async function handleAction(userId: string, status: 'verified' | 'rejected') {
    setActing((p) => ({ ...p, [userId]: true }))
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes[userId] }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed')
      setActionMsg(json.data?.message ?? `User ${status}`)
      setTimeout(() => setActionMsg(null), 3000)
      await fetchPending()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActing((p) => ({ ...p, [userId]: false }))
    }
  }

  const filtered = users.filter((u) => u.role === tab)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-card px-8 py-5">
          <h1 className="text-lg font-bold text-foreground">Verifications</h1>
          <p className="text-sm text-muted-foreground">Review and approve pending accounts</p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {actionMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <CheckCircle2 size={16} /> {actionMsg}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
            {([['donor', 'Donors'], ['receiver', 'NGOs']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTab(val)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === val ? 'bg-secondary text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground shadow-sm">
              No pending {tab === 'donor' ? 'donor' : 'NGO'} verifications.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((u) => {
                const orgName = u.donor_profiles[0]?.business_name ?? u.receiver_profiles[0]?.organization_name ?? u.full_name
                const orgType = u.receiver_profiles[0]?.organization_type
                const city    = u.donor_profiles[0]?.city ?? u.receiver_profiles[0]?.city ?? '—'
                const phone   = u.donor_profiles[0]?.phone ?? u.receiver_profiles[0]?.phone
                return (
                  <div key={u.id} className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
                        {orgName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{orgName}</p>
                        {orgType && <p className="text-xs text-muted-foreground capitalize">{orgType.replace(/_/g, ' ')}</p>}
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Contact: {u.full_name}</span>
                      {phone && <span>Phone: {phone}</span>}
                      <span>City: {city}</span>
                      <span>Joined: {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <textarea
                      placeholder="Optional notes (for rejection reason)…"
                      value={notes[u.id] ?? ''}
                      onChange={(e) => setNotes((p) => ({ ...p, [u.id]: e.target.value }))}
                      rows={2}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(u.id, 'verified')}
                        disabled={acting[u.id]}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      >
                        <CheckCircle2 size={14} /> Verify
                      </button>
                      <button
                        onClick={() => handleAction(u.id, 'rejected')}
                        disabled={acting[u.id]}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
