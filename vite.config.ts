import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // host: true 使手机在同一局域网内也能打开（健身时用手机跟练）
  server: { host: true, port: 5173 },
})
