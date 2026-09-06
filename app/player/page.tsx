import { Suspense } from 'react'
import { PlayerScreen } from '@/views/PlayerScreen'

export default function PlayerPage() {
  return (
    <Suspense fallback={null}>
      <PlayerScreen />
    </Suspense>
  )
}
