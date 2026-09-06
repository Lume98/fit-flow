import type { ReactNode } from 'react'

interface Props {
  remainingMs: number
  durationMs: number
  children?: ReactNode
}

/** viewBox 边长：stroke 随容器等比缩放，避免硬编码像素尺寸小屏溢出 */
const VIEW = 200
const STROKE = 8

/** 环形倒计时：弧长表示剩余时间，中心为自定义内容；尺寸由 CSS 控制，最小 300px */
export function CountdownRing({ remainingMs, durationMs, children }: Props) {
  const r = (VIEW - STROKE * 2) / 2
  const c = 2 * Math.PI * r
  const fraction = durationMs > 0 ? Math.max(0, Math.min(1, remainingMs / durationMs)) : 0

  return (
    <div className="relative aspect-square w-[min(300px,calc(100vw-64px))] shrink-0">
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="size-full">
        <circle cx={VIEW / 2} cy={VIEW / 2} r={r} className="ring-track" strokeWidth={STROKE} fill="none" />
        <circle
          cx={VIEW / 2}
          cy={VIEW / 2}
          r={r}
          className="ring-progress"
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          transform={`rotate(-90 ${VIEW / 2} ${VIEW / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
