# FitFlow 健身跟练

跟着节拍练，呼吸不迷路。一款轻量的间歇训练跟练 Web 应用：预设与自定义课程、吸气/呼气语音引导、提示音与环形倒计时，数据全部保存在本地浏览器。

线上地址：https://lume98.github.io/fit-flow/

## 功能

- **预设课程**：核心挑战 / HIIT 入门 / 睡前拉伸，可「复制编辑」改造为自己的节奏
- **跟练播放器**：环形倒计时、呼吸引导圆（吸气扩张/呼气收缩）、中文语音播报、最后 3 秒提示音、暂停/上下动作切换（桌面端支持 `Space` / `←` / `→`）
- **自定义编辑器**：动作增删排序、时长与呼吸节拍校验、四种呼吸预设
- **训练历史**：累计次数/时长、今日分钟数、近 7 天柱状图与明细（上限 50 条）
- **PWA**：可安装到手机主屏，支持离线跟练
- **明暗主题**：暗色为默认，自动跟随系统偏好

## 技术栈

- [Next.js](https://nextjs.org/) 16（App Router，`output: 'export'` 静态导出）
- [shadcn/ui](https://ui.shadcn.com)（base-nova 风格，Base UI + Tailwind CSS v4 + lucide 图标）
- React 19 + TypeScript（strict）
- Web Audio 合成提示音、Web Speech API 语音播报（无需音频文件）
- localStorage 持久化（自定义课程 / 设置 / 历史）

## 本地开发

```bash
npm install
npm run dev        # http://localhost:3000
```

## 构建与预览

```bash
npm run build      # 静态导出到 out/（生产 base 路径 /fit-flow/）
npm run preview    # 本地托管 out/（serve）
```

> 生产构建带 `basePath: /fit-flow`，直接双击 `out/index.html` 无法工作；
> 本地预览静态产物请用 `npm run preview`。

## 部署

推送到 `main` 分支后，GitHub Actions（`.github/workflows/deploy.yml`）自动构建并发布到 GitHub Pages。

## 目录结构

```
app/                # App Router 路由（/ /player /editor /history + manifest/icon/OG）
views/              # 页面视图组件（Home/Player/Editor/History 及其 Screen 包装）
components/         # 呼吸圆、倒计时环、SW 注册、shadcn/ui 组件（components/ui）
hooks/              # usePlayer：基于 performance.now 的时间轴播放器
lib/                # 时间轴、语音、提示音、存储、工具
data/               # 预设课程
```
