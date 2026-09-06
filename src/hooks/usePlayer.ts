import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTimeline, findSegmentIndex } from '../lib/timeline'
import type { Workout } from '../types'

export interface PlayerControls {
  /** 时间轴上的当前时刻（毫秒） */
  elapsedMs: number
  running: boolean
  finished: boolean
  timeline: ReturnType<typeof buildTimeline>
  togglePause: () => void
  /** 跳过当前片段（动作 → 休息 / 休息 → 下一动作） */
  next: () => void
  /** 回到当前片段开头；片段刚开始则回到上一片段 */
  prev: () => void
  restart: () => void
}

/**
 * 基于真实时间戳（performance.now）驱动的时间轴播放器：
 * 暂停累计、跳转、后台切换回来都能精确对齐，不依赖定时器精度。
 */
export function usePlayer(workout: Workout, onFinish: () => void): PlayerControls {
  const timeline = useMemo(() => buildTimeline(workout), [workout])

  const [running, setRunning] = useState(true)
  const [finished, setFinished] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)

  const startRef = useRef(performance.now())
  const accumRef = useRef(0)
  const finishedRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    if (!running) return
    let raf = 0
    const tick = () => {
      const e = accumRef.current + (performance.now() - startRef.current)
      if (e >= timeline.totalMs) {
        setElapsedMs(timeline.totalMs)
        if (!finishedRef.current) {
          finishedRef.current = true
          setFinished(true)
          onFinishRef.current()
        }
        return
      }
      setElapsedMs(e)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, timeline])

  const jumpTo = (ms: number) => {
    const target = Math.max(0, Math.min(ms, timeline.totalMs))
    accumRef.current = target
    startRef.current = performance.now()
    setElapsedMs(target)
  }

  const togglePause = () => {
    if (finished) return
    if (running) {
      accumRef.current += performance.now() - startRef.current
      setRunning(false)
    } else {
      startRef.current = performance.now()
      setRunning(true)
    }
  }

  const next = () => {
    const idx = findSegmentIndex(timeline, elapsedMs)
    const seg = timeline.segments[idx]
    if (!seg) return
    jumpTo(seg.startMs + seg.durationMs)
  }

  const prev = () => {
    const idx = findSegmentIndex(timeline, elapsedMs)
    const seg = timeline.segments[idx]
    if (!seg) return
    if (elapsedMs - seg.startMs > 2000 || idx === 0) {
      jumpTo(seg.startMs)
    } else {
      jumpTo(timeline.segments[idx - 1].startMs)
    }
  }

  const restart = () => {
    finishedRef.current = false
    setFinished(false)
    jumpTo(0)
    startRef.current = performance.now()
    setRunning(true)
  }

  return { elapsedMs, running, finished, timeline, togglePause, next, prev, restart }
}
