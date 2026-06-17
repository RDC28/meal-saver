'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/auth-provider'
import {
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  History,
  BarChart2,
  User,
  LogOut,
} from 'lucide-react'
import { Logo } from './logo'
import { cn } from '@/lib/utils'

const donorNav = [
  { label: 'Dashboard',      href: '/donor/dashboard',    icon: LayoutDashboard },
  { label: 'Create Donation', href: '/donor/donations/new', icon: PlusCircle },
  { label: 'Active Donations', href: '/donor/donations',  icon: ListChecks },
  { label: 'History',        href: '/donor/history',      icon: History },
  { label: 'Impact Report',  href: '/impact',             icon: BarChart2 },
  { label: 'Profile',        href: '/donor/profile',      icon: User },
]

const ngoNav = [
  { label: 'Dashboard',      href: '/ngo/dashboard',  icon: LayoutDashboard },
  { label: 'Nearby Donations', href: '/ngo/nearby',   icon: ListChecks },
  { label: 'Accepted Pickups', href: '/ngo/pickups',  icon: PlusCircle },
  { label: 'Delivery History', href: '/ngo/history',  icon: History },
  { label: 'Impact',          href: '/impact',        icon: BarChart2 },
  { label: 'Profile',         href: '/ngo/profile',   icon: User },
]

interface DashboardSidebarProps {
  role?: 'donor' | 'ngo'
  userName?: string
  userRole?: string
}

export function DashboardSidebar({
  role = 'donor',
  userName,
  userRole,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const { logout, user } = useAuth()

  const nav = role === 'ngo' ? ngoNav : donorNav

  const displayName =
    userName ||
    user?.full_name ||
    user?.email?.split('@')[0] ||
    (role === 'ngo' ? 'NGO' : 'Donor')

  const displayRole = userRole || (role === 'ngo' ? 'NGO' : 'Donor')

  async function handleSignOut() {
    await logout()
  }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="border-b border-border px-5 py-4">
        <Logo size="sm" />
      </div>

      {/* User chip */}
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-primary">
              {displayRole}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              )}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: help + logout */}
      <div className="border-t border-border px-5 py-4 space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">Need Help?</p>
          <p className="text-xs text-muted-foreground">We&apos;re here to assist you.</p>
          <Link href="mailto:support@mealsaver.local" className="mt-2 inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary">
            Contact Support
          </Link>
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <LogOut size={15} strokeWidth={1.8} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
