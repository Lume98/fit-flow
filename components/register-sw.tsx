'use client'

import { useEffect } from 'react'

/** 生产环境注册 Service Worker，提供离线跟练能力 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {
      // 注册失败不影响功能，仅缺少离线缓存
    })
  }, [])
  return null
}
