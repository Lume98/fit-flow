import type { ReactNode } from 'react'

interface Props {
  remainingMs: number
  durationMs: number
  size?: number
  children?: ReactNode
}

/** 环形倒计时：弧长表示剩余时间，中心为自定义内容 */
export function CountdownRing({ remainingMs, durationMs, size = 300, children }: Props) {
  const stroke = 10
  const r = (size - stroke * 2) / 2
  const c = 2 * Math.PI * r
  const fraction = durationMs > 0 ? Math.max(0, Math.min(1, remainingMs / durationMs)) : 0

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ring-svg">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-progress"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}
