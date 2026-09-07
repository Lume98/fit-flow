'use client'

import { useMemo } from 'react'
import { getRegion, musclesForPose } from '@/data/muscles'
import { cn } from '@/lib/utils'

interface Props {
  poseKey: string
  className?: string
  /** 最大显示数量（超出折叠为 +N） */
  max?: number
}

/**
 * 肌肉群标签：把一个动作锻炼到的肌肉群降为一行紧凑的中文 chip。
 * 与 MuscleMap 共用同一份数据，颜色保持一致。
 */
export function MuscleChips({ poseKey, className, max = 6 }: Props) {
  const regions = useMemo(
    () => musclesForPose(poseKey).map((id) => getRegion(id)),
    [poseKey],
  )
  const shown = regions.slice(0, max)
  const overflow = regions.length - shown.length

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-1', className)}>
      {shown.map((r) => (
        <span
          key={r.id}
          title={`${r.en} · ${r.desc}`}
          className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium text-white"
          style={{ backgroundColor: r.color }}
        >
          {r.label}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  )
}
