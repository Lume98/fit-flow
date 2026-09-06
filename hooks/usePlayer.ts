import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
 * 所有回调均为稳定引用（useCallback），供键盘监听等 effect 安全依赖。
 */
export function usePlayer(workout: Workout, onFinish: () => void): PlayerControls {
  const timeline = useMemo(() => buildTimeline(workout), [workout])

  const [running, setRunning] = useState(true)
  const [finished, setFinished] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  /** 每次 restart 递增，驱动 rAF 循环重启 */
  const [runId, setRunId] = useState(0)

  const startRef = useRef(performance.now())
  const accumRef = useRef(0)
  const elapsedRef = useRef(0)
  const runningRef = useRef(true)
  const finishedRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    if (!running) return
    let raf = 0
    const tick = () => {
      const e = accumRef.current + (performance.now() - startRef.current)
      if (e >= timeline.totalMs) {
        elapsedRef.current = timeline.totalMs
        setElapsedMs(timeline.totalMs)
        if (!finishedRef.current) {
          finishedRef.current = true
          setFinished(true)
          onFinishRef.current()
        }
        return
      }
      elapsedRef.current = e
      setElapsedMs(e)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, timeline, runId])

  const jumpTo = useCallback(
    (ms: number) => {
      const target = Math.max(0, Math.min(ms, timeline.totalMs))
      accumRef.current = target
      startRef.current = performance.now()
      elapsedRef.current = target
      setElapsedMs(target)
    },
    [timeline],
  )

  const togglePause = useCallback(() => {
    if (finishedRef.current) return
    if (runningRef.current) {
      accumRef.current += performance.now() - startRef.current
      runningRef.current = false
      setRunning(false)
    } else {
      startRef.current = performance.now()
      runningRef.current = true
      setRunning(true)
    }
  }, [])

  const next = useCallback(() => {
    const idx = findSegmentIndex(timeline, elapsedRef.current)
    const seg = timeline.segments[idx]
    if (!seg) return
    jumpTo(seg.startMs + seg.durationMs)
  }, [timeline, jumpTo])

  const prev = useCallback(() => {
    const idx = findSegmentIndex(timeline, elapsedRef.current)
    const seg = timeline.segments[idx]
    if (!seg) return
    if (elapsedRef.current - seg.startMs > 2000 || idx === 0) {
      jumpTo(seg.startMs)
    } else {
      jumpTo(timeline.segments[idx - 1].startMs)
    }
  }, [timeline, jumpTo])

  const restart = useCallback(() => {
    finishedRef.current = false
    setFinished(false)
    jumpTo(0)
    startRef.current = performance.now()
    runningRef.current = true
    setRunning(true)
    setRunId((n) => n + 1)
  }, [jumpTo])

  return { elapsedMs, running, finished, timeline, togglePause, next, prev, restart }
}
