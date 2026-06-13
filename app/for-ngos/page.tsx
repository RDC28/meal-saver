import Link from 'next/link'
import { Clock3, MapPin, PackageCheck, Users } from 'lucide-react'
import { SiteHeader } from '@/components/mealsaver/site-header'
import { SiteFooter } from '@/components/mealsaver/site-footer'
import { PageHero } from '@/components/mealsaver/page-hero'
import { Reveal } from '@/components/mealsaver/reveal'

const benefits = [
  { icon: MapPin, title: 'Location-Based Matching', text: 'Receive donation opportunities based on your service radius and the areas you cover.' },
  { icon: PackageCheck, title: 'Food Preference Controls', text: 'Accept only the categories and conditions your team can safely store, transport, and serve.' },
  { icon: Clock3, title: 'Operational Clarity', text: 'Structured pickup and confirmation cut the back-and-forth, so volunteers spend time serving.' },
  { icon: Users, title: 'Bigger Community Reach', text: 'Serve more people, more reliably, through a steady stream of recovered surplus food.' },
]

export default function ForNgosPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f2]">
      <SiteHeader variant="dark" cta={{ label: 'NGO Login', href: '/login?role=receiver' }} />

      <PageHero
        image="/images/volunteers-help.jpg"
        alt="Volunteers organising and distributing donated food"
        eyebrow="For NGOs & Community Kitchens"
        title={<>More food for the people <span className="text-[#7ee69a]">you already serve.</span></>}
        subtitle="MealSaver helps NGOs and community kitchens discover, claim, and receive food donations faster — while keeping every pickup accountable and safe for the families you care for."
        primary={{ label: 'Register as NGO', href: '/ngo/register' }}
        secondary={{ label: 'Log In', href: '/login?role=receiver' }}
      />

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-24">
        <Reveal className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wide text-[#14843e]">Built for the field</span>
          <h2 className="mt-3 text-3xl font-extrabold text-[#141b17] md:text-4xl">
            Spend less time coordinating, more time feeding.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {benefits.map((item, i) => (
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
      </section>

      <section className="bg-white py-16 md:py-20">
        <Reveal className="mx-auto max-w-3xl px-5 text-center md:px-6">
          <h2 className="text-2xl font-extrabold text-[#141b17] md:text-3xl">Bring dependable surplus to your community</h2>
          <p className="mx-auto mt-3 max-w-xl text-[#5f6d63]">Join a network of verified partners and never let a nearby surplus go to waste again.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link href="/ngo/register" className="rounded-xl bg-[#18883f] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#127134]">
              Register as NGO
            </Link>
            <Link href="/login?role=receiver" className="rounded-xl border border-[#1f8a42] px-6 py-3 text-sm font-semibold text-[#1f7f3d] transition-colors hover:bg-[#f4f9f4]">
              Log In
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
