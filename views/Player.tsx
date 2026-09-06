'use client'

import { useEffect, useMemo, useRef } from 'react'
import { PartyPopperIcon, PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon, XIcon } from 'lucide-react'
import { BreathCircle } from '@/components/BreathCircle'
import { CountdownRing } from '@/components/CountdownRing'
import { ExerciseFigure } from '@/components/ExerciseFigure'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { usePlayer } from '@/hooks/usePlayer'
import { breathStateAt, findSegmentIndex } from '@/lib/timeline'
import { getPoseEntry } from '@/data/poses'
import { cancelSpeech, speak } from '@/lib/speech'
import { ensureAudio, playBreathCue, playFinish, playSegmentChange, playTick } from '@/lib/sound'
import { formatDuration } from '@/lib/util'
import type { Exercise, HistoryEntry, Settings, Workout } from '@/types'

interface Props {
  workout: Workout
  settings: Settings
  onExit: () => void
  /** 完整跑完时回调，用于记录训练历史 */
  onComplete: (entry: HistoryEntry) => void
}

/** 动作锻炼计划文案：组数 × 次数 / 每组保持时长 */
function planText(exercise: Exercise, setIndex?: number, setCount?: number): string {
  const parts: string[] = []
  if (setCount && setCount > 1) parts.push(`第 ${(setIndex ?? 0) + 1}/${setCount} 组`)
  if (exercise.reps && exercise.reps > 0) parts.push(`${exercise.reps} 次/组`)
  else parts.push(`保持 ${exercise.durationSec} 秒`)
  return parts.join(' · ')
}

