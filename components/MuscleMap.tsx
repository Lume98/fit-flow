'use client'

import { useId, useMemo } from 'react'
import { MUSCLE_REGIONS, getRegion, musclesForPose, type RegionId } from '@/data/muscles'

interface Props {
  /** 动作 key（对应 data/poses.ts 的 PoseEntry.key） */
  poseKey: string
  /** 是否高亮；false 时渲染全量轮廓（用于展示完整肌肉群） */
  active?: boolean
  className?: string
}

/**
 * 肌肉分布图（侧身剪影）：用 SVG 高亮某个动作锻炼到的肌肉群。
 * 参考 muscle-atlas-3d「点肌肉看动作」的思路，反向把「动作 → 肌肉」画在
 * 一个归一化坐标的站立侧影上。front 区域实心高亮，back 区域用虚线描边
 * （背后）区分前后侧。悬停某块肌肉可看名称。
 *
 * 每个区域在 data/muscles.ts 定义了归一化 [x,y] 中心，与 fitflow 姿态
 * 坐标约定一致（x 左→右，y 上→下）。
 */
export function MuscleMap({ poseKey, active = true, className }: Props) {
  const gradId = useId()
  const regions = useMemo(() => musclesForPose(poseKey), [poseKey])

  const front = MUSCLE_REGIONS.filter((r) => r.front)
  const back = MUSCLE_REGIONS.filter((r) => !r.front)

  const highlight = (id: RegionId, side: 'front' | 'back'): boolean => {
    if (!active) return false
    const r = getRegion(id)
    return r.front === (side === 'front') && regions.includes(id)
  }

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-a)" />
          <stop offset="100%" stopColor="var(--brand-b)" />
        </linearGradient>
      </defs>

      {/* 站姿侧影轮廓 */}
      <path
        d="M50 12 C46 12,44 15,44 19 L44 26 C38 30,34 38,35 46 L34 50 C32 56,33 64,34 70 L31 90 C31 92,33 93,35 93 L39 93 C41 93,42 92,42 90 L43 74 C45 68,46 64,46 58 L48 58 L48 72 C48 80,49 88,50 93 L52 93 C53 88,54 80,54 72 L54 58 L56 58 C56 64,57 68,59 74 L60 90 C60 92,62 93,64 93 L68 93 C70 93,72 92,72 90 L69 70 C70 64,71 56,69 48 L68 46 C69 38,64 30,58 26 L58 19 C58 15,56 12,52 12 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinejoin="round"
        opacity={0.42}
      />

      {/* 后侧肌肉：虚线描边（在轮廓后面） */}
      <g>
        {back.map((r) => {
          const on = highlight(r.id, 'back')
          return (
            <ellipse
              key={r.id}
              cx={r.at[0] * 100}
              cy={r.at[1] * 100}
              rx={8.5}
              ry={10}
              fill={on ? r.color : 'transparent'}
              fillOpacity={on ? 0.42 : 0}
              stroke={on ? r.color : 'currentColor'}
              strokeWidth={1.1}
              strokeDasharray={on ? '0' : '2.5 2'}
              opacity={on ? 0.95 : 0.28}
            >
              <title>{`${r.label} ${r.en}`}</title>
            </ellipse>
          )
        })}
      </g>

      {/* 前侧肌肉：实心高亮 */}
      <g>
        {front.map((r) => {
          const on = highlight(r.id, 'front')
          return (
            <ellipse
              key={r.id}
              cx={r.at[0] * 100}
              cy={r.at[1] * 100}
              rx={8.5}
              ry={10}
              fill={on ? r.color : 'transparent'}
              fillOpacity={on ? 0.45 : 0}
              stroke={on ? r.color : 'currentColor'}
              strokeWidth={1.1}
              strokeDasharray=""
              opacity={on ? 0.95 : 0.28}
            >
              <title>{`${r.label} ${r.en}`}</title>
            </ellipse>
          )
        })}
      </g>
    </svg>
  )
}
