import { cn } from '@/lib/utils'

type Status =
  | 'available'
  | 'accepted'
  | 'picked_up'
  | 'delivered'
  | 'expired'
  | 'pending'
  | 'in_transit'
  | 'rejected'
  | 'pending_acceptance'
  | 'pickup_assigned'
  | 'cancelled'
  | 'unsafe'
  | 'assigned'
  | 'in_progress'
  | 'verified'
  | 'completed'
  | 'failed'

const statusMap: Record<Status, { label: string; className: string }> = {
  available:          { label: 'Available',       className: 'bg-green-50 text-green-700 border-green-200' },
  accepted:           { label: 'Accepted',        className: 'bg-blue-50 text-blue-700 border-blue-200' },
  picked_up:          { label: 'Picked Up',       className: 'bg-orange-50 text-orange-700 border-orange-200' },
  delivered:          { label: 'Delivered',       className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired:            { label: 'Expired',         className: 'bg-red-50 text-red-500 border-red-200' },
  pending:            { label: 'Pending',         className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  in_transit:         { label: 'In Transit',      className: 'bg-purple-50 text-purple-700 border-purple-200' },
  rejected:           { label: 'Rejected',        className: 'bg-red-50 text-red-700 border-red-200' },
  pending_acceptance: { label: 'Matching NGOs',   className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  pickup_assigned:    { label: 'Pickup Assigned', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  cancelled:          { label: 'Cancelled',       className: 'bg-gray-50 text-gray-500 border-gray-200' },
  unsafe:             { label: 'Unsafe',          className: 'bg-red-50 text-red-700 border-red-200' },
  assigned:           { label: 'Assigned',        className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_progress:        { label: 'In Progress',     className: 'bg-orange-50 text-orange-700 border-orange-200' },
  verified:           { label: 'Verified',        className: 'bg-teal-50 text-teal-700 border-teal-200' },
  completed:          { label: 'Completed',       className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed:             { label: 'Failed',          className: 'bg-red-50 text-red-700 border-red-200' },
}

export function StatusBadge({ status }: { status: Status }) {
  const s = statusMap[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        s.className
      )}
    >
      {s.label}
    </span>
  )
}
