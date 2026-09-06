import { useState } from 'react'
import { Home } from './pages/Home'
import { Player } from './pages/Player'
import { Editor } from './pages/Editor'
import { addHistory, deleteCustomWorkout, loadSettings, loadCustomWorkouts, saveSettings, upsertCustomWorkout } from './lib/storage'
import { ensureAudio } from './lib/sound'
import { uid } from './lib/util'
import type { HistoryEntry, Settings, Workout } from './types'
import { DEFAULT_SETTINGS } from './types'

type View =
  | { name: 'home' }
  | { name: 'player'; workout: Workout }
  | { name: 'editor'; workout: Workout; isNew: boolean }

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' })
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [customWorkouts, setCustomWorkouts] = useState<Workout[]>(() => loadCustomWorkouts())
  const [, setHistory] = useState<HistoryEntry[]>([])

  const updateSettings = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
  }

  const handlePlay = (w: Workout) => {
    ensureAudio() // 借用户点击解锁音频与语音
    setView({ name: 'player', workout: w })
  }

  const handleComplete = (entry: HistoryEntry) => {
    setHistory(addHistory(entry))
  }

  const handleNew = () => {
    setView({
      name: 'editor',
      isNew: true,
      workout: {
        id: uid(),
        name: '',
        exercises: [{ id: uid(), name: '', durationSec: 30, breath: { inhaleSec: 2, exhaleSec: 2 }, tip: '' }],
        prepareSec: 10,
        restSec: 15,
      },
    })
  }

  const handleDuplicate = (w: Workout) => {
    setView({
      name: 'editor',
      isNew: true,
      workout: {
        ...structuredClone(w),
        id: uid(),
        name: `${w.name}（自用版）`,
        preset: false,
        exercises: w.exercises.map((e) => ({ ...structuredClone(e), id: uid() })),
      },
    })
  }

  const handleEditCustom = (w: Workout) => {
    setView({ name: 'editor', isNew: false, workout: structuredClone(w) })
  }

  const handleSave = (w: Workout) => {
    setCustomWorkouts(upsertCustomWorkout({ ...w, preset: false }))
    setView({ name: 'home' })
  }

  const handleDelete = (id: string) => {
    if (!confirm('确定删除这个课程吗？')) return
    setCustomWorkouts(deleteCustomWorkout(id))
  }

  if (view.name === 'player') {
    return (
      <Player
        workout={view.workout}
        settings={settings}
        onExit={() => setView({ name: 'home' })}
        onComplete={handleComplete}
      />
    )
  }

  if (view.name === 'editor') {
    return <Editor initial={view.workout} isNew={view.isNew} onSave={handleSave} onCancel={() => setView({ name: 'home' })} />
  }

  return (
    <Home
      customWorkouts={customWorkouts}
      settings={{ ...DEFAULT_SETTINGS, ...settings }}
      onSettingsChange={updateSettings}
      onPlay={handlePlay}
      onEdit={handleEditCustom}
      onDuplicate={handleDuplicate}
      onNew={handleNew}
      onDelete={handleDelete}
    />
  )
}
