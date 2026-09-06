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
 */
export function BreathCircle({ phase, phaseDurationMs, paused }: Props) {
  const inhaling = phase === 'inhale'
  const durationSec = Math.max(0.3, phaseDurationMs / 1000)
  return (
    <div
      className={`breath-circle ${phase ? (inhaling ? 'breath-inhale' : 'breath-exhale') : ''} ${paused ? 'breath-paused' : ''}`}
      style={{ transitionDuration: `${durationSec}s` }}
      aria-hidden
    />
  )
}
