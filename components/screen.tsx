'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoaderCircleIcon } from 'lucide-react'

/** 静态导出下的整屏加载占位（localStorage 数据就绪前） */
export function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoaderCircleIcon aria-hidden className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}

/** 目标无法解析（链接失效/课程已删除）时回到首页 */
export function Redirect({ to }: { to: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(to)
  }, [router, to])
  return <FullScreenLoader />
}
