import Link from 'next/link'
import { Leaf, Soup, Users, Waves } from 'lucide-react'
import { SiteHeader } from '@/components/mealsaver/site-header'
import { SiteFooter } from '@/components/mealsaver/site-footer'
import { PageHero } from '@/components/mealsaver/page-hero'
import { Reveal } from '@/components/mealsaver/reveal'
import { impactBigStats } from '@/lib/mock-data'

const impactCards = [
  { icon: Soup, title: 'More Meals Reached', text: 'Surplus food gets redirected to kitchens, shelters, and families who need it most.' },
  { icon: Leaf, title: 'Less Food Waste', text: 'Usable food is rescued before disposal, easing the pressure on landfills.' },
  { icon: Waves, title: 'Lower Emissions', text: 'Every recovered meal means less waste-related greenhouse impact.' },
  { icon: Users, title: 'Stronger Communities', text: 'Donors and NGOs collaborate through a single, trusted workflow.' },
]

export default function ImpactOverviewPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f2]">
      <SiteHeader variant="dark" cta={{ label: 'Join MealSaver', href: '/register' }} />

      <PageHero
        image="/images/children-meal.jpg"
        alt="Children sharing a warm meal together"
        eyebrow="Our Impact"
        title={<>Every rescued meal is a <span className="text-[#7ee69a]">small act of dignity.</span></>}
        subtitle="MealSaver exists to make food donation practical at scale. Each plate we save supports both the people in our communities and the planet we share."
        primary={{ label: 'Start Contributing', href: '/register' }}
        secondary={{ label: 'View Live Dashboard', href: '/impact' }}
      />

      {/* big numbers */}
      <section className="relative isolate overflow-hidden bg-[#0e2415]">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-6 md:py-20">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {impactBigStats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80} className="text-center">
                <p className="text-3xl font-extrabold text-[#7ee69a] md:text-5xl">{stat.value}</p>
                <p className="mt-2 text-sm font-semibold text-white md:text-base">{stat.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#a9c0aa]">{stat.sub}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-24">
        <Reveal className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wide text-[#14843e]">Why it matters</span>
          <h2 className="mt-3 text-3xl font-extrabold text-[#141b17] md:text-4xl">
            Good for people. Good for the planet.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {impactCards.map((item, i) => (
            <Reveal key={item.title} delay={i * 80}>
              <article className="group h-full rounded-2xl border border-[#e4e9e1] bg-white p-7 transition-all hover:-translate-y-1 hover:border-[#bfe3c6] hover:shadow-lg hover:shadow-[#11291a]/5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17883f] text-white">
                  <item.icon size={22} />
                </div>
                <h3 className="text-xl font-semibold text-[#1c241f]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5f6d63]">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-12 flex flex-wrap gap-4">
          <Link href="/register" className="rounded-xl bg-[#18883f] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#127134]">
            Start Contributing
          </Link>
          <Link href="/impact" className="rounded-xl border border-[#1f8a42] px-6 py-3 text-sm font-semibold text-[#1f7f3d] transition-colors hover:bg-[#f4f9f4]">
            View Live Impact Dashboard
          </Link>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
