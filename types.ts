export interface BreathPattern {
  /** 吸气秒数 */
  inhaleSec: number
  /** 呼气秒数 */
  exhaleSec: number
}

export interface Exercise {
  id: string
  name: string
  /** 坚持秒数 */
  durationSec: number
  breath: BreathPattern
  /** 动作要领提示 */
  tip?: string
}

export interface Workout {
  id: string
  name: string
  description?: string
  exercises: Exercise[]
  /** 开场准备倒计时秒数 */
  prepareSec: number
  /** 动作间休息秒数 */
  restSec: number
  /** 内置预设标记（不可删除/编辑原版） */
  preset?: boolean
}

export interface Settings {
  voiceEnabled: boolean
  soundEnabled: boolean
  /** 0 ~ 1 */
  volume: number
}

export interface HistoryEntry {
  workoutName: string
  /** 训练实际用时（秒） */
  totalSec: number
  /** 完成的动作数 */
  exerciseCount: number
  completedAt: number
}

export const DEFAULT_SETTINGS: Settings = {
  voiceEnabled: true,
  soundEnabled: true,
  volume: 0.9,
}

export const BREATH_PRESETS: Array<{ label: string; inhale: number; exhale: number; hint: string }> = [
  { label: '2-2', inhale: 2, exhale: 2, hint: '快节奏 · 动态动作' },
  { label: '3-3', inhale: 3, exhale: 3, hint: '均匀 · 核心保持' },
  { label: '4-4', inhale: 4, exhale: 4, hint: '平缓 · 静态拉伸' },
  { label: '4-6', inhale: 4, exhale: 6, hint: '长呼气 · 放松减压' },
]
