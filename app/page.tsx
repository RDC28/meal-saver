import Link from 'next/link'
import { Logo } from '@/components/mealsaver/logo'
import { landingFeatures, landingStats } from '@/lib/mock-data'

const navLinks = [
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'For Donors', href: '/donor/register' },
  { label: 'For NGOs', href: '/ngo/register' },
  { label: 'Impact', href: '/impact' },
  { label: 'Login', href: '/login' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/register"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-4 pt-14">
        <div className="flex flex-col items-center gap-10 md:flex-row md:items-center md:gap-14">
          {/* Left: copy + CTAs */}
          <div className="flex flex-1 flex-col gap-6">
            <h1 className="text-[2.6rem] font-extrabold leading-[1.18] tracking-tight text-foreground md:text-5xl">
              <span className="text-primary">Rescue</span> surplus food.
              <br />
              <span className="text-primary">Feed</span> more people.
            </h1>

            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              MealSaver connects donors with verified NGOs, shelters, and community kitchens
              through fast pickup and safe redistribution.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/donor/register"
                className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                Donate Surplus Food
              </Link>
              <Link
                href="/ngo/register"
                className="rounded-lg border border-border bg-white px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                Join as NGO
              </Link>
            </div>
          </div>

          {/* Right: food image */}
          <div className="flex flex-1 justify-center">
            <div className="relative flex h-[300px] w-[300px] items-center justify-center md:h-[340px] md:w-[340px]">
              {/* decorative outer blob */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: 'oklch(0.90 0.06 145)' }}
              />
              {/* food illustration circle */}
              <div
                className="relative flex h-[264px] w-[264px] items-center justify-center overflow-hidden rounded-full md:h-[296px] md:w-[296px]"
                style={{
                  background:
                    'radial-gradient(circle at 40% 35%, oklch(0.82 0.12 85), oklch(0.70 0.16 55) 55%, oklch(0.55 0.14 40) 100%)',
                }}
              >
                <span className="select-none text-[7rem] drop-shadow-sm" role="img" aria-label="Food bowl">
                  🍛
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {landingFeatures.map((feature) => (
            <div key={feature.title} className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                <feature.icon className="text-primary" size={24} strokeWidth={1.8} />
              </div>
              <h3 className="font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Stats bar ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex flex-col items-center justify-around gap-6 rounded-2xl border border-border bg-card px-8 py-7 shadow-sm md:flex-row">
          {landingStats.map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
                  <stat.icon className="text-primary" size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-tight text-foreground">
                    {stat.value}
                    {stat.unit && (
                      <span className="ml-0.5 text-lg font-semibold">{stat.unit}</span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
              {i < landingStats.length - 1 && (
                <div className="hidden h-12 w-px bg-border md:block" />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
