'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import {
  LayoutDashboard, Users, ShieldCheck, Package,
  UserPlus, BarChart2, AlertTriangle, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNav = [
  { label: 'Overview',        href: '/admin',               icon: LayoutDashboard },
  { label: 'Users',           href: '/admin/users',         icon: Users },
  { label: 'Verifications',   href: '/admin/verifications', icon: ShieldCheck },
  { label: 'Donations',       href: '/admin/donations',     icon: Package },
  { label: 'Manual Matching', href: '/admin/matching',      icon: UserPlus },
  { label: 'Reports',         href: '/admin/reports',       icon: BarChart2 },
  { label: 'Emergency',       href: '/admin/emergency',     icon: AlertTriangle },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { signOut } = useClerk()

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">M</div>
          <span className="font-bold text-foreground">MealSaver</span>
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Admin</span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {adminNav.map(({ label, href, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
              )}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <button
          onClick={async () => { await signOut(); router.push('/login') }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut size={14} strokeWidth={1.8} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
