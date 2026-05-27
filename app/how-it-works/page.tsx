import Link from 'next/link'
import { Logo } from '@/components/mealsaver/logo'
import { ArrowRight, Bell, ClipboardCheck, Handshake, Truck } from 'lucide-react'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'How it Works', href: '/how-it-works' },
  { label: 'For Donors', href: '/for-donors' },
  { label: 'For NGOs', href: '/for-ngos' },
  { label: 'Impact', href: '/impact-overview' },
  { label: 'Login', href: '/login' },
]

const steps = [
  {
    icon: Bell,
    title: 'Donor Posts Surplus',
    description: 'A donor lists available food, pickup timing, and location details in minutes.',
  },
  {
    icon: Handshake,
    title: 'Nearby NGO Accepts',
    description: 'Verified NGOs get matched and confirm pickup based on food type and service area.',
  },
  {
    icon: Truck,
    title: 'Safe Pickup and Delivery',
    description: 'Pickup is tracked with verification so food reaches the right beneficiaries quickly.',
  },
  {
    icon: ClipboardCheck,
    title: 'Impact Gets Recorded',
    description: 'Meals served and waste reduced are captured for transparent reporting.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f2] px-4 py-6 md:px-8 md:py-8">
      <main className="mx-auto max-w-6xl rounded-2xl border border-[#e4e9e1] bg-white p-5 shadow-[0_1px_2px_rgba(13,30,14,0.06)] md:p-7">
        <header className="flex items-center justify-between rounded-xl border border-[#e6ebe4] bg-white px-4 py-3">
          <Logo size="sm" />
          <nav className="hidden items-center gap-7 text-sm font-medium text-[#3f4d43] md:flex">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className="transition-colors hover:text-[#11291a]">
                {link.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/register"
            className="rounded-lg bg-[#1f8a42] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#187336]"
          >
            Get Started
          </Link>
        </header>

        <section className="px-2 pb-4 pt-10 md:px-3">
          <h1 className="text-4xl font-extrabold leading-tight text-[#141b17] md:text-5xl">How MealSaver Works</h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#5f6d63] md:text-lg">
            MealSaver creates a simple chain between food businesses and community organizations so surplus food is rescued
            before it becomes waste.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 px-2 pb-4 md:grid-cols-2 md:px-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-[#e4e9e1] bg-white px-6 py-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#17883f]">
                <step.icon size={22} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-[#1c241f]">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5f6d63]">{step.description}</p>
            </article>
          ))}
        </section>

        <section className="px-2 pb-2 pt-3 md:px-3">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/for-donors"
              className="inline-flex items-center gap-2 rounded-lg bg-[#18883f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#127134]"
            >
              Donor Guide <ArrowRight size={16} />
            </Link>
            <Link
              href="/for-ngos"
              className="inline-flex items-center gap-2 rounded-lg border border-[#1f8a42] px-5 py-3 text-sm font-semibold text-[#1f7f3d] hover:bg-[#f4f9f4]"
            >
              NGO Guide <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
