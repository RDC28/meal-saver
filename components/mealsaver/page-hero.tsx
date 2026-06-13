import Image from 'next/image'
import Link from 'next/link'

interface CTA {
  label: string
  href: string
}

interface PageHeroProps {
  image: string
  alt: string
  eyebrow?: string
  title: React.ReactNode
  subtitle: string
  primary?: CTA
  secondary?: CTA
}

/** Photographic hero band shared across the public marketing pages. */
export function PageHero({ image, alt, eyebrow, title, subtitle, primary, secondary }: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden">
      <Image src={image} alt={alt} fill priority sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b2012]/92 via-[#0e2916]/72 to-[#11331c]/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b2012]/70 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-32 md:px-6 md:pb-20 md:pt-40">
        <div className="max-w-2xl">
          {eyebrow && (
            <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#bff0c8] backdrop-blur-sm">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">{subtitle}</p>

          {(primary || secondary) && (
            <div className="mt-8 flex flex-wrap gap-4">
              {primary && (
                <Link
                  href={primary.href}
                  className="rounded-xl bg-[#22a34a] px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#1c8d40]"
                >
                  {primary.label}
                </Link>
              )}
              {secondary && (
                <Link
                  href={secondary.href}
                  className="rounded-xl border-2 border-white/40 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/20"
                >
                  {secondary.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
