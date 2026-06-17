import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Sprout, Check } from 'lucide-react'
import { Logo } from '@/components/mealsaver/logo'
import { cn } from '@/lib/utils'

interface AuthLayoutProps {
  image: string
  imageAlt: string
  panelTitle: string
  panelSubtitle: string
  bullets?: string[]
  /** form column width */
  width?: 'md' | 'xl'
  children: React.ReactNode
}

/**
 * Split-screen shell for auth pages: a photographic, deep-green panel that
 * echoes the landing page, beside a clean form column. The panel sticks while
 * long forms scroll.
 */
export function AuthLayout({
  image,
  imageAlt,
  panelTitle,
  panelSubtitle,
  bullets,
  width = 'md',
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f7f2] lg:flex">
      {/* ── Photographic panel (desktop only) ── */}
      <aside className="relative hidden lg:block lg:w-[42%] lg:max-w-2xl">
        <div className="sticky top-0 h-screen">
          <div className="relative h-full w-full overflow-hidden">
            <Image src={image} alt={imageAlt} fill priority sizes="42vw" className="object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b2012]/85 via-[#0e2916]/82 to-[#11331c]/78" />

            <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
              <Logo size="md" className="[&_span]:text-white" />

              <div className="max-w-md">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#bff0c8] backdrop-blur-sm">
                  <Sprout size={14} /> Save Food. Feed People.
                </span>
                <h2 className="mt-5 text-3xl font-extrabold leading-tight text-white xl:text-4xl">{panelTitle}</h2>
                <p className="mt-3 text-base leading-relaxed text-white/80">{panelSubtitle}</p>

                {bullets && bullets.length > 0 && (
                  <ul className="mt-6 space-y-2.5">
                    {bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-white/85">
                        <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#22a34a] text-white">
                          <Check size={12} />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-xs text-white/55">© {new Date().getFullYear()} MealSaver</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Form column ── */}
      <main className="flex min-h-screen flex-1 flex-col">
        <div className="flex items-center justify-between px-5 py-5 md:px-8">
          {/* Logo already links to home; on desktop the panel shows it, so hide here */}
          <Logo size="sm" className="lg:invisible" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5f6d63] transition-colors hover:text-[#11291a]"
          >
            <ArrowLeft size={15} /> Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-start justify-center px-5 pb-16 pt-4 md:items-center md:px-8">
          <div className={cn('w-full', width === 'xl' ? 'max-w-2xl' : 'max-w-md')}>{children}</div>
        </div>
      </main>
    </div>
  )
}
