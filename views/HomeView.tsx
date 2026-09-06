'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRightIcon,
  CopyIcon,
  DumbbellIcon,
  HistoryIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SettingsIcon,
  TimerIcon,
  Trash2Icon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatDuration, workoutKey } from '@/lib/util'
import { deleteCustomWorkout, loadCustomWorkouts, loadHistory, loadSettings, saveSettings } from '@/lib/storage'
import { ensureAudio } from '@/lib/sound'
import type { HistoryEntry, Settings, Workout } from '@/types'
import { PRESET_WORKOUTS } from '@/data/presets'

function workoutTotalSec(w: Workout): number {
  const rest = w.exercises.length > 1 ? w.restSec * (w.exercises.length - 1) : 0
  return w.prepareSec + w.exercises.reduce((s, e) => s + e.durationSec, 0) + rest
}

function isToday(ts: number): boolean {
  const d = new Date(ts)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function WorkoutCard(props: {
  w: Workout
  isPreset: boolean
  onPlay: (w: Workout) => void
  onEdit?: (w: Workout) => void
  onDuplicate?: (w: Workout) => void
  onDelete?: (id: string) => void
}) {
  const { w, isPreset } = props
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {w.name}
          {isPreset && (
            <Badge variant="outline" className="border-primary/40 text-primary">
              内置
            </Badge>
          )}
        </CardTitle>
        {w.description && <CardDescription>{w.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <TimerIcon data-icon="inline-start" />
          <span>{formatDuration(workoutTotalSec(w))}</span>
          <span>·</span>
          <span>{w.exercises.length} 个动作</span>
          <span>·</span>
          <span>休息 {w.restSec}s</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => props.onPlay(w)}>
            <PlayIcon data-icon="inline-start" />
            开始
          </Button>
          {isPreset && props.onDuplicate && (
            <Button size="sm" variant="outline" onClick={() => props.onDuplicate!(w)}>
              <CopyIcon data-icon="inline-start" />
              复制编辑
            </Button>
          )}
          {!isPreset && props.onEdit && (
            <Button size="sm" variant="outline" onClick={() => props.onEdit!(w)}>
              <PencilIcon data-icon="inline-start" />
              编辑
            </Button>
          )}
          {!isPreset && props.onDelete && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => props.onDelete!(w.id)}>
              <Trash2Icon data-icon="inline-start" />
              删除
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function HomeView() {
  const router = useRouter()
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [customWorkouts, setCustomWorkouts] = useState<Workout[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null)

  // localStorage 数据在挂载后读取，保证静态导出的预渲染与客户端首帧一致
  useEffect(() => {
    setSettings(loadSettings())
    setCustomWorkouts(loadCustomWorkouts())
    setHistory(loadHistory())
  }, [])

  const updateSettings = (s: Settings) => {
    setSettings(s)
    saveSettings(s)
  }

  const todaySec = history.filter((h) => isToday(h.completedAt)).reduce((s, h) => s + h.totalSec, 0)

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pt-5 pb-8">
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="bg-gradient-to-br from-brand-a to-brand-b bg-clip-text text-3xl font-extrabold tracking-wide text-transparent">
            FitFlow
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">跟着节拍练，呼吸不迷路</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" aria-label="训练历史" onClick={() => router.push('/history')}>
            <HistoryIcon />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="设置"
            aria-expanded={showSettings}
            onClick={() => setShowSettings((v) => !v)}
          >
            <SettingsIcon />
          </Button>
        </div>
      </header>

      {showSettings && settings && (
        <Card className="mb-3">
          <CardContent>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="setting-voice">语音播报（吸气 / 呼气 / 动作名）</FieldLabel>
                <Switch
                  id="setting-voice"
                  checked={settings.voiceEnabled}
                  onCheckedChange={(checked) => updateSettings({ ...settings, voiceEnabled: checked })}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="setting-sound">提示音</FieldLabel>
                <Switch
                  id="setting-sound"
                  checked={settings.soundEnabled}
                  onCheckedChange={(checked) => updateSettings({ ...settings, soundEnabled: checked })}
                />
              </Field>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="setting-volume">音量</FieldLabel>
                <Slider
                  id="setting-volume"
                  className="max-w-40"
                  min={0}
                  max={100}
                  value={Math.round(settings.volume * 100)}
                  onValueChange={(v) => {
                    const val = Array.isArray(v) ? v[0] : v
                    updateSettings({ ...settings, volume: val / 100 })
                  }}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <button
          type="button"
          className="mb-3 flex w-full items-center justify-between rounded-lg px-1 py-1 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/history')}
        >
          <span>
            {todaySec > 0 ? `今日已练 ${Math.round(todaySec / 60)} 分钟` : '今天还没动起来'}
            {` · 累计完成 ${history.length} 次`}
          </span>
          <ChevronRightIcon data-icon="inline-end" />
        </button>
      )}

      <h2 className="mt-5 mb-2.5 text-base font-semibold">内置课程</h2>
      <div className="flex flex-col gap-3">
        {PRESET_WORKOUTS.map((w) => (
          <WorkoutCard
            key={w.id}
            w={w}
            isPreset
            onPlay={(x) => {
              ensureAudio() // 借用户点击解锁音频与语音
              router.push(`/player?key=${workoutKey(x)}`)
            }}
            onDuplicate={(x) => router.push(`/editor?from=${workoutKey(x)}`)}
          />
        ))}
      </div>

      <div className="mt-5 mb-2.5 flex items-center justify-between">
        <h2 className="text-base font-semibold">我的课程</h2>
        <Button size="sm" variant="ghost" onClick={() => router.push('/editor')}>
          <PlusIcon data-icon="inline-start" />
          新建
        </Button>
      </div>
      {customWorkouts.length === 0 ? (
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DumbbellIcon />
            </EmptyMedia>
            <EmptyTitle>还没有自己的课程</EmptyTitle>
            <EmptyDescription>
              点击「内置课程」卡片上的「复制编辑」，改造成你的专属节奏。
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {customWorkouts.map((w) => (
            <WorkoutCard
              key={w.id}
              w={w}
              isPreset={false}
              onPlay={(x) => {
                ensureAudio()
                router.push(`/player?key=${workoutKey(x)}`)
              }}
              onEdit={(x) => router.push(`/editor?key=${workoutKey(x)}`)}
              onDelete={(id) => {
                const target = customWorkouts.find((x) => x.id === id)
                if (target) setDeleteTarget(target)
              }}
            />
          ))}
        </div>
      )}

      <Separator className="my-6" />
      <footer className="text-center text-xs text-muted-foreground">FitFlow · 数据保存在本浏览器中</footer>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除课程</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{deleteTarget?.name}」吗？该操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return
                setCustomWorkouts(deleteCustomWorkout(deleteTarget.id))
                setDeleteTarget(null)
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
