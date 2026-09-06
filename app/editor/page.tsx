import { Suspense } from 'react'
import { EditorScreen } from '@/views/EditorScreen'

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <EditorScreen />
    </Suspense>
  )
}
