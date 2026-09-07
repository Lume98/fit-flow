/**
 * 肌肉群分类与动作对应关系。
 *
 * 参考 muscle-atlas-3d（BodyParts3D 解剖数据）的思路：把「肌肉 → 锻炼动作」
 * 倒过来，为 fitflow 已有的 20 个动作姿态标注其锻炼到的肌肉群，供
 * 图鉴与跟练界面用「身体区域高亮」的方式直观展示。
 *
 * 区域（region）用归一化 [x,y]（x 左→右，y 上→下）的椭圆/多边形近似表示，
 * 画在侧身剪影上（头颈/躯干/四肢），一个区域可以同时被多个动作激活。
 *
 * 这里强调「动作 → 肌肉群」的映射，而非精确的解剖命名，目的是让用户
 * 一眼看出这个动作练的是哪里。
 */

export type RegionId =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'back'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'hamstrings'
  | 'quads'
  | 'calves'
  | 'biceps'
  | 'triceps'
  | 'forearms'

/** 一个肌肉区域的解剖显示属性 */
export interface MuscleRegion {
  id: RegionId
  /** 中文名 */
  label: string
  /** 英文名（图鉴 tooltip 用） */
  en: string
  /** 简短说明（悬停/无障碍用） */
  desc: string
  /** 是否属于体前（front）区域：决定画在前/后剪影 */
  front: boolean
  /** 归一化中心点（剪影坐标系） */
  at: [number, number]
  /** 高亮色 */
  color: string
}

/** 区域中心点在一个「侧身剪影」上的布局（x 左→右，y 上→下） */
export const MUSCLE_REGIONS: ReadonlyArray<MuscleRegion> = [
  { id: 'neck', label: '颈部', en: 'Neck', desc: '颈前/颈后肌群', front: true, at: [0.5, 0.16], color: '#f59e0b' },
  { id: 'shoulders', label: '肩部', en: 'Shoulders', desc: '三角肌前中后束', front: true, at: [0.42, 0.26], color: '#ef4444' },
  { id: 'chest', label: '胸部', en: 'Chest', desc: '胸大肌/胸小肌', front: true, at: [0.52, 0.3], color: '#f97316' },
  { id: 'back', label: '背部', en: 'Back', desc: '背阔肌/斜方肌/菱形肌', front: false, at: [0.48, 0.3], color: '#a855f7' },
  { id: 'abs', label: '腹肌', en: 'Abs', desc: '腹直肌（中段）', front: true, at: [0.5, 0.46], color: '#10b981' },
  { id: 'obliques', label: '侧腹', en: 'Obliques', desc: '腹外斜肌', front: true, at: [0.46, 0.47], color: '#14b8a6' },
  { id: 'glutes', label: '臀部', en: 'Glutes', desc: '臀大肌/臀中肌', front: false, at: [0.46, 0.56], color: '#f472b6' },
  { id: 'hamstrings', label: '腘绳肌', en: 'Hamstrings', desc: '大腿后侧', front: false, at: [0.42, 0.66], color: '#eab308' },
  { id: 'quads', label: '股四头肌', en: 'Quads', desc: '大腿前侧', front: true, at: [0.42, 0.66], color: '#3b82f6' },
  { id: 'calves', label: '小腿', en: 'Calves', desc: '腓肠肌/比目鱼肌', front: false, at: [0.4, 0.78], color: '#9370db' },
  { id: 'biceps', label: '肱二头肌', en: 'Biceps', desc: '手臂前侧屈肌', front: true, at: [0.6, 0.34], color: '#0ea5e9' },
  { id: 'triceps', label: '肱三头肌', en: 'Triceps', desc: '手臂后侧伸肌', front: false, at: [0.58, 0.34], color: '#8b5cf6' },
  { id: 'forearms', label: '前臂', en: 'Forearms', desc: '前臂伸/屈肌群', front: true, at: [0.62, 0.4], color: '#d97706' },
]

const byId = new Map(MUSCLE_REGIONS.map((r) => [r.id, r]))

export function getRegion(id: RegionId): MuscleRegion {
  return byId.get(id)!
}

/** 动作 key → 锻炼到的肌肉群（顺序即视觉优先级，越靠前越靠前绘制） */
const POSE_MUSCLES: Record<string, RegionId[]> = {
  idle: ['neck'],
  crunch: ['abs', 'obliques', 'neck'],
  plank: ['abs', 'obliques', 'shoulders', 'back', 'glutes', 'chest'],
  'side-plank-l': ['obliques', 'abs', 'shoulders', 'glutes'],
  'side-plank-r': ['obliques', 'abs', 'shoulders', 'glutes'],
  'glute-bridge': ['glutes', 'hamstrings', 'abs'],
  'dead-bug': ['abs', 'obliques', 'back', 'quads'],
  'jumping-jack': ['calves', 'glutes', 'shoulders', 'quads'],
  'high-knees': ['quads', 'calves', 'glutes', 'abs'],
  squat: ['quads', 'glutes', 'hamstrings', 'calves', 'abs'],
  pushup: ['chest', 'triceps', 'shoulders', 'abs', 'forearms'],
  'mountain-climber': ['abs', 'obliques', 'shoulders', 'quads', 'calves'],
  burpee: ['quads', 'chest', 'shoulders', 'glutes', 'abs'],
  'neck-stretch-l': ['neck'],
  'neck-stretch-r': ['neck'],
  'overhead-stretch': ['shoulders', 'biceps', 'back'],
  'seated-fold': ['hamstrings', 'back', 'calves'],
  butterfly: ['quads', 'glutes', 'hamstrings'],
  'childs-pose': ['back', 'shoulders', 'glutes'],
  'supine-twist-l': ['obliques', 'abs', 'back'],
  'supine-twist-r': ['obliques', 'abs', 'back'],
}

/** 取一个动作对应的肌肉群（未知动作回退到颈部） */
export function musclesForPose(key: string): RegionId[] {
  return POSE_MUSCLES[key] ?? ['neck']
}

/** 所有出现过的肌肉群（去重，按 MUSCLE_REGIONS 顺序） */
export const ALL_MUSCLES: RegionId[] = MUSCLE_REGIONS.map((r) => r.id)
