import Link from 'next/link'
import { Store, Users, CheckCircle2 } from 'lucide-react'

const options = [
  {
    href: '/donor/register',
    icon: Store,
    title: 'Register as Donor',
    perks: [
      'Restaurants, Bakeries, Cafes',
      'Upload surplus food or raw materials',
      'Schedule pickup quickly',
    ],
  },
  {
    href: '/ngo/register',
    icon: Users,
    title: 'Register as NGO / Receiver',
    perks: [
      'Shelters, Community Kitchens, Orphanages',
      'Accept nearby donations',
      'Track received meals and impact',
    ],
  },
]

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-foreground">Registration Choice</h1>
      <p className="mb-10 text-sm text-muted-foreground">
        Choose how you'd like to join MealSaver
      </p>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-6 md:grid-cols-2">
        {options.map(({ href, icon: Icon, title, perks }) => (
          <div
            key={title}
            className="flex flex-col rounded-2xl border border-border bg-card px-7 pb-7 pt-8 shadow-sm"
          >
            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <Icon size={30} className="text-primary" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-4 text-center text-lg font-bold text-primary">{title}</h2>

            {/* Divider */}
            <div className="mb-4 h-px bg-border" />

            {/* Perks */}
            <ul className="mb-7 space-y-2.5">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-primary"
                    strokeWidth={2}
                  />
                  {perk}
                </li>
              ))}
            </ul>

            <Link
              href={href}
              className="mt-auto w-full rounded-lg bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-10 flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>🌿</span>
        Together, we can reduce food waste and create a{' '}
        <strong className="text-foreground">hunger-free</strong> tomorrow.
      </p>
    </div>
  )
}
