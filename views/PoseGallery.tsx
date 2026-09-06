'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ExerciseFigure } from '@/components/ExerciseFigure'
import { POSE_REGISTRY } from '@/data/poses'
import type { PoseEntry } from '@/data/poses'

/** static 模式下每个动作定格在发力/典型姿态对应的片段内时刻 */
function staticElapsedMs(entry: PoseEntry): number {
  const a = entry.animation
  const cycles = a.mode === 'hold' ? 1 : Math.max(1, a.cyclesPerBreath ?? 1)
  const cycleMs = ((entry.breath.inhaleSec + entry.breath.exhaleSec) * 1000) / cycles
  if (a.mode === 'rep') return a.activeOnInhale ? entry.breath.inhaleSec * 1000 : 0
  if (a.mode === 'sequence') return (a.frames[1]?.at ?? 0.5) * cycleMs
  return entry.breath.inhaleSec * 1000
}

/**
 * 动作图鉴：所有人形模型动画的预览页，
 * 兼作模型姿态的视觉校验入口（/poses）。
 * URL 加 ?static 时固定展示各动作的发力姿态（不播动画）。
 */
export function PoseGallery() {
  const [now, setNow] = useState(0)
  const isStatic =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('static')

  // 共享一个时钟驱动全部模型动画（static 模式下冻结）
  useEffect(() => {
    if (isStatic) return
    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      setNow(performance.now() - t0)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isStatic])

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pt-5 pb-8">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">动作图鉴</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            人体模型动作演示，共 {POSE_REGISTRY.length} 个（含站立调息兜底姿态）
          </p>
        </div>
        <Link
          href="/"
          aria-label="返回首页"
          className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {POSE_REGISTRY.map((entry) => (
          <Card key={entry.key} className="gap-0 py-4">
            <CardContent className="flex flex-col items-center px-3">
              <div className="flex aspect-square w-full items-center justify-center">
                <ExerciseFigure
                  className="size-full"
                  animation={entry.animation}
                  breath={entry.breath}
                  elapsedMs={isStatic ? staticElapsedMs(entry) : now}
                />
              </div>
              <div className="mt-1 text-center text-sm font-semibold">{entry.label}</div>
              <div className="mt-0.5 text-center text-xs text-muted-foreground">{entry.plan}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        动作循环与呼吸节拍同步 · 自定义课程按动作名称自动匹配相近姿态
      </p>
      <div className="mt-3 flex justify-center">
        <Badge variant="outline" className="border-primary/40 text-primary">
          FitFlow
        </Badge>
      </div>
    </div>
  )
}
