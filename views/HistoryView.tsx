'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, HistoryIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { formatDuration } from '@/lib/util'
import { loadHistory } from '@/lib/storage'
import type { HistoryEntry } from '@/types'

/** 近 7 天每日训练秒数 */
function last7Days(history: HistoryEntry[]) {
  const days: Array<{ label: string; sec: number }> = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const start = d.getTime()
    const end = start + 24 * 60 * 60 * 1000
    const sec = history
      .filter((h) => h.completedAt >= start && h.completedAt < end)
      .reduce((s, h) => s + h.totalSec, 0)
    days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, sec })
  }
  return days
}

function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function HistoryView() {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setHistory(loadHistory())
    setMounted(true)
  }, [])

  const totalSec = useMemo(() => history.reduce((s, h) => s + h.totalSec, 0), [history])
  const todaySec = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    return history.filter((h) => h.completedAt >= start.getTime()).reduce((s, h) => s + h.totalSec, 0)
  }, [history])
  const days = useMemo(() => last7Days(history), [history])
  const maxDaySec = Math.max(...days.map((d) => d.sec), 1)

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pt-5 pb-8">
      <header className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')} aria-label="返回首页">
          <ArrowLeftIcon />
        </Button>
        <h1 className="text-2xl font-bold">训练历史</h1>
      </header>

      {!mounted ? null : history.length === 0 ? (
        <Empty className="rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HistoryIcon />
            </EmptyMedia>
            <EmptyTitle>还没有训练记录</EmptyTitle>
            <EmptyDescription>完成一次跟练后，这里会展示你的训练统计和明细。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="gap-0 py-4">
              <CardContent className="flex flex-col items-center px-3">
                <span className="text-xl font-bold text-primary">{history.length}</span>
                <span className="mt-1 text-xs text-muted-foreground">累计次数</span>
              </CardContent>
            </Card>
            <Card className="gap-0 py-4">
              <CardContent className="flex flex-col items-center px-3">
                <span className="text-xl font-bold text-primary">{Math.round(totalSec / 60)}</span>
                <span className="mt-1 text-xs text-muted-foreground">累计分钟</span>
              </CardContent>
            </Card>
            <Card className="gap-0 py-4">
              <CardContent className="flex flex-col items-center px-3">
                <span className="text-xl font-bold text-primary">{Math.round(todaySec / 60)}</span>
                <span className="mt-1 text-xs text-muted-foreground">今日分钟</span>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">近 7 天</h2>
              <div className="flex h-28 items-end gap-2">
                {days.map((d) => (
                  <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <div
                      title={`${d.label} · ${Math.round(d.sec / 60)} 分钟`}
                      className={
                        d.sec > 0
                          ? 'w-full max-w-8 rounded-t-md bg-gradient-to-t from-brand-a to-brand-b'
                          : 'w-full max-w-8 rounded-t-md bg-muted'
                      }
                      style={{ height: d.sec > 0 ? `${Math.max(8, (d.sec / maxDaySec) * 100)}%` : '4px' }}
                    />
                    <span className="text-[10px] text-muted-foreground">{d.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col">
            {history.map((h, i) => (
              <div key={`${h.completedAt}-${i}`}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{h.workoutName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(h.completedAt)}</div>
                  </div>
                  <div className="ml-3 shrink-0 text-sm text-muted-foreground tabular-nums">
                    {formatDuration(h.totalSec)} · {h.exerciseCount} 个动作
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