export function Player({ workout, settings, onExit, onComplete }: Props) {
  const player = usePlayer(workout, handleFinish)
  const { elapsedMs, running, finished } = player

  const timeline = player.timeline

  const segIdx = findSegmentIndex(timeline, elapsedMs)
  const seg = timeline.segments[segIdx]
  const segElapsed = elapsedMs - seg.startMs
  const segRemaining = Math.max(0, seg.durationMs - segElapsed)
  const secondsLeft = Math.ceil(segRemaining / 1000)

  const exercise = seg.type === 'exercise' ? workout.exercises[seg.exerciseIndex] : null
  const breath = exercise ? breathStateAt(exercise, segElapsed) : null
  const breathKey = breath ? `${segIdx}-${breath.cycleIndex}-${breath.phase}` : ''

  /** 下一个要执行的动作片段（准备/休息预告用，含组号信息） */
  const nextExSeg = useMemo(
    () => timeline.segments.find((s) => s.type === 'exercise' && s.startMs > seg.startMs) ?? null,
    [timeline, seg.startMs],
  )
  const nextExercise = nextExSeg ? (workout.exercises[nextExSeg.exerciseIndex] ?? null) : null

  function handleFinish() {
    onComplete({
      workoutName: workout.name,
      totalSec: Math.round(timeline.totalMs / 1000),
      exerciseCount: timeline.segments.filter((s) => s.type === 'exercise').length,
      completedAt: Date.now(),
    })
  }

  // ── 提示逻辑：片段切换 ─────────────────────────────
  const prevSegIdx = useRef(-1)
  useEffect(() => {
    if (finished) return
    if (prevSegIdx.current === segIdx) return
    prevSegIdx.current = segIdx
    if (seg.type === 'exercise' && exercise) {
      const setNo = seg.setCount && seg.setCount > 1 ? `，第${(seg.setIndex ?? 0) + 1}组` : ''
      speak(`${exercise.name}${setNo}，开始`, { volume: settings.voiceEnabled ? settings.volume : 0 })
      playSegmentChange(settings.soundEnabled ? settings.volume : 0)
    } else if (seg.type === 'prepare') {
      speak(`准备，${workout.name}`, { volume: settings.voiceEnabled ? settings.volume : 0 })
      playSegmentChange(settings.soundEnabled ? settings.volume : 0)
    } else if (seg.type === 'rest') {
      speak('休息一下', { volume: settings.voiceEnabled ? settings.volume : 0 })
    }
  })

  // ── 提示逻辑：呼吸相位切换 ──────────────────────────
  const prevBreathKey = useRef('')
  useEffect(() => {
    if (finished || !breath) return
    if (prevBreathKey.current === breathKey) return
    prevBreathKey.current = breathKey
    const word = breath.phase === 'inhale' ? '吸气' : '呼气'
    speak(word, { volume: settings.voiceEnabled ? settings.volume : 0 })
    playBreathCue(breath.phase, settings.soundEnabled ? settings.volume : 0)
  })

  // ── 提示逻辑：最后 3 秒哔声 + 下一动作预告 ───────────
  const prevTick = useRef(-1)
  useEffect(() => {
    if (finished) return
    if (prevTick.current === secondsLeft) return
    prevTick.current = secondsLeft
    if (secondsLeft >= 1 && secondsLeft <= 3) {
      playTick(settings.soundEnabled ? settings.volume : 0)
      if (seg.type !== 'exercise' && nextExercise && nextExSeg && secondsLeft === 3) {
        const isNextSet =
          nextExSeg.setCount !== undefined && nextExSeg.setCount > 1 && (nextExSeg.setIndex ?? 0) > 0
        const upcoming = isNextSet
          ? `${nextExercise.name}，第${(nextExSeg.setIndex ?? 0) + 1}组`
          : nextExercise.name
        speak(`下一个：${upcoming}`, { volume: settings.voiceEnabled ? settings.volume : 0 })
      }
    }
  })

  // ── 训练完成提示 ─────────────────────────────────
  useEffect(() => {
    if (!finished) return
    cancelSpeech()
    playFinish(settings.soundEnabled ? settings.volume : 0)
    speak('训练完成，辛苦了！', { volume: settings.voiceEnabled ? settings.volume : 0 })
  }, [finished, settings])

  // ── 键盘快捷键（桌面端）：回调均为稳定引用，仅绑定一次 ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        player.togglePause()
      } else if (e.code === 'ArrowRight') player.next()
      else if (e.code === 'ArrowLeft') player.prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [player.togglePause, player.next, player.prev])

  // ── 结束页 ──────────────────────────────────────
  if (finished) {
    return (
      <div className="player-screen fixed inset-0 z-10 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/15">
          <PartyPopperIcon aria-hidden className="size-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">训练完成！</h1>
        <p className="text-muted-foreground">坚持就是胜利，别忘了拉伸放松</p>
        <div className="my-6 flex flex-wrap justify-center gap-3">
          <Card className="min-w-28 gap-0 py-4">
            <CardContent className="flex flex-col items-center px-4">
              <span className="text-xl font-bold text-primary">{formatDuration(timeline.totalMs / 1000)}</span>
              <span className="mt-1 text-xs text-muted-foreground">总用时</span>
            </CardContent>
          </Card>
          <Card className="min-w-28 gap-0 py-4">
            <CardContent className="flex flex-col items-center px-4">
              <span className="text-xl font-bold text-primary">{workout.exercises.length}</span>
              <span className="mt-1 text-xs text-muted-foreground">完成动作</span>
            </CardContent>
          </Card>
          <Card className="min-w-28 gap-0 py-4">
            <CardContent className="flex max-w-44 flex-col items-center px-4">
              <span className="line-clamp-2 text-xl font-bold text-primary">{workout.name}</span>
              <span className="mt-1 text-xs text-muted-foreground">课程</span>
            </CardContent>
          </Card>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onExit}>
            返回首页
          </Button>
          <Button
            className="btn-brand"
            onClick={() => {
              ensureAudio()
              player.restart()
            }}
          >
            再来一次
          </Button>
        </div>
      </div>
    )
  }

  // ── 跟练中 ──────────────────────────────────────
  const ringCenter =
    seg.type === 'exercise' && breath ? (
      <>
        <BreathCircle
          phase={breath.phase}
          phaseDurationMs={breath.phaseDurationMs}
          paused={!running}
        />
        <div
          className={`z-1 mb-3 text-xl font-bold tracking-[0.4em] ${breath.phase === 'inhale' ? 'text-inhale' : 'text-exhale'}`}
        >
          {breath.phase === 'inhale' ? '吸气' : '呼气'}
        </div>
        <div className="seconds-num">{secondsLeft}</div>
      </>
    ) : (
      <>
        <div className="mb-3 text-lg tracking-[0.4em] text-muted-foreground">
          {seg.type === 'prepare' ? '准备' : '休息'}
        </div>
        <div className="seconds-num">{secondsLeft}</div>
      </>
    )

  return (
    <div className="player-screen fixed inset-0 z-10 flex flex-col pt-[calc(16px+env(safe-area-inset-top))] px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onExit} aria-label="退出训练">
          <XIcon />
        </Button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-a to-brand-b transition-[width] duration-400 ease-linear"
            style={{ width: `${(elapsedMs / timeline.totalMs) * 100}%` }}
          />
        </div>
        <div className="min-w-11 text-right text-xs text-muted-foreground tabular-nums">
          {formatDuration(elapsedMs / 1000)}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
        <div className="text-center">
          <div className="text-2xl font-bold sm:text-3xl">
            {seg.type === 'exercise' && exercise ? exercise.name : seg.type === 'rest' ? '休息' : '即将开始'}
          </div>
          {seg.type === 'exercise' && exercise && (
            <div className="mt-1 text-sm font-medium text-primary">{planText(exercise, seg.setIndex, seg.setCount)}</div>
          )}
        </div>
        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          {seg.type === 'exercise' && exercise ? (
            <ExerciseFigure
              className="h-full max-h-60 w-auto"
              animation={getPoseEntry(exercise).animation}
              breath={exercise.breath}
              elapsedMs={segElapsed}
            />
          ) : (
            nextExercise && (
              <ExerciseFigure
                className="h-full max-h-60 w-auto opacity-40 transition-opacity"
                animation={getPoseEntry(nextExercise).animation}
                breath={{ inhaleSec: 2, exhaleSec: 2 }}
                elapsedMs={segElapsed}
              />
            )
          )}
        </div>
        <CountdownRing
          remainingMs={segRemaining}
          durationMs={seg.durationMs}
          className="w-[min(200px,48vw)]"
        >
          {ringCenter}
        </CountdownRing>
        <div className="min-h-6 max-w-[90%] text-center text-sm leading-relaxed text-muted-foreground">
          {seg.type === 'exercise' && exercise?.tip
            ? exercise.tip
            : nextExercise && nextExSeg
              ? nextExSeg.setCount !== undefined &&
                nextExSeg.setCount > 1 &&
                (nextExSeg.setIndex ?? 0) > 0
                ? `下一组：${nextExercise.name}（第 ${(nextExSeg.setIndex ?? 0) + 1} 组）`
                : `下一个：${nextExercise.name}`
              : ''}
        </div>
        {!running && (
          <Badge variant="outline" className="border-exhale/40 bg-exhale/15 text-exhale">
            已暂停
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-center gap-5 pb-[env(safe-area-inset-bottom)]">
        <Button variant="secondary" size="icon" className="size-16 rounded-full" onClick={player.prev} aria-label="上一动作">
          <SkipBackIcon className="size-6!" />
        </Button>
        <Button
          size="icon"
          className="btn-brand size-21 rounded-full"
          onClick={player.togglePause}
          aria-label={running ? '暂停' : '继续'}
        >
          {running ? <PauseIcon className="size-9!" /> : <PlayIcon className="size-9!" />}
        </Button>
        <Button variant="secondary" size="icon" className="size-16 rounded-full" onClick={player.next} aria-label="跳过">
          <SkipForwardIcon className="size-6!" />
        </Button>
      </div>
    </div>
  )
}
