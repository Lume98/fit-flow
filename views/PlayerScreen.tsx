'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Redirect, FullScreenLoader } from '@/components/screen'
import { Player } from '@/views/Player'
import { loadCustomWorkouts, loadSettings } from '@/lib/storage'
import { addHistory } from '@/lib/storage'
import type { Workout } from '@/types'
import { PRESET_WORKOUTS } from '@/data/presets'

/** 按 key（preset:<id> / custom:<id>）解析课程 */
function resolveWorkout(key: string | null): Workout | null {
  if (!key) return null
  const colon = key.indexOf(':')
  if (colon < 0) return null
  const ns = key.slice(0, colon)
  const id = key.slice(colon + 1)
  if (ns === 'preset') return PRESET_WORKOUTS.find((w) => w.id === id) ?? null
  if (ns === 'custom') return loadCustomWorkouts().find((w) => w.id === id) ?? null
  return null
}

export function PlayerScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 预渲染阶段：key 来自 localStorage/URL，挂载后再解析，保证首帧一致
  if (!mounted) return <FullScreenLoader />

  const workout = resolveWorkout(params.get('key'))
  if (!workout) {
    // 课程不存在（已删除或链接失效）：回到首页
    return <Redirect to="/" />
  }

  return (
    <Player
      workout={workout}
      settings={loadSettings()}
      onExit={() => router.push('/')}
      onComplete={(entry) => addHistory(entry)}
    />
  )
}
