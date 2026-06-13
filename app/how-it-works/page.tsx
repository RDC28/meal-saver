import Link from 'next/link'
import { ArrowRight, Bell, ClipboardCheck, Handshake, Truck } from 'lucide-react'
import { SiteHeader } from '@/components/mealsaver/site-header'
import { SiteFooter } from '@/components/mealsaver/site-footer'
import { PageHero } from '@/components/mealsaver/page-hero'
import { Reveal } from '@/components/mealsaver/reveal'

const steps = [
  {
    icon: Bell,
    title: 'Donor posts surplus',
    description: 'A donor lists available food, pickup timing, and location details in just a couple of minutes.',
  },
  {
    icon: Handshake,
    title: 'Nearby NGO accepts',
    description: 'Verified NGOs are matched and confirm pickup based on food type and the area they serve.',
  },
  {
    icon: Truck,
    title: 'Safe pickup & delivery',
    description: 'Pickup is tracked and verified, so food reaches the right beneficiaries quickly and safely.',
  },
  {
    icon: ClipboardCheck,
    title: 'Impact gets recorded',
    description: 'Meals served and waste reduced are captured automatically for transparent reporting.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f2]">
      <SiteHeader variant="dark" />

      <PageHero
        image="/images/volunteers-boxes.jpg"
        alt="Volunteers preparing boxes of rescued food for pickup"
        eyebrow="How it Works"
        title={<>A simple chain, from <span className="text-[#7ee69a]">surplus to served.</span></>}
        subtitle="MealSaver creates a clear, accountable path between food businesses and community organizations, so good food is rescued before it ever becomes waste."
        primary={{ label: 'Get Started', href: '/register' }}
      />

      <section className="mx-auto max-w-5xl px-5 py-20 md:px-6 md:py-24">
        <div className="relative">
          {/* vertical connector line */}
          <div className="absolute left-[27px] top-4 bottom-4 hidden w-px bg-gradient-to-b from-[#bfe3c6] via-[#bfe3c6] to-transparent sm:block" />

          <div className="space-y-6">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 80}>
                <article className="relative flex gap-5 rounded-2xl border border-[#e4e9e1] bg-white p-6 transition-all hover:border-[#bfe3c6] hover:shadow-lg hover:shadow-[#11291a]/5 md:p-7">
                  <div className="relative z-10 flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-[#17883f] text-white shadow-sm ring-4 ring-[#f4f7f2]">
                    <step.icon size={24} strokeWidth={2.1} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-[#14843e]">Step {i + 1}</span>
                    </div>
                    <h2 className="mt-1 text-xl font-semibold text-[#1c241f]">{step.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#5f6d63]">{step.description}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={120} className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/for-donors"
            className="inline-flex items-center gap-2 rounded-xl bg-[#18883f] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#127134]"
          >
            Donor Guide <ArrowRight size={16} />
          </Link>
          <Link
            href="/for-ngos"
            className="inline-flex items-center gap-2 rounded-xl border border-[#1f8a42] px-6 py-3 text-sm font-semibold text-[#1f7f3d] transition-colors hover:bg-[#f4f9f4]"
          >
            NGO Guide <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
