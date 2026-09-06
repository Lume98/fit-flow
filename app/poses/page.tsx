import type { Metadata } from 'next'
import { PoseGallery } from '@/views/PoseGallery'

export const metadata: Metadata = {
  title: '动作图鉴 · FitFlow',
}

export default function PosesPage() {
  return <PoseGallery />
}
