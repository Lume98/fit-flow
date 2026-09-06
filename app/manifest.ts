import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

const BASE = process.env.NODE_ENV === 'production' ? '/fit-flow' : ''

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FitFlow 健身跟练',
    short_name: 'FitFlow',
    description: '跟着节拍练，呼吸不迷路。预设与自定义间歇训练课程，呼吸引导 + 语音播报。',
    lang: 'zh-CN',
    start_url: `${BASE}/`,
    scope: BASE ? `${BASE}/` : '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f1115',
    theme_color: '#0f1115',
    icons: [
      {
        src: `${BASE}/icon.svg`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
