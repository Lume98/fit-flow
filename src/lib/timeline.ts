import type { Exercise, Workout } from '../types'

export type SegmentType = 'prepare' | 'exercise' | 'rest'

export interface Segment {
  type: SegmentType
  /** exercise 片段为当前动作下标；prepare/rest 指向其后的动作下标 */
  exerciseIndex: number
  /** 距训练开始的偏移毫秒 */
  startMs: number
  durationMs: number
}

export interface Timeline {
  segments: Segment[]
  totalMs: number
}

/** 把课程展开为：准备 → 动作 → 休息 → 动作 → … 的线性时间轴 */
export function buildTimeline(w: Workout): Timeline {
  const segments: Segment[] = []
  let cursor = 0

  if (w.prepareSec > 0) {
    segments.push({ type: 'prepare', exerciseIndex: 0, startMs: cursor, durationMs: w.prepareSec * 1000 })
    cursor += w.prepareSec * 1000
  }
  w.exercises.forEach((e, i) => {
    segments.push({ type: 'exercise', exerciseIndex: i, startMs: cursor, durationMs: e.durationSec * 1000 })
    cursor += e.durationSec * 1000
    if (i < w.exercises.length - 1 && w.restSec > 0) {
      segments.push({ type: 'rest', exerciseIndex: i + 1, startMs: cursor, durationMs: w.restSec * 1000 })
      cursor += w.restSec * 1000
    }
  })

  return { segments, totalMs: cursor }
}

export type BreathPhase = 'inhale' | 'exhale'

export interface BreathState {
  phase: BreathPhase
  /** 当前相位已进行毫秒 */
  phaseElapsedMs: number
  /** 当前相位总毫秒 */
  phaseDurationMs: number
  /** 呼吸循环序号（第几轮吸呼） */
  cycleIndex: number
}

/** 计算动作进行到某时刻的呼吸相位（按 吸气+呼气 循环） */
export function breathStateAt(exercise: Exercise, elapsedInExerciseMs: number): BreathState {
  const { inhaleSec, exhaleSec } = exercise.breath
  const inhaleMs = inhaleSec * 1000
  const exhaleMs = exhaleSec * 1000
  const cycleMs = inhaleMs + exhaleMs
  if (cycleMs <= 0) {
    return { phase: 'inhale', phaseElapsedMs: 0, phaseDurationMs: 0, cycleIndex: 0 }
  }

  const t = Math.max(0, Math.min(elapsedInExerciseMs, exercise.durationSec * 1000 - 1))
  const cycleIndex = Math.floor(t / cycleMs)
  const inCycle = t % cycleMs
  if (inCycle < inhaleMs || exhaleMs === 0) {
    return { phase: 'inhale', phaseElapsedMs: inCycle % inhaleMs, phaseDurationMs: inhaleMs, cycleIndex }
  }
  return { phase: 'exhale', phaseElapsedMs: inCycle - inhaleMs, phaseDurationMs: exhaleMs, cycleIndex }
}

/** 定位某时刻所在的片段下标（elapsed >= totalMs 时返回最后一个） */
export function findSegmentIndex(tl: Timeline, elapsedMs: number): number {
  const segs = tl.segments
  for (let i = segs.length - 1; i >= 0; i--) {
    if (elapsedMs >= segs[i].startMs) return i
  }
  return 0
}
