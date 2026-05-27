import Link from 'next/link'
import { Logo } from '@/components/mealsaver/logo'
import { Clock3, MapPin, PackageCheck, Users } from 'lucide-react'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'How it Works', href: '/how-it-works' },
  { label: 'For Donors', href: '/for-donors' },
  { label: 'For NGOs', href: '/for-ngos' },
  { label: 'Impact', href: '/impact-overview' },
  { label: 'Login', href: '/login' },
]

const benefits = [
  { icon: MapPin, title: 'Location-Based Matching', text: 'Receive opportunities based on service radius and city coverage.' },
  { icon: PackageCheck, title: 'Food Preference Controls', text: 'Accept the categories and conditions your team can safely manage.' },
  { icon: Clock3, title: 'Operational Clarity', text: 'Structured pickup and confirmation reduce back-and-forth coordination.' },
  { icon: Users, title: 'Bigger Community Reach', text: 'Serve more people through dependable surplus recovery channels.' },
]

export default function ForNgosPage() {
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
            href="/login?role=receiver"
            className="rounded-lg bg-[#1f8a42] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#187336]"
          >
            NGO Login
          </Link>
        </header>

        <section className="px-2 pb-4 pt-10 md:px-3">
          <h1 className="text-4xl font-extrabold leading-tight text-[#141b17] md:text-5xl">For NGOs and Community Kitchens</h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#5f6d63] md:text-lg">
            MealSaver helps NGOs discover, claim, and receive food donations faster, while keeping pickup flow accountable.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 px-2 pb-5 md:grid-cols-2 md:px-3">
          {benefits.map((item) => (
            <article key={item.title} className="rounded-2xl border border-[#e4e9e1] bg-white px-6 py-6">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#17883f]">
                <item.icon size={22} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-[#1c241f]">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5f6d63]">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="px-2 pb-2 md:px-3">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/ngo/register"
              className="rounded-lg bg-[#18883f] px-5 py-3 text-sm font-semibold text-white hover:bg-[#127134]"
            >
              Register as NGO
            </Link>
            <Link
              href="/login?role=receiver"
              className="rounded-lg border border-[#1f8a42] px-5 py-3 text-sm font-semibold text-[#1f7f3d] hover:bg-[#f4f9f4]"
            >
              Log In
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
