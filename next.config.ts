import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  // GitHub Pages 只能托管静态文件：完整静态导出（无 SSR/API）
  output: 'export',
  // 项目站点部署在 /fit-flow/ 子路径下，本地 dev 走根路径
  basePath: isProd ? '/fit-flow' : '',
  // 静态托管需要 /player/ 形式的目录索引
  trailingSlash: true,
  // 客户端代码里拼资源路径用（如 Service Worker 注册）
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? '/fit-flow' : '',
  },
  images: {
    // 静态导出不支持默认图片优化器
    unoptimized: true,
  },
}

export default nextConfig
