import { useEffect, useMemo, useRef } from 'react'
import { BreathCircle } from '../components/BreathCircle'
import { CountdownRing } from '../components/CountdownRing'
import { usePlayer } from '../hooks/usePlayer'
import { breathStateAt, findSegmentIndex } from '../lib/timeline'
import { cancelSpeech, speak } from '../lib/speech'
import { ensureAudio, playBreathCue, playFinish, playSegmentChange, playTick } from '../lib/sound'
import { formatDuration } from '../lib/util'
import type { HistoryEntry, Settings, Workout } from '../types'

interface Props {
  workout: Workout
  settings: Settings
  onExit: () => void
  /** 完整跑完时回调，用于记录训练历史 */
  onComplete: (entry: HistoryEntry) => void
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

  /** 下一个要做的动作（准备/休息片段预告用） */
  const nextExercise = useMemo(() => {
    if (seg.type === 'exercise') return workout.exercises[seg.exerciseIndex + 1] ?? null
    return workout.exercises[seg.exerciseIndex] ?? null
  }, [seg, workout])

  function handleFinish() {
    onComplete({
      workoutName: workout.name,
      totalSec: Math.round(timeline.totalMs / 1000),
      exerciseCount: workout.exercises.length,
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
      speak(`${exercise.name}，开始`, { volume: settings.voiceEnabled ? settings.volume : 0 })
      playSegmentChange(settings.soundEnabled ? settings.volume : 0)
    } else if (seg.type === 'prepare') {
      speak(`准备，${workout.name}`, { volume: settings.voiceEnabled ? settings.volume : 0 })
      playSegmentChange(settings.soundEnabled ? settings.volume : 0)
    } else if (seg.type === 'rest') {
      speak('休息一下', { volume: settings.voiceEnabled ? settings.volume : 0 })
    }
  }, [segIdx, seg.type, exercise, workout.name, settings, finished])

  // ── 提示逻辑：呼吸相位切换 ──────────────────────────
  const prevBreathKey = useRef('')
  useEffect(() => {
    if (finished || !breath) return
    if (prevBreathKey.current === breathKey) return
    prevBreathKey.current = breathKey
    const word = breath.phase === 'inhale' ? '吸气' : '呼气'
    speak(word, { volume: settings.voiceEnabled ? settings.volume : 0 })
    playBreathCue(breath.phase, settings.soundEnabled ? settings.volume : 0)
  }, [breathKey, breath, settings, finished])

  // ── 提示逻辑：最后 3 秒哔声 + 下一动作预告 ───────────
  const prevTick = useRef(-1)
  useEffect(() => {
    if (finished) return
    if (prevTick.current === secondsLeft) return
    prevTick.current = secondsLeft
    if (secondsLeft >= 1 && secondsLeft <= 3) {
      playTick(settings.soundEnabled ? settings.volume : 0)
      if (seg.type !== 'exercise' && nextExercise && secondsLeft === 3) {
        speak(`下一个：${nextExercise.name}`, { volume: settings.voiceEnabled ? settings.volume : 0 })
      }
    }
  }, [secondsLeft, seg.type, nextExercise, settings, finished])

  // ── 训练完成提示 ─────────────────────────────────
  useEffect(() => {
    if (!finished) return
    cancelSpeech()
    playFinish(settings.soundEnabled ? settings.volume : 0)
    speak('训练完成，辛苦了！', { volume: settings.voiceEnabled ? settings.volume : 0 })
  }, [finished, settings])

  // ── 键盘快捷键（桌面端） ──────────────────────────
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
  }, [player])

  // ── 结束页 ──────────────────────────────────────
  if (finished) {
    return (
      <div className="player-screen done-screen">
        <div className="done-emoji">🎉</div>
        <h1>训练完成！</h1>
        <p className="done-sub">坚持就是胜利，别忘了拉伸放松</p>
        <div className="done-stats">
          <div className="stat">
            <div className="stat-num">{formatDuration(timeline.totalMs / 1000)}</div>
            <div className="stat-label">总用时</div>
          </div>
          <div className="stat">
            <div className="stat-num">{workout.exercises.length}</div>
            <div className="stat-label">完成动作</div>
          </div>
          <div className="stat">
            <div className="stat-num">{workout.name}</div>
            <div className="stat-label">课程</div>
          </div>
        </div>
        <div className="done-actions">
          <button className="btn btn-secondary" onClick={onExit}>
            返回首页
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              ensureAudio()
              player.restart()
            }}
          >
            再来一次
          </button>
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
        <div className={`phase-label ${breath.phase === 'inhale' ? 'phase-inhale' : 'phase-exhale'}`}>
          {breath.phase === 'inhale' ? '吸气' : '呼气'}
        </div>
        <div className="seconds-num">{secondsLeft}</div>
      </>
    ) : (
      <>
        <div className="seg-type-label">{seg.type === 'prepare' ? '准备' : '休息'}</div>
        <div className="seconds-num">{secondsLeft}</div>
      </>
    )

  return (
    <div className="player-screen">
      <div className="player-top">
        <button className="icon-btn" onClick={onExit} aria-label="退出训练">
          ✕
        </button>
        <div className="overall-bar">
          <div className="overall-fill" style={{ width: `${(elapsedMs / timeline.totalMs) * 100}%` }} />
        </div>
        <div className="overall-time">{formatDuration(elapsedMs / 1000)}</div>
      </div>

      <div className="player-main">
        <div className="exercise-name">
          {seg.type === 'exercise' && exercise ? exercise.name : seg.type === 'rest' ? '休息' : '即将开始'}
        </div>
        <CountdownRing remainingMs={segRemaining} durationMs={seg.durationMs} size={300}>
          {ringCenter}
        </CountdownRing>
        <div className="exercise-tip">
          {seg.type === 'exercise' && exercise?.tip ? `💡 ${exercise.tip}` : nextExercise ? `下一个：${nextExercise.name}` : ''}
        </div>
        {!running && <div className="paused-badge">已暂停</div>}
      </div>

      <div className="player-controls">
        <button className="ctrl-btn" onClick={player.prev} aria-label="上一动作">
          ⏮
        </button>
        <button className="ctrl-btn ctrl-main" onClick={player.togglePause} aria-label={running ? '暂停' : '继续'}>
          {running ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={player.next} aria-label="跳过">
          ⏭
        </button>
      </div>
    </div>
  )
}
