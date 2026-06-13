import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  ClipboardCheck,
  Handshake,
  Heart,
  Soup,
  Sprout,
  Truck,
} from 'lucide-react'
import { SiteHeader } from '@/components/mealsaver/site-header'
import { SiteFooter } from '@/components/mealsaver/site-footer'
import { Reveal } from '@/components/mealsaver/reveal'
import { impactBigStats, galleryImages } from '@/lib/mock-data'

const steps = [
  {
    icon: Bell,
    title: 'A kitchen lists surplus',
    text: 'A restaurant, caterer, or canteen posts good food they cannot use — in under two minutes.',
  },
  {
    icon: Handshake,
    title: 'A nearby NGO says yes',
    text: 'Verified partners are matched by distance and food type, and confirm the pickup.',
  },
  {
    icon: Truck,
    title: 'Food is collected safely',
    text: 'Pickup is tracked and verified end to end, so every meal stays safe on its journey.',
  },
  {
    icon: Soup,
    title: 'Someone eats today',
    text: 'A child, a family, an elder — surplus becomes a warm plate, and the impact is recorded.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f4f7f2]">
      <SiteHeader variant="dark" cta={{ label: 'Get Started', href: '/register' }} />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/hero-community.jpg"
          alt="Volunteers serving warm food to a community"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* warm green wash so text stays readable and on-brand */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b2012]/92 via-[#0e2916]/75 to-[#11331c]/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b2012]/80 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-32 md:px-6 md:pb-28 md:pt-44">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#bff0c8] backdrop-blur-sm">
              <Sprout size={14} /> Save Food. Feed People.
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
              Good food should never go to waste
              <span className="text-[#7ee69a]"> while someone goes hungry.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 md:text-xl">
              MealSaver turns a kitchen&apos;s surplus into a family&apos;s dinner — connecting
              generous donors with verified NGOs through fast, safe, tracked pickup.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/donor/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[#22a34a] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#0b2012]/30 transition-all hover:-translate-y-0.5 hover:bg-[#1c8d40] md:text-lg"
              >
                <Heart size={20} /> Donate Surplus Food
              </Link>
              <Link
                href="/ngo/register"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/40 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20 md:text-lg"
              >
                Join as an NGO
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-white/75">
              <span className="font-semibold text-white">48,000+ meals served</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>72 NGO partners</span>
              <span className="h-1 w-1 rounded-full bg-white/40" />
              <span>19 tonnes rescued</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission / why ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-28">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
          <Reveal className="order-2 md:order-1">
            <div className="relative">
              <div className="overflow-hidden rounded-3xl shadow-xl shadow-[#11291a]/10">
                <Image
                  src="/images/children-meal.jpg"
                  alt="Schoolchildren enjoying a freshly served lunch"
                  width={860}
                  height={1080}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-4 hidden rounded-2xl bg-white px-5 py-4 shadow-lg ring-1 ring-[#e4e9e1] sm:block">
                <p className="text-2xl font-extrabold text-[#14843e]">1 in 9</p>
                <p className="text-xs text-[#5f6d63]">people go to bed hungry</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80} className="order-1 md:order-2">
            <span className="text-sm font-semibold uppercase tracking-wide text-[#14843e]">Why MealSaver</span>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight text-[#141b17] md:text-4xl">
              A third of all food is wasted. Millions still sleep hungry.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#5f6d63] md:text-lg">
              The food exists. The people who need it exist. What is missing is the bridge between
              them — fast enough that a hot meal is still a hot meal.
            </p>
            <p className="mt-4 text-base leading-relaxed text-[#5f6d63] md:text-lg">
              MealSaver is that bridge. We help good kitchens give instead of bin, and help NGOs
              reach more people with less effort. Every donation is a small act of dignity.
            </p>

            <ul className="mt-7 space-y-3">
              {[
                'Surplus reaches people in hours, not bins',
                'Verified NGOs keep every pickup safe and accountable',
                'Real numbers, so you can see the good you have done',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-[#2c3a30]">
                  <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[#e3f4e6] text-[#14843e]">
                    <Heart size={14} />
                  </span>
                  <span className="text-[15px] leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="bg-white py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wide text-[#14843e]">How it works</span>
            <h2 className="mt-3 text-3xl font-extrabold text-[#141b17] md:text-4xl">
              From surplus to a smile, in four steps
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 90}>
                <article className="group relative h-full rounded-2xl border border-[#e4e9e1] bg-[#fbfdfb] p-6 transition-all hover:-translate-y-1 hover:border-[#bfe3c6] hover:shadow-lg hover:shadow-[#11291a]/5">
                  <span className="absolute right-5 top-5 text-3xl font-black text-[#eef5ee] transition-colors group-hover:text-[#dcefdd]">
                    0{i + 1}
                  </span>
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#17883f] text-white shadow-sm">
                    <step.icon size={26} strokeWidth={2.1} />
                  </div>
                  <h3 className="text-lg font-bold text-[#1c241f]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5f6d63]">{step.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Impact numbers band ──────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[#0e2415]">
        <Image
          src="/images/kids-sharing.jpg"
          alt=""
          fill
          aria-hidden="true"
          sizes="100vw"
          className="object-cover opacity-[0.14]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e2415]/70 to-[#0e2415]/95" />
        <div className="relative mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-white md:text-4xl">The impact we make together</h2>
            <p className="mt-3 text-[#a9c0aa]">Every plate adds up. Here is what our community has done so far.</p>
          </Reveal>

          <div className="mt-14 grid grid-cols-2 gap-8 md:grid-cols-4">
            {impactBigStats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 90} className="text-center">
                <p className="text-4xl font-extrabold text-[#7ee69a] md:text-5xl">{stat.value}</p>
                <p className="mt-2 text-base font-semibold text-white">{stat.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#a9c0aa]">{stat.sub}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery: moments from the field ──────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-[#14843e]">Moments from the field</span>
          <h2 className="mt-3 text-3xl font-extrabold text-[#141b17] md:text-4xl">
            This is who your surplus feeds
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
          {galleryImages.map((img, i) => (
            <Reveal
              key={img.src}
              delay={i * 70}
              className={img.span ? 'col-span-2 row-span-2' : ''}
            >
              <figure
                className={
                  'group relative h-full w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-[#e4e9e1] ' +
                  (img.span ? 'min-h-[260px] md:min-h-[420px]' : 'min-h-[180px] md:min-h-[200px]')
                }
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b2012]/75 via-transparent to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 p-4 text-sm font-semibold text-white">
                  {img.caption}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/kids-eating.jpg"
          alt="Children enjoying a meal together"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#0b2012]/80" />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center md:px-6 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-extrabold leading-tight text-white md:text-5xl">
              Be the reason someone eats today.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
              Whether you cook it or carry it, you have a place here. Join MealSaver and turn
              everyday surplus into everyday kindness.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Link
                href="/donor/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[#22a34a] px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#1c8d40] md:text-lg"
              >
                Donate Food <ArrowRight size={18} />
              </Link>
              <Link
                href="/ngo/register"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/40 bg-white/10 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20 md:text-lg"
              >
                Join as an NGO
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
