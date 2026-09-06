import { Suspense } from 'react'
import { HomeView } from '@/views/HomeView'

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeView />
    </Suspense>
  )
}
