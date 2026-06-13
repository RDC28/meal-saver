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

// ── Big impact numbers for the landing stat band
export interface BigStat {
  value: string
  label: string
  sub: string
}

export const impactBigStats: BigStat[] = [
  { value: '48,000+', label: 'Meals served', sub: 'to families, shelters & kitchens' },
  { value: '19 tonnes', label: 'Food rescued', sub: 'kept off the landfill' },
  { value: '72', label: 'NGO partners', sub: 'verified and active' },
  { value: '4,300', label: 'Children reached', sub: 'with a warm plate' },
]

// ── Photographs for the "moments from the field" gallery
export interface GalleryImage {
  src: string
  alt: string
  caption: string
  span?: boolean
}

export const galleryImages: GalleryImage[] = [
  { src: '/images/kids-eating.jpg', alt: 'Children sharing a warm meal at a community canteen', caption: 'A hot lunch, shared together', span: true },
  { src: '/images/volunteers-packing.jpg', alt: 'Volunteers packing boxes of rescued food', caption: 'Volunteers on pickup day' },
  { src: '/images/food-bank.jpg', alt: 'Sorting surplus food at a community food bank', caption: 'Surplus, sorted with care' },
  { src: '/images/kids-sharing.jpg', alt: 'Children eating a freshly served meal', caption: 'Every plate counts' },
  { src: '/images/children-outdoor.jpg', alt: 'Children eating a meal together outdoors', caption: 'Reaching the last mile' },
]
