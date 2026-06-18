'use client'

import dynamic from 'next/dynamic'
import type { MatchMapProps } from './match-map-inner'

const MatchMapInner = dynamic(() => import('./match-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-xl border border-border bg-secondary/40 text-sm text-muted-foreground">
      Loading map engine…
    </div>
  ),
})

export type { MatchMapProps }

export function MatchMap(props: MatchMapProps) {
  return <MatchMapInner {...props} />
}
