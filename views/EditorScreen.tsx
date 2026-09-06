'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FullScreenLoader, Redirect } from '@/components/screen'
import { Editor } from '@/views/Editor'
import { loadCustomWorkouts, upsertCustomWorkout } from '@/lib/storage'
import { uid } from '@/lib/util'
import type { Workout } from '@/types'
import { PRESET_WORKOUTS } from '@/data/presets'

/** 按 key（preset:<id> / custom:<id>）解析课程 */
function resolveWorkoutByKey(key: string | null): Workout | null {
  if (!key) return null
  const colon = key.indexOf(':')
  if (colon < 0) return null
  const ns = key.slice(0, colon)
  const id = key.slice(colon + 1)
  if (ns === 'preset') return PRESET_WORKOUTS.find((w) => w.id === id) ?? null
  if (ns === 'custom') return loadCustomWorkouts().find((w) => w.id === id) ?? null
  return null
}

function blankWorkout(): Workout {
  return {
    id: uid(),
    name: '',
    exercises: [{ id: uid(), name: '', durationSec: 30, breath: { inhaleSec: 2, exhaleSec: 2 }, tip: '' }],
    prepareSec: 10,
    restSec: 15,
  }
}

export function EditorScreen() {
  const router = useRouter()
  const params = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return <FullScreenLoader />

  const editKey = params.get('key')
  const fromKey = params.get('from')

  const handleSave = (w: Workout) => {
    upsertCustomWorkout({ ...w, preset: false })
    router.push('/')
  }

  // 编辑已有自定义课程：解析不到（已删除）则回首页
  if (editKey) {
    const existing = resolveWorkoutByKey(editKey)
    if (!existing || existing.preset) return <Redirect to="/" />
    return (
      <Editor
        key={editKey}
        initial={structuredClone(existing)}
        isNew={false}
        onSave={handleSave}
        onCancel={() => router.push('/')}
      />
    )
  }

  // 新建（可带 from 来源：复制改造）
  let initial = blankWorkout()
  if (fromKey) {
    const source = resolveWorkoutByKey(fromKey)
    if (source) {
      initial = {
        ...structuredClone(source),
        id: uid(),
        name: `${source.name}（自用版）`,
        preset: false,
        exercises: source.exercises.map((e) => ({ ...structuredClone(e), id: uid() })),
      }
    }
  }

  return (
    <Editor
      key={`new-${fromKey ?? ''}`}
      initial={initial}
      isNew
      onSave={handleSave}
      onCancel={() => router.push('/')}
    />
  )
}
