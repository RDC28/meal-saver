import Link from 'next/link'
import { CheckCircle2, ShieldCheck, Timer, TrendingUp } from 'lucide-react'
import { SiteHeader } from '@/components/mealsaver/site-header'
import { SiteFooter } from '@/components/mealsaver/site-footer'
import { PageHero } from '@/components/mealsaver/page-hero'
import { Reveal } from '@/components/mealsaver/reveal'

const benefits = [
  { icon: Timer, title: 'Fast Pickup Coordination', text: 'List food in minutes and connect with verified NGOs nearby, before it ever goes cold.' },
  { icon: ShieldCheck, title: 'Safer Distribution', text: 'A structured, verified pickup flow helps reduce misuse and keeps every handover accountable.' },
  { icon: TrendingUp, title: 'Measurable ESG Impact', text: 'Track meals served and food waste reduced, with visibility you can share with your team.' },
  { icon: CheckCircle2, title: 'Compliance-Friendly Logs', text: 'Keep clean digital records of every donation for your own reporting and peace of mind.' },
]

export default function ForDonorsPage() {
  return (
    <div className="min-h-screen bg-[#f4f7f2]">
      <SiteHeader variant="dark" cta={{ label: 'Donor Login', href: '/login?role=donor' }} />

      <PageHero
        image="/images/food-bank.jpg"
        alt="Volunteers sorting donated food at a community food bank"
        eyebrow="For Donors"
        title={<>Your surplus is someone&apos;s <span className="text-[#7ee69a]">first meal today.</span></>}
        subtitle="Restaurants, bakeries, caterers, stores, and event kitchens can turn extra food into real community support. MealSaver makes giving as easy as throwing it away — but infinitely more worthwhile."
        primary={{ label: 'Register as Donor', href: '/donor/register' }}
        secondary={{ label: 'Log In', href: '/login?role=donor' }}
      />

      <section className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-24">
        <Reveal className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wide text-[#14843e]">Why donors choose us</span>
          <h2 className="mt-3 text-3xl font-extrabold text-[#141b17] md:text-4xl">
            Less waste. Less worry. More good done.
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
          <h2 className="text-2xl font-extrabold text-[#141b17] md:text-3xl">Ready to give your surplus a second life?</h2>
          <p className="mx-auto mt-3 max-w-xl text-[#5f6d63]">It takes two minutes to post your first donation. A neighbour in need is closer than you think.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link href="/donor/register" className="rounded-xl bg-[#18883f] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#127134]">
              Register as Donor
            </Link>
            <Link href="/login?role=donor" className="rounded-xl border border-[#1f8a42] px-6 py-3 text-sm font-semibold text-[#1f7f3d] transition-colors hover:bg-[#f4f9f4]">
              Log In
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
