import Image from 'next/image'
import Link from 'next/link'
import { Logo } from '@/components/mealsaver/logo'
import { landingFeatures } from '@/lib/mock-data'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'How it Works', href: '/how-it-works' },
  { label: 'For Donors', href: '/for-donors' },
  { label: 'For NGOs', href: '/for-ngos' },
  { label: 'Impact', href: '/impact-overview' },
  { label: 'Login', href: '/login' },
]

export default function Home() {
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

        <section className="overflow-hidden px-2 pb-4 pt-10 md:px-3 md:pb-6 md:pt-12">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1.08fr_0.92fr]">
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-[#141b17] md:text-6xl">
                <span className="text-[#14843e]">Rescue</span> surplus food.
                <br />
                <span className="text-[#14843e]">Feed</span> more people.
              </h1>

              <p className="max-w-xl text-base leading-[1.55] text-[#5f6d63] md:text-xl">
                MealSaver connects donors with verified NGOs, shelters, and community kitchens through
                fast pickup and safe redistribution.
              </p>

              <div className="flex flex-wrap gap-4 pt-1">
                <Link
                  href="/donor/register"
                  className="rounded-xl bg-[#18883f] px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#127134] md:text-xl"
                >
                  Donate Surplus Food
                </Link>
                <Link
                  href="/ngo/register"
                  className="rounded-xl border-2 border-[#1f8a42] bg-white px-7 py-3.5 text-base font-semibold text-[#1f7f3d] transition-colors hover:bg-[#f4f9f4] md:text-xl"
                >
                  Join as NGO
                </Link>
              </div>
            </div>

            <div className="relative flex h-[320px] items-center justify-end md:h-[420px]">
              <svg
                aria-hidden="true"
                viewBox="0 0 260 240"
                className="absolute right-[90px] top-[86px] h-[200px] w-[220px] opacity-95 md:right-[120px] md:top-[98px] md:h-[235px] md:w-[255px]"
              >
                <path
                  d="M122 24c36 8 57 28 62 61c-38 8-68-2-91-30c7-15 17-25 29-31z"
                  fill="#e4f2df"
                />
                <path
                  d="M68 94c40-6 70 3 90 28c-22 31-51 45-90 41c-12-27-12-49 0-69z"
                  fill="#eaf6e7"
                />
                <path
                  d="M104 156c34-6 60 2 79 24c-17 30-40 44-73 43c-15-22-17-45-6-67z"
                  fill="#e2f1dd"
                />
                <path
                  d="M170 96c31 8 50 24 58 48c-28 15-53 14-77-4c1-20 7-34 19-44z"
                  fill="#e7f4e3"
                />
              </svg>

              <div className="absolute -right-16 top-12 h-[260px] w-[365px] md:-right-20 md:top-10 md:h-[330px] md:w-[460px]">
                <Image
                  src="/hero-food-cutout.png"
                  alt="Bowl of food"
                  fill
                  className="object-contain drop-shadow-[0_12px_18px_rgba(17,42,23,0.2)]"
                  sizes="(max-width: 768px) 365px, 460px"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section className="pb-1 pt-3" id="how-it-works">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {landingFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-[#e4e9e1] bg-white px-6 py-6 text-center shadow-[0_1px_2px_rgba(18,37,24,0.04)]"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#17883f]">
                  <feature.icon className="text-white" size={28} strokeWidth={2.2} />
                </div>
                <h3 className="text-xl font-semibold text-[#1c241f] md:text-2xl">{feature.title}</h3>
                <p className="mt-2 text-sm leading-[1.45] text-[#5f6d63] md:text-base">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
