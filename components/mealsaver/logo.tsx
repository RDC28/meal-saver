import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Logo({ size = 'md', className }: LogoProps) {
  const dim = { sm: 30, md: 38, lg: 48 }[size]
  const textCls = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }[size]

  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <svg width={dim} height={dim} viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* stem */}
        <path d="M19 35V22" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" />
        {/* left leaf */}
        <path
          d="M19 22C19 22 9 20 7 12C5 5 11 2 15 4C19.5 6.5 19 16 19 22Z"
          fill="#15803d"
        />
        {/* right leaf */}
        <path
          d="M19 22C19 22 24 15 28 11C32 7 35 9 33 14C31 19 24 23 19 22Z"
          fill="#22c55e"
          opacity="0.85"
        />
      </svg>
      <span className={cn('font-bold text-foreground', textCls)}>MealSaver</span>
    </Link>
  )
}
