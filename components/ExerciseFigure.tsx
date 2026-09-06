'use client'

import { useId, useMemo } from 'react'
import { BONES, headAnchor, isFarBone, samplePose, type Pt } from '@/lib/figure'
import type { BreathPattern } from '@/types'

interface Props {
  animation: import('@/lib/figure').PoseAnimation
  /** 呼吸节拍：动作循环与其同步（吸气蓄力 → 呼气发力） */
  breath: BreathPattern
  /** 动作片段内已进行毫秒（由播放器驱动，暂停时自然冻结） */
  elapsedMs: number
  className?: string
}

const HEAD_R = 4.2
const STROKE_W = 2.8

const px = (pt: Pt, k: 0 | 1): number => Math.round(pt[k] * 1000) / 10

/**
 * 通用人体模型：按呼吸节拍循环演示动作姿态的火柴人。
 * 姿态数据见 data/poses.ts；帧间插值由 lib/figure.ts 完成。
 */
export function ExerciseFigure({ animation, breath, elapsedMs, className }: Props) {
  const gradId = useId()

  const { pose, view, groundY } = useMemo(() => {
    const cycleSec = Math.max(0.5, breath.inhaleSec + breath.exhaleSec)
    const cycles = animation.mode === 'hold' ? 1 : Math.max(1, animation.cyclesPerBreath ?? 1)
    const cycleMs = (cycleSec * 1000) / cycles
    const phase = (((elapsedMs % cycleMs) + cycleMs) % cycleMs) / cycleMs
    const inhaleFrac = breath.inhaleSec / cycleSec
    const rest = 1 - inhaleFrac
    const swell = rest > 0 ? (phase < inhaleFrac ? phase / inhaleFrac : 1 - (phase - inhaleFrac) / rest) : 0
    return {
      pose: samplePose(animation, phase, inhaleFrac, swell),
      view: animation.view,
      groundY: animation.ground ?? null,
    }
  }, [animation, breath, elapsedMs])

  const far = BONES.filter(isFarBone)
  const near = BONES.filter((b) => !isFarBone(b))
  const farOpacity = view === 'side' ? 0.4 : 1

  const renderBone = ([a, b]: (typeof BONES)[number], opacity: number, key: string) => {
    // 颈部到头部的一段截断在头圆边缘（半径换算回归一化坐标空间）
    const from = a === 'neck' && b === 'head' ? headAnchor(pose.head, pose.neck, HEAD_R / 100) : pose[a]
    return (
      <line
        key={key}
        x1={px(from, 0)}
        y1={px(from, 1)}
        x2={px(pose[b], 0)}
        y2={px(pose[b], 1)}
        stroke={`url(#${gradId})`}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        opacity={opacity}
      />
    )
  }

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand-a)" />
          <stop offset="100%" stopColor="var(--brand-b)" />
        </linearGradient>
      </defs>
      {groundY !== null && (
        <line
          x1={6}
          x2={94}
          y1={groundY * 100}
          y2={groundY * 100}
          className="stroke-muted-foreground"
          strokeWidth={1.4}
          strokeLinecap="round"
          opacity={0.35}
        />
      )}
      <g>{far.map((b, i) => renderBone(b, farOpacity, `f${i}`))}</g>
      <g>{near.map((b, i) => renderBone(b, 1, `n${i}`))}</g>
      <circle cx={px(pose.head, 0)} cy={px(pose.head, 1)} r={HEAD_R} fill={`url(#${gradId})`} />
    </svg>
  )
}
