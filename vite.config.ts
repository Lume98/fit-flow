import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 项目站点部署在 /fit-flow/ 子路径下，本地 dev 仍走根路径
  base: process.env.NODE_ENV === 'production' ? '/fit-flow/' : '/',
  // host: true 使手机在同一局域网内也能打开（健身时用手机跟练）
  server: { host: true, port: 5173 },
})
