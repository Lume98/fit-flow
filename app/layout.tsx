import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/toast'
import { RegisterSW } from '@/components/register-sw'
import './globals.css'

// GitHub Pages 项目站点：https://lume98.github.io/fit-flow/
const SITE = 'https://lume98.github.io'
const BASE = process.env.NODE_ENV === 'production' ? '/fit-flow' : ''

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'FitFlow 健身跟练',
  description:
    '跟着节拍练，呼吸不迷路。预设与自定义间歇训练课程，吸气呼气语音引导、提示音与进度环，数据保存在本地浏览器。',
  applicationName: 'FitFlow',
  keywords: ['健身', '跟练', '间歇训练', 'HIIT', '呼吸引导', '核心训练', '拉伸', 'FitFlow'],
  manifest: `${BASE}/manifest.webmanifest`,
  openGraph: {
    type: 'website',
    siteName: 'FitFlow 健身跟练',
    title: 'FitFlow 健身跟练',
    description: '跟着节拍练，呼吸不迷路。呼吸引导 + 语音播报的间歇训练跟练应用。',
    locale: 'zh_CN',
    url: `${SITE}${BASE}/`,
    images: [{ url: `${BASE}/og.png`, width: 1200, height: 630, alt: 'FitFlow 健身跟练' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FitFlow 健身跟练',
    description: '跟着节拍练，呼吸不迷路。呼吸引导 + 语音播报的间歇训练跟练应用。',
    images: [`${BASE}/og.png`],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f1115' },
    { media: '(prefers-color-scheme: light)', color: '#f6f8f8' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        {/* 暗色为默认主题；系统偏好浅色时在渲染前移除 .dark，避免闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if (matchMedia('(prefers-color-scheme: light)').matches) document.documentElement.classList.remove('dark')`,
          }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster />
        <RegisterSW />
      </body>
    </html>
  )
}
