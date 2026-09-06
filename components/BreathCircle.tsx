import { useEffect, useRef } from 'react'
import type { BreathPhase } from '../lib/timeline'

interface Props {
  phase: BreathPhase | null
  /** 当前相位总毫秒（用于设定缩放动画时长） */
  phaseDurationMs: number
  paused: boolean
}

/**
 * 呼吸引导圆：吸气时缓慢扩张，呼气时缓慢收缩。
 * 动画时长与呼吸节拍一致，余光即可跟随。
 * 暂停时冻结在当前缩放位置（CSS transition 无法原生暂停，
 * 故读取实时 transform 内联固定，恢复时交还给过渡动画）。
 */
export function BreathCircle({ phase, phaseDurationMs, paused }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inhaling = phase === 'inhale'
  const durationSec = Math.max(0.3, phaseDurationMs / 1000)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (paused) {
      const computed = getComputedStyle(el).transform
      el.style.transitionProperty = 'none'
      el.style.transform = computed === 'none' ? '' : computed
    } else {
      el.style.transitionProperty = ''
      el.style.transform = ''
    }
  }, [paused])

  return (
    <div
      ref={ref}
      className={`breath-circle ${phase ? (inhaling ? 'breath-inhale' : 'breath-exhale') : ''}`}
      style={{ transitionDuration: `${durationSec}s` }}
      aria-hidden
    />
  )
}
