'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { AuthLayout } from '@/components/mealsaver/auth-layout'

const inputCls =
  'w-full rounded-xl border border-[#dde5db] bg-white px-3.5 py-2.5 text-sm text-[#141b17] placeholder:text-[#9aa89c] focus:border-[#18883f] focus:outline-none focus:ring-2 focus:ring-[#18883f]/20'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const { refreshUser } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message || 'Login failed')
        return
      }

      await refreshUser()

      // Redirect based on role
      if (data.data?.user?.role === 'donor') {
        router.push('/donor/dashboard')
      } else if (data.data?.user?.role === 'receiver') {
        router.push('/ngo/dashboard')
      } else if (data.data?.user?.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/')
      }
    } catch (e) {
      setError('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      image="/images/hero-community.jpg"
      imageAlt="Volunteers serving warm food to a community"
      panelTitle="Welcome back to the table."
      panelSubtitle="Every time you log in, good food keeps moving to the people who need it most."
      bullets={['Pick up where you left off', 'Track meals saved in real time', 'Coordinate safe, verified pickups']}
    >
      <div className="rounded-2xl border border-[#e4e9e1] bg-white px-7 py-8 shadow-sm md:px-9 md:py-10">
        <h1 className="text-2xl font-extrabold text-[#141b17]">Welcome back</h1>
        <p className="mt-1.5 text-sm text-[#5f6d63]">Log in to your MealSaver account to continue.</p>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#141b17]">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            {loading ? 'Logging in…' : 'Log In'}
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
