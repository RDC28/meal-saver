'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { AuthLayout } from '@/components/mealsaver/auth-layout'

type LoginRole = 'donor' | 'receiver' | 'admin'

const inputCls =
  'w-full rounded-xl border border-[#dde5db] bg-white px-3.5 py-2.5 text-sm text-[#141b17] placeholder:text-[#9aa89c] focus:border-[#18883f] focus:outline-none focus:ring-2 focus:ring-[#18883f]/20'

const roleOptions: { value: LoginRole; label: string; hint: string }[] = [
  { value: 'donor', label: 'Donor', hint: 'Post surplus food' },
  { value: 'receiver', label: 'NGO', hint: 'Claim nearby donations' },
  { value: 'admin', label: 'Admin', hint: 'Manage platform' },
]

const demoCredentials: Record<LoginRole, { email: string; password: string }> = {
  donor: { email: 'demo.donor@mealsaver.local', password: 'Password123!' },
  receiver: { email: 'demo.ngo@mealsaver.local', password: 'Password123!' },
  admin: { email: 'demo.admin@mealsaver.local', password: 'Password123!' },
}

const roleDestination: Record<LoginRole, string> = {
  donor: '/donor/dashboard',
  receiver: '/ngo/dashboard',
  admin: '/admin',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<LoginRole>('donor')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { refreshUser } = useAuth()

  useEffect(() => {
    const requestedRole = new URLSearchParams(window.location.search).get('role')
    if (requestedRole === 'donor' || requestedRole === 'receiver' || requestedRole === 'admin') {
      setRole(requestedRole)
    }
  }, [])

  const applyDemoCredentials = (nextRole: LoginRole) => {
    setRole(nextRole)
    setEmail(demoCredentials[nextRole].email)
    setPassword(demoCredentials[nextRole].password)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error?.message || 'Login failed')
        return
      }

      await refreshUser()
      router.push(roleDestination[data.data?.user?.role as LoginRole] ?? roleDestination[role])
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      image="/images/hero-community.jpg"
      imageAlt="Community volunteers serving warm meals"
      panelTitle="Welcome back to the table."
      panelSubtitle="Every time you log in, good food keeps moving to people who need it most."
      bullets={['Pick up where you left off', 'Track meals saved in real time', 'Coordinate safe, verified pickups']}
    >
      <div className="rounded-2xl border border-[#e4e9e1] bg-white px-8 py-10 shadow-sm">
        <h1 className="text-2xl font-bold text-[#141b17]">Welcome back</h1>
        <p className="mt-2 text-sm text-[#5f6d63]">Choose your account type and log in.</p>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#141b17]">Log in as</label>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#dde5db] bg-[#f6f8f5] p-1">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  className={`rounded-lg px-3 py-2 text-left transition-colors ${
                    role === option.value
                      ? 'bg-white text-[#18883f] shadow-sm'
                      : 'text-[#5f6d63] hover:bg-white/70'
                  }`}
                >
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="block text-[11px] leading-tight">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#141b17]">Demo credentials</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {roleOptions.map((option) => (
                <button
                  key={`demo-${option.value}`}
                  type="button"
                  onClick={() => applyDemoCredentials(option.value)}
                  className="rounded-xl border border-[#dde5db] bg-[#f8faf7] px-3 py-2 text-left text-sm text-[#141b17] transition-colors hover:border-[#18883f]/40 hover:bg-white"
                >
                  <span className="block font-semibold">{option.label} demo</span>
                  <span className="block text-[11px] leading-tight text-[#5f6d63]">
                    {demoCredentials[option.value].email}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#141b17]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#141b17]">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Your password"
                className={inputCls + ' pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa89c] hover:text-[#141b17]"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#18883f] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#127134] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Logging in...' : `Log in as ${roleOptions.find((option) => option.value === role)?.label}`}
          </button>
        </form>

        <div className="mt-7 border-t border-[#e4e9e1] pt-6 text-center text-sm text-[#5f6d63]">
          New to MealSaver?
          <div className="mt-2 flex items-center justify-center gap-3">
            <Link href="/donor/register" className="font-semibold text-[#14843e] hover:underline">
              Register as Donor
            </Link>
            <span className="text-[#cdd6cc]">|</span>
            <Link href="/ngo/register" className="font-semibold text-[#14843e] hover:underline">
              Register as NGO
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
