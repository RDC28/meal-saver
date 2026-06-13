import Link from 'next/link'

const cols = [
  {
    title: 'Platform',
    links: [
      { label: 'How it Works', href: '/how-it-works' },
      { label: 'For Donors', href: '/for-donors' },
      { label: 'For NGOs', href: '/for-ngos' },
      { label: 'Impact', href: '/impact-overview' },
    ],
  },
  {
    title: 'Get Started',
    links: [
      { label: 'Donate Food', href: '/donor/register' },
      { label: 'Join as NGO', href: '/ngo/register' },
      { label: 'Log In', href: '/login' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-[#0e2415] text-[#d6e3d6]">
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-6 md:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <svg width="30" height="30" viewBox="0 0 38 38" fill="none" aria-hidden="true">
                <path d="M19 35V22" stroke="#86efac" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M19 22C19 22 9 20 7 12C5 5 11 2 15 4C19.5 6.5 19 16 19 22Z" fill="#22c55e" />
                <path d="M19 22C19 22 24 15 28 11C32 7 35 9 33 14C31 19 24 23 19 22Z" fill="#4ade80" opacity="0.9" />
              </svg>
              <span className="text-lg font-bold text-white">MealSaver</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#a9c0aa]">
              Surplus food is not waste. It is a warm meal waiting for someone who needs it.
              MealSaver connects kind kitchens with the people who care for the hungry.
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/90">{col.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[#a9c0aa] transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-[#85a087] md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} MealSaver — Save Food. Feed People.</p>
          <p>Photos: community partners, shared under Creative Commons.</p>
        </div>
      </div>
    </footer>
  )
}
