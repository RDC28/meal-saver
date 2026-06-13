import Link from 'next/link'
import { Store, Users, CheckCircle2, ArrowRight } from 'lucide-react'
import { AuthLayout } from '@/components/mealsaver/auth-layout'

const options = [
  {
    href: '/donor/register',
    icon: Store,
    title: 'I have food to give',
    subtitle: 'Donor',
    perks: ['Restaurants, bakeries & cafés', 'List surplus food in minutes', 'Schedule a quick, safe pickup'],
  },
  {
    href: '/ngo/register',
    icon: Users,
    title: 'I serve people in need',
    subtitle: 'NGO / Receiver',
    perks: ['Shelters, kitchens & orphanages', 'Accept nearby donations', 'Track meals and impact'],
  },
]

export default function RegisterPage() {
  return (
    <AuthLayout
      image="/images/children-meal.jpg"
      imageAlt="Children sharing a warm meal together"
      panelTitle="Join the movement."
      panelSubtitle="It takes two minutes to start turning everyday surplus into someone's next warm meal."
      width="xl"
    >
      <div>
        <h1 className="text-2xl font-extrabold text-[#141b17]">How would you like to join?</h1>
        <p className="mt-1.5 text-sm text-[#5f6d63]">Choose the role that fits you. You can always reach out if you do both.</p>

        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {options.map(({ href, icon: Icon, title, subtitle, perks }) => (
            <Link
              key={title}
              href={href}
              className="group flex flex-col rounded-2xl border border-[#e4e9e1] bg-white px-6 pb-6 pt-7 shadow-sm transition-all hover:-translate-y-1 hover:border-[#bfe3c6] hover:shadow-lg hover:shadow-[#11291a]/5"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#17883f] text-white">
                <Icon size={26} strokeWidth={1.8} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-[#14843e]">{subtitle}</span>
              <h2 className="mt-1 text-lg font-bold text-[#141b17]">{title}</h2>

              <ul className="mt-4 mb-6 space-y-2.5">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-[#3f4d43]">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#14843e]" strokeWidth={2} />
                    {perk}
                  </li>
                ))}
              </ul>

              <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[#14843e]">
                Continue <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[#5f6d63]">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#14843e] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
