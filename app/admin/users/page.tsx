'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, AlertCircle, CheckCircle2, X, Ban } from 'lucide-react'
import { AdminSidebar } from '@/components/mealsaver/admin-sidebar'
import { StatusBadge } from '@/components/mealsaver/status-badge'

interface UserRow {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: string
  is_active: boolean
  created_at: string
  donor_profiles:    { business_name: string; city: string; verification_status: string }[]
  receiver_profiles: { organization_name: string; city: string; verification_status: string }[]
}

interface Pagination { page: number; limit: number; total: number; pages: number }

const ROLE_OPTIONS = [
  { value: '',         label: 'All Roles' },
  { value: 'donor',    label: 'Donor' },
  { value: 'receiver', label: 'NGO' },
  { value: 'admin',    label: 'Admin' },
]

const STATUS_OPTIONS = [
  { value: '',          label: 'All Statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'verified',  label: 'Verified' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
]

export default function AdminUsersPage() {
  const [users,      setUsers]      = useState<UserRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [role,       setRole]       = useState('')
  const [verStatus,  setVerStatus]  = useState('')
  const [page,       setPage]       = useState(1)
  const [acting,     setActing]     = useState<Record<string, boolean>>({})

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: '25' })
    if (search)    params.set('search', search)
    if (role)      params.set('role', role)
    if (verStatus) params.set('verification_status', verStatus)
    try {
      const res  = await fetch(`/api/admin/users?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to load users')
      setUsers(json.data?.users ?? [])
      setPagination(json.data?.pagination ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [page, search, role, verStatus])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleVerify(userId: string, status: 'verified' | 'rejected') {
    setActing((p) => ({ ...p, [userId]: true }))
    await fetch(`/api/admin/users/${userId}/verify`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchUsers()
    setActing((p) => ({ ...p, [userId]: false }))
  }

  async function handleSuspend(userId: string, suspended: boolean) {
    setActing((p) => ({ ...p, [userId]: true }))
    await fetch(`/api/admin/users/${userId}/suspend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended }),
    })
    await fetchUsers()
    setActing((p) => ({ ...p, [userId]: false }))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-card px-8 py-5">
          <h1 className="text-lg font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">Manage donors, NGOs, and admins</p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1) }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={verStatus}
              onChange={(e) => { setVerStatus(e.target.value); setPage(1) }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                    <th className="px-5 py-3">Name / Org</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Verification</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center">
                        <Loader2 size={20} className="mx-auto animate-spin text-muted-foreground" />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  ) : users.map((u) => {
                    const orgName   = u.donor_profiles[0]?.business_name ?? u.receiver_profiles[0]?.organization_name
                    const city      = u.donor_profiles[0]?.city ?? u.receiver_profiles[0]?.city ?? '—'
                    const verSt     = u.donor_profiles[0]?.verification_status ?? u.receiver_profiles[0]?.verification_status ?? 'pending'
                    const isPending = verSt === 'pending'
                    return (
                      <tr key={u.id} className={`hover:bg-secondary/30 ${!u.is_active ? 'opacity-60' : ''}`}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">{orgName ?? u.full_name}</p>
                          {orgName && <p className="text-xs text-muted-foreground">{u.full_name}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground capitalize">
                            {u.role === 'receiver' ? 'NGO' : u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <StatusBadge status={verSt as any} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{city}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleVerify(u.id, 'verified')}
                                  disabled={acting[u.id]}
                                  title="Verify"
                                  className="rounded-lg bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                                >
                                  <CheckCircle2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleVerify(u.id, 'rejected')}
                                  disabled={acting[u.id]}
                                  title="Reject"
                                  className="rounded-lg border border-destructive p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-60"
                                >
                                  <X size={13} />
                                </button>
                              </>
                            )}
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleSuspend(u.id, u.is_active)}
                                disabled={acting[u.id]}
                                title={u.is_active ? 'Suspend' : 'Reactivate'}
                                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-60"
                              >
                                <Ban size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
                <span>Showing {users.length} of {pagination.total} users</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded px-2 py-1 hover:bg-secondary disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <span className="px-2 py-1">{page} / {pagination.pages}</span>
                  <button
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded px-2 py-1 hover:bg-secondary disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
