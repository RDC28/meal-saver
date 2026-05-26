import { Zap, ShieldCheck, BarChart2, UtensilsCrossed, Leaf, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export interface Stat {
  icon: LucideIcon
  value: string
  unit: string
  label: string
}

export const landingFeatures: Feature[] = [
  {
    icon: Zap,
    title: 'Fast Matching',
    description: 'We match surplus food with nearby NGOs in minutes.',
  },
  {
    icon: ShieldCheck,
    title: 'Safe Pickup',
    description: 'Verified partners ensure hygienic and timely pickup.',
  },
  {
    icon: BarChart2,
    title: 'Transparent Impact',
    description: 'Track every meal delivered and the impact created.',
  },
]

export const landingStats: Stat[] = [
  { icon: UtensilsCrossed, value: '1,240', unit: '', label: 'Meals Saved' },
  { icon: Leaf, value: '320', unit: ' kg', label: 'Waste Reduced' },
  { icon: Users, value: '72', unit: '', label: 'Active NGOs' },
]
