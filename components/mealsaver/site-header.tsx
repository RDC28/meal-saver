'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/mealsaver/logo'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'How it Works', href: '/how-it-works' },
  { label: 'For Donors', href: '/for-donors' },
  { label: 'For NGOs', href: '/for-ngos' },
  { label: 'Impact', href: '/impact-overview' },
  { label: 'Login', href: '/login' },
]

interface SiteHeaderProps {
  cta?: { label: string; href: string }
  /** dark = transparent over a photographic hero, turns solid on scroll; light = always-solid sticky bar */
  variant?: 'light' | 'dark'
}

export function SiteHeader({ cta, variant = 'light' }: SiteHeaderProps) {
  const button = cta ?? { label: 'Get Started', href: '/register' }
  const overlay = variant === 'dark'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!overlay) return
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [overlay])

  // Solid chrome: always for the light variant, or once scrolled for the hero overlay.
  const solid = !overlay || scrolled

  return (
    <header
      className={cn(
        'z-40 transition-all duration-300',
        overlay ? 'fixed inset-x-0 top-0' : 'sticky top-0',
        solid
          ? 'border-b border-[#e6ebe4] bg-[#f4f7f2]/90 shadow-sm backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 md:px-6">
        <Logo size="sm" className={solid ? '' : '[&_span]:text-white'} />

        <nav
          className={cn(
            'hidden items-center gap-7 text-sm font-medium transition-colors md:flex',
            solid ? 'text-[#3f4d43]' : 'text-white/85',
          )}
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn('transition-colors', solid ? 'hover:text-[#11291a]' : 'hover:text-white')}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href={button.href}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5',
            solid
              ? 'bg-[#18883f] text-white hover:bg-[#127134]'
              : 'bg-white text-[#11291a] hover:bg-white/90',
          )}
        >
          {button.label}
        </Link>
      </div>
    </header>
  )
}
