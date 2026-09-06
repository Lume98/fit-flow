import type { BreathPattern } from '../types'
import { mirrorPose, type Pose, type PoseAnimation, type Pt } from '../lib/figure'

/**
 * 动作姿态库：每个条目 = 一个可用人体模型演示的动作。
 * 坐标为归一化 [0,1]（x 左→右，y 上→下），side=侧视图（L 侧肢体画淡），front=正视图。
 * 预设动作按 id 精确匹配，自定义动作按名称关键词匹配，都未命中时回退到站立呼吸。
 */

type PoseInput = Partial<Record<keyof Pose, Pt>>

/** 以基准姿态为底，覆盖部分关节 */
function pose(base: Pose, over: PoseInput): Pose {
  return { ...base, ...over }
}

// ── 基准姿态 ─────────────────────────────────────────────

/** 站立（侧视，面向右）：四肢带前后错位，避免侧视塌成一条竖线 */
const STAND_SIDE: Pose = {
  head: [0.51, 0.105],
  neck: [0.5, 0.185],
  pelvis: [0.5, 0.52],
  shoulderL: [0.495, 0.225],
  shoulderR: [0.505, 0.225],
  elbowL: [0.468, 0.362],
  elbowR: [0.548, 0.362],
  handL: [0.472, 0.478],
  handR: [0.542, 0.478],
  hipL: [0.495, 0.535],
  hipR: [0.505, 0.535],
  kneeL: [0.472, 0.72],
  kneeR: [0.53, 0.72],
  footL: [0.46, 0.905],
  footR: [0.545, 0.905],
}

/** 站立（正视） */
const STAND_FRONT: Pose = {
  head: [0.5, 0.105],
  neck: [0.5, 0.185],
  pelvis: [0.5, 0.52],
  shoulderL: [0.4, 0.225],
  shoulderR: [0.6, 0.225],
  elbowL: [0.395, 0.36],
  elbowR: [0.605, 0.36],
  handL: [0.39, 0.48],
  handR: [0.61, 0.48],
  hipL: [0.445, 0.535],
  hipR: [0.555, 0.535],
  kneeL: [0.44, 0.72],
  kneeR: [0.56, 0.72],
  footL: [0.435, 0.905],
  footR: [0.565, 0.905],
}

/** 仰卧（侧视，头在左），屈膝：卷腹/臀桥/死虫式的底版 */
const LYING_SIDE: Pose = {
  head: [0.16, 0.735],
  neck: [0.24, 0.75],
  pelvis: [0.52, 0.775],
  shoulderL: [0.245, 0.745],
  shoulderR: [0.25, 0.755],
  elbowL: [0.34, 0.77],
  elbowR: [0.345, 0.78],
  handL: [0.43, 0.78],
  handR: [0.44, 0.785],
  hipL: [0.515, 0.77],
  hipR: [0.52, 0.775],
  kneeL: [0.695, 0.63],
  kneeR: [0.7, 0.635],
  footL: [0.84, 0.785],
  footR: [0.845, 0.79],
}

/** 高位平板支撑（侧视）：俯卧撑撑起位 / 登山者底版 */
const HIGH_PLANK: Pose = {
  head: [0.225, 0.435],
  neck: [0.29, 0.475],
  pelvis: [0.585, 0.6],
  shoulderL: [0.31, 0.49],
  shoulderR: [0.315, 0.495],
  elbowL: [0.32, 0.645],
  elbowR: [0.325, 0.65],
  handL: [0.325, 0.81],
  handR: [0.33, 0.815],
  hipL: [0.58, 0.595],
  hipR: [0.585, 0.6],
  kneeL: [0.74, 0.695],
  kneeR: [0.745, 0.7],
  footL: [0.89, 0.79],
  footR: [0.895, 0.795],
}

// ── 动作定义 ─────────────────────────────────────────────

const CRUNCH_REST: Pose = pose(LYING_SIDE, {
  head: [0.17, 0.735],
  neck: [0.25, 0.755],
  elbowL: [0.195, 0.67],
  elbowR: [0.2, 0.665],
  handL: [0.14, 0.69],
  handR: [0.135, 0.685],
})

const CRUNCH_ACTIVE: Pose = pose(CRUNCH_REST, {
  head: [0.29, 0.665],
  neck: [0.35, 0.69],
  shoulderL: [0.345, 0.685],
  shoulderR: [0.35, 0.695],
  elbowL: [0.29, 0.605],
  elbowR: [0.295, 0.61],
  handL: [0.235, 0.63],
  handR: [0.23, 0.625],
})

const SIDE_PLANK_RIGHT: Pose = {
  head: [0.215, 0.325],
  neck: [0.265, 0.365],
  pelvis: [0.475, 0.51],
  shoulderL: [0.265, 0.365],
  shoulderR: [0.275, 0.375],
  elbowL: [0.34, 0.245],
  elbowR: [0.275, 0.775],
  handL: [0.415, 0.135],
  handR: [0.15, 0.785],
  hipL: [0.47, 0.505],
  hipR: [0.475, 0.51],
  kneeL: [0.63, 0.66],
  kneeR: [0.635, 0.655],
  footL: [0.785, 0.79],
  footR: [0.79, 0.775],
}

const BRIDGE_REST: Pose = pose(LYING_SIDE, {
  head: [0.155, 0.735],
  neck: [0.235, 0.75],
})

const BRIDGE_ACTIVE: Pose = pose(BRIDGE_REST, {
  pelvis: [0.53, 0.585],
  hipL: [0.525, 0.58],
  hipR: [0.53, 0.585],
  kneeL: [0.72, 0.625],
  kneeR: [0.72, 0.63],
})

const DEAD_BUG_REST: Pose = pose(LYING_SIDE, {
  head: [0.14, 0.7],
  neck: [0.22, 0.72],
  shoulderL: [0.23, 0.72],
  shoulderR: [0.235, 0.725],
  pelvis: [0.5, 0.755],
  hipL: [0.495, 0.75],
  hipR: [0.5, 0.755],
  elbowL: [0.26, 0.55],
  elbowR: [0.27, 0.545],
  handL: [0.28, 0.38],
  handR: [0.29, 0.375],
  kneeL: [0.625, 0.58],
  kneeR: [0.63, 0.575],
  footL: [0.63, 0.735],
  footR: [0.635, 0.735],
})

/** 死虫式：近侧手臂 + 远侧腿伸展 / 远侧手臂 + 近侧腿伸展 交替 */
const DEAD_BUG_EXT_A: Pose = pose(DEAD_BUG_REST, {
  elbowR: [0.19, 0.655],
  handR: [0.13, 0.6],
  kneeL: [0.68, 0.66],
  footL: [0.83, 0.72],
})

const DEAD_BUG_EXT_B: Pose = pose(DEAD_BUG_REST, {
  elbowL: [0.185, 0.66],
  handL: [0.125, 0.605],
  kneeR: [0.685, 0.655],
  footR: [0.835, 0.715],
})

/** 开合跳跳开（正视） */
const JACK_ACTIVE: Pose = pose(STAND_FRONT, {
  elbowL: [0.33, 0.14],
  elbowR: [0.67, 0.14],
  handL: [0.31, 0.045],
  handR: [0.69, 0.045],
  kneeL: [0.385, 0.72],
  kneeR: [0.615, 0.72],
  footL: [0.33, 0.9],
  footR: [0.67, 0.9],
})

/** 高抬腿（侧视，面向右）：抬近侧膝，对侧臂前摆 */
const HIGH_KNEE_L: Pose = pose(STAND_SIDE, {
  kneeR: [0.6, 0.44],
  footR: [0.585, 0.6],
  elbowL: [0.55, 0.33],
  handL: [0.585, 0.26],
  elbowR: [0.455, 0.37],
  handR: [0.42, 0.45],
})

const HIGH_KNEE_R: Pose = pose(STAND_SIDE, {
  kneeL: [0.6, 0.445],
  footL: [0.585, 0.605],
  elbowR: [0.545, 0.335],
  handR: [0.58, 0.265],
  elbowL: [0.46, 0.375],
  handL: [0.425, 0.455],
})

const SQUAT_ACTIVE: Pose = pose(STAND_SIDE, {
  head: [0.53, 0.365],
  neck: [0.505, 0.445],
  pelvis: [0.4, 0.635],
  shoulderL: [0.495, 0.47],
  shoulderR: [0.5, 0.475],
  elbowL: [0.62, 0.495],
  elbowR: [0.63, 0.5],
  handL: [0.74, 0.52],
  handR: [0.75, 0.525],
  hipL: [0.395, 0.64],
  hipR: [0.4, 0.645],
  kneeL: [0.615, 0.66],
  kneeR: [0.63, 0.665],
  footL: [0.505, 0.9],
  footR: [0.53, 0.9],
})

const PUSHUP_DOWN: Pose = pose(HIGH_PLANK, {
  head: [0.225, 0.585],
  neck: [0.29, 0.625],
  pelvis: [0.585, 0.65],
  shoulderL: [0.31, 0.64],
  shoulderR: [0.315, 0.645],
  elbowL: [0.44, 0.675],
  elbowR: [0.445, 0.68],
  hipL: [0.58, 0.645],
  hipR: [0.585, 0.65],
  kneeL: [0.74, 0.71],
  kneeR: [0.745, 0.715],
})

/** 登山者：提膝（右膝近侧 / 左膝远侧交替） */
const MOUNTAIN_KNEE_R: Pose = pose(HIGH_PLANK, {
  kneeR: [0.42, 0.585],
  footR: [0.36, 0.8],
})

const MOUNTAIN_KNEE_L: Pose = pose(HIGH_PLANK, {
  kneeL: [0.425, 0.59],
  footL: [0.365, 0.795],
})

const BURPEE_CROUCH: Pose = pose(STAND_SIDE, {
  head: [0.47, 0.52],
  neck: [0.45, 0.575],
  pelvis: [0.345, 0.66],
  shoulderL: [0.435, 0.595],
  shoulderR: [0.44, 0.6],
  elbowL: [0.515, 0.715],
  elbowR: [0.52, 0.72],
  handL: [0.55, 0.81],
  handR: [0.56, 0.815],
  hipL: [0.34, 0.665],
  hipR: [0.345, 0.67],
  kneeL: [0.5, 0.7],
  kneeR: [0.505, 0.705],
  footL: [0.5, 0.9],
  footR: [0.52, 0.905],
})

const BURPEE_JUMP: Pose = pose(STAND_SIDE, {
  head: [0.5, 0.07],
  neck: [0.5, 0.15],
  pelvis: [0.5, 0.485],
  shoulderL: [0.495, 0.19],
  shoulderR: [0.505, 0.19],
  elbowL: [0.49, 0.065],
  elbowR: [0.535, 0.07],
  handL: [0.485, 0.005],
  handR: [0.525, 0.01],
  hipL: [0.495, 0.5],
  hipR: [0.505, 0.5],
  kneeL: [0.49, 0.685],
  kneeR: [0.515, 0.69],
  footL: [0.49, 0.865],
  footR: [0.52, 0.87],
})

/** 颈部侧拉伸（左）：头倒向左肩，左手扶头（正视） */
const NECK_STRETCH_L: Pose = pose(STAND_FRONT, {
  head: [0.455, 0.12],
  elbowL: [0.42, 0.135],
  handL: [0.47, 0.07],
})

/** 手臂过顶拉伸（侧视）：吸气双手上举延展 */
const SIDE_BEND_REST: Pose = pose(STAND_SIDE, {
  elbowL: [0.5, 0.115],
  elbowR: [0.53, 0.12],
  handL: [0.49, 0.05],
  handR: [0.52, 0.055],
})

/** 呼气向左加深侧弯 */
const SIDE_BEND_ACTIVE: Pose = pose(SIDE_BEND_REST, {
  head: [0.415, 0.16],
  neck: [0.44, 0.24],
  pelvis: [0.5, 0.52],
  shoulderL: [0.44, 0.265],
  shoulderR: [0.445, 0.27],
  elbowL: [0.385, 0.13],
  elbowR: [0.4, 0.135],
  handL: [0.345, 0.07],
  handR: [0.36, 0.075],
})

/** 坐姿体前屈（侧视，面向左，双腿前伸）：吸气坐直 */
const SEATED_FOLD_REST: Pose = {
  head: [0.62, 0.4],
  neck: [0.625, 0.48],
  pelvis: [0.6, 0.735],
  shoulderL: [0.62, 0.47],
  shoulderR: [0.625, 0.475],
  elbowL: [0.52, 0.545],
  elbowR: [0.53, 0.55],
  handL: [0.435, 0.615],
  handR: [0.44, 0.62],
  hipL: [0.595, 0.73],
  hipR: [0.6, 0.735],
  kneeL: [0.415, 0.73],
  kneeR: [0.42, 0.735],
  footL: [0.235, 0.735],
  footR: [0.24, 0.74],
}

/** 呼气前屈贴腿 */
const SEATED_FOLD_ACTIVE: Pose = pose(SEATED_FOLD_REST, {
  head: [0.4, 0.635],
  neck: [0.5, 0.6],
  shoulderL: [0.51, 0.61],
  shoulderR: [0.515, 0.615],
  elbowL: [0.415, 0.66],
  elbowR: [0.42, 0.665],
  handL: [0.295, 0.71],
  handR: [0.3, 0.715],
})

/** 蝴蝶式（正视坐地，脚心相对膝盖下沉） */
const BUTTERFLY: Pose = {
  head: [0.5, 0.435],
  neck: [0.5, 0.515],
  pelvis: [0.5, 0.76],
  shoulderL: [0.425, 0.55],
  shoulderR: [0.575, 0.55],
  elbowL: [0.4, 0.68],
  elbowR: [0.6, 0.68],
  handL: [0.475, 0.83],
  handR: [0.525, 0.83],
  hipL: [0.455, 0.765],
  hipR: [0.545, 0.765],
  kneeL: [0.27, 0.575],
  kneeR: [0.73, 0.575],
  footL: [0.475, 0.855],
  footR: [0.525, 0.855],
}

/** 婴儿式（侧视跪坐前伏） */
const CHILDS_POSE: Pose = {
  head: [0.38, 0.7],
  neck: [0.475, 0.665],
  pelvis: [0.615, 0.68],
  shoulderL: [0.48, 0.67],
  shoulderR: [0.485, 0.675],
  elbowL: [0.355, 0.715],
  elbowR: [0.36, 0.72],
  handL: [0.205, 0.745],
  handR: [0.21, 0.75],
  hipL: [0.615, 0.675],
  hipR: [0.62, 0.685],
  kneeL: [0.595, 0.795],
  kneeR: [0.6, 0.8],
  footL: [0.775, 0.795],
  footR: [0.78, 0.8],
}

/** 卧姿转体（仰视俯瞰，膝倒向右，肩膀贴地） */
const SUPINE_TWIST_R: Pose = {
  head: [0.5, 0.14],
  neck: [0.5, 0.24],
  pelvis: [0.5, 0.58],
  shoulderL: [0.38, 0.27],
  shoulderR: [0.62, 0.27],
  elbowL: [0.22, 0.3],
  elbowR: [0.78, 0.3],
  handL: [0.1, 0.32],
  handR: [0.9, 0.32],
  hipL: [0.47, 0.6],
  hipR: [0.53, 0.6],
  kneeL: [0.7, 0.7],
  kneeR: [0.72, 0.66],
  footL: [0.76, 0.86],
  footR: [0.8, 0.82],
}

/** 前臂平板支撑（侧视） */
const FOREARM_PLANK: Pose = pose(HIGH_PLANK, {
  head: [0.255, 0.5],
  neck: [0.315, 0.545],
  shoulderL: [0.325, 0.57],
  shoulderR: [0.33, 0.575],
  elbowL: [0.345, 0.795],
  elbowR: [0.35, 0.8],
  handL: [0.205, 0.8],
  handR: [0.2, 0.805],
  pelvis: [0.575, 0.655],
  hipL: [0.57, 0.65],
  hipR: [0.575, 0.655],
  kneeL: [0.73, 0.72],
  kneeR: [0.735, 0.725],
  footL: [0.87, 0.795],
  footR: [0.875, 0.8],
})

// ── 注册表 ───────────────────────────────────────────────

export interface PoseEntry {
  key: string
  /** 动作显示名（图鉴用） */
  label: string
  /** 演示节拍（与预设动作呼吸一致） */
  breath: BreathPattern
  animation: PoseAnimation
  /** 该动作的锻炼计划说明（图鉴展示用） */
  plan: string
}

const B2: BreathPattern = { inhaleSec: 2, exhaleSec: 2 }
const B3: BreathPattern = { inhaleSec: 3, exhaleSec: 3 }
const B11: BreathPattern = { inhaleSec: 1, exhaleSec: 1 }
const B46: BreathPattern = { inhaleSec: 4, exhaleSec: 6 }

export const POSE_REGISTRY: PoseEntry[] = [
  {
    key: 'idle',
    label: '站立调息',
    breath: B3,
    plan: '保持自然站姿，跟随呼吸放松',
    animation: { mode: 'hold', view: 'side', ground: 0.905, pose: STAND_SIDE },
  },
  {
    key: 'crunch',
    label: '卷腹',
    breath: B2,
    plan: '2 组 × 12 次 · 每组 40 秒',
    animation: {
      mode: 'rep',
      view: 'side',
      ground: 0.8,
      rest: CRUNCH_REST,
      active: CRUNCH_ACTIVE,
      activeOnInhale: false,
    },
  },
  {
    key: 'plank',
    label: '平板支撑',
    breath: B3,
    plan: '2 组 × 45 秒',
    animation: { mode: 'hold', view: 'side', ground: 0.815, pose: FOREARM_PLANK },
  },
  {
    key: 'side-plank-l',
    label: '左侧平板支撑',
    breath: B3,
    plan: '1 组 × 30 秒',
    animation: { mode: 'hold', view: 'front', ground: 0.8, pose: mirrorPose(SIDE_PLANK_RIGHT) },
  },
  {
    key: 'side-plank-r',
    label: '右侧平板支撑',
    breath: B3,
    plan: '1 组 × 30 秒',
    animation: { mode: 'hold', view: 'front', ground: 0.8, pose: SIDE_PLANK_RIGHT },
  },
  {
    key: 'glute-bridge',
    label: '臀桥',
    breath: B2,
    plan: '2 组 × 12 次 · 每组 45 秒',
    animation: {
      mode: 'rep',
      view: 'side',
      ground: 0.8,
      rest: BRIDGE_REST,
      active: BRIDGE_ACTIVE,
      activeOnInhale: false,
    },
  },
  {
    key: 'dead-bug',
    label: '死虫式',
    breath: B3,
    plan: '2 组 × 8 次 · 每组 40 秒',
    animation: {
      mode: 'sequence',
      view: 'side',
      ground: 0.775,
      cyclesPerBreath: 1,
      frames: [
        { at: 0, pose: DEAD_BUG_REST },
        { at: 0.3, pose: DEAD_BUG_EXT_A },
        { at: 0.5, pose: DEAD_BUG_REST },
        { at: 0.8, pose: DEAD_BUG_EXT_B },
        { at: 1, pose: DEAD_BUG_REST },
      ],
    },
  },
  {
    key: 'jumping-jack',
    label: '开合跳',
    breath: B11,
    plan: '1 组 × 30 次 · 30 秒',
    animation: {
      mode: 'rep',
      view: 'front',
      ground: 0.905,
      rest: STAND_FRONT,
      active: JACK_ACTIVE,
      activeOnInhale: false,
    },
  },
  {
    key: 'high-knees',
    label: '高抬腿',
    breath: B11,
    plan: '1 组 × 40 次 · 30 秒',
    animation: {
      mode: 'sequence',
      view: 'side',
      ground: 0.905,
      cyclesPerBreath: 2,
      frames: [
        { at: 0, pose: HIGH_KNEE_L },
        { at: 0.5, pose: HIGH_KNEE_R },
        { at: 1, pose: HIGH_KNEE_L },
      ],
    },
  },
  {
    key: 'squat',
    label: '深蹲',
    breath: B2,
    plan: '2 组 × 15 次 · 每组 30 秒',
    animation: {
      mode: 'rep',
      view: 'side',
      ground: 0.905,
      rest: STAND_SIDE,
      active: SQUAT_ACTIVE,
      activeOnInhale: false,
    },
  },
  {
    key: 'pushup',
    label: '俯卧撑',
    breath: B2,
    plan: '2 组 × 10 次 · 每组 30 秒',
    animation: {
      mode: 'rep',
      view: 'side',
      ground: 0.82,
      rest: HIGH_PLANK,
      active: PUSHUP_DOWN,
      activeOnInhale: true,
    },
  },
  {
    key: 'mountain-climber',
    label: '登山者',
    breath: B11,
    plan: '1 组 × 20 次 · 30 秒',
    animation: {
      mode: 'sequence',
      view: 'side',
      ground: 0.815,
      cyclesPerBreath: 4,
      frames: [
        { at: 0, pose: MOUNTAIN_KNEE_R },
        { at: 0.5, pose: MOUNTAIN_KNEE_L },
        { at: 1, pose: MOUNTAIN_KNEE_R },
      ],
    },
  },
  {
    key: 'burpee',
    label: '波比跳',
    breath: B2,
    plan: '2 组 × 6 次 · 每组 30 秒',
    animation: {
      mode: 'sequence',
      view: 'side',
      ground: 0.905,
      cyclesPerBreath: 1,
      frames: [
        { at: 0, pose: STAND_SIDE },
        { at: 0.22, pose: BURPEE_CROUCH },
        { at: 0.45, pose: HIGH_PLANK },
        { at: 0.68, pose: BURPEE_CROUCH },
        { at: 0.86, pose: BURPEE_JUMP },
        { at: 1, pose: STAND_SIDE },
      ],
    },
  },
  {
    key: 'neck-stretch-l',
    label: '颈部侧拉伸（左）',
    breath: B46,
    plan: '保持 30 秒',
    animation: { mode: 'hold', view: 'front', ground: 0.905, pose: NECK_STRETCH_L },
  },
  {
    key: 'neck-stretch-r',
    label: '颈部侧拉伸（右）',
    breath: B46,
    plan: '保持 30 秒',
    animation: { mode: 'hold', view: 'front', ground: 0.905, pose: mirrorPose(NECK_STRETCH_L) },
  },
  {
    key: 'overhead-stretch',
    label: '手臂过顶拉伸',
    breath: B46,
    plan: '保持 40 秒',
    animation: {
      mode: 'rep',
      view: 'side',
      ground: 0.905,
      rest: SIDE_BEND_REST,
      active: SIDE_BEND_ACTIVE,
      activeOnInhale: false,
    },
  },
  {
    key: 'seated-fold',
    label: '坐姿体前屈',
    breath: B46,
    plan: '保持 60 秒',
    animation: {
      mode: 'rep',
      view: 'side',
      ground: 0.74,
      rest: SEATED_FOLD_REST,
      active: SEATED_FOLD_ACTIVE,
      activeOnInhale: false,
    },
  },
  {
    key: 'butterfly',
    label: '蝴蝶式',
    breath: B46,
    plan: '保持 60 秒',
    animation: { mode: 'hold', view: 'front', ground: 0.87, pose: BUTTERFLY },
  },
  {
    key: 'childs-pose',
    label: '婴儿式',
    breath: B46,
    plan: '保持 60 秒',
    animation: { mode: 'hold', view: 'side', ground: 0.815, pose: CHILDS_POSE },
  },
  {
    key: 'supine-twist-l',
    label: '卧姿转体（左）',
    breath: B46,
    plan: '保持 40 秒',
    animation: { mode: 'hold', view: 'front', pose: mirrorPose(SUPINE_TWIST_R) },
  },
  {
    key: 'supine-twist-r',
    label: '卧姿转体（右）',
    breath: B46,
    plan: '保持 40 秒',
    animation: { mode: 'hold', view: 'front', pose: SUPINE_TWIST_R },
  },
]

// ── 匹配 ─────────────────────────────────────────────────

/** 内置预设动作 id → 动画 key */
const PRESET_ID_MAP: Record<string, string> = {
  'core-1': 'crunch',
  'core-2': 'plank',
  'core-3': 'side-plank-l',
  'core-4': 'side-plank-r',
  'core-5': 'glute-bridge',
  'core-6': 'dead-bug',
  'hiit-1': 'jumping-jack',
  'hiit-2': 'high-knees',
  'hiit-3': 'squat',
  'hiit-4': 'pushup',
  'hiit-5': 'mountain-climber',
  'hiit-6': 'burpee',
  'stretch-1': 'neck-stretch-l',
  'stretch-2': 'neck-stretch-r',
  'stretch-3': 'overhead-stretch',
  'stretch-4': 'seated-fold',
  'stretch-5': 'butterfly',
  'stretch-6': 'childs-pose',
  'stretch-7': 'supine-twist-l',
  'stretch-8': 'supine-twist-r',
}

/** 自定义动作名称关键词 → 动画 key（顺序即优先级） */
const KEYWORD_MAP: ReadonlyArray<readonly [key: string, keywords: string[]]> = [
  ['burpee', ['波比', '立卧撑']],
  ['mountain-climber', ['登山']],
  ['high-knees', ['高抬腿']],
  ['jumping-jack', ['开合跳']],
  ['squat', ['深蹲', '下蹲', '蹲起', '靠墙静蹲']],
  ['pushup', ['俯卧撑', '跪姿俯卧撑']],
  ['plank', ['平板支撑', '平板']],
  ['side-plank-l', ['左侧平板', '侧平板支撑（左）', '侧平板（左）']],
  ['side-plank-r', ['右侧平板', '侧平板支撑（右）', '侧平板（右）']],
  ['side-plank-l', ['侧平板']],
  ['crunch', ['卷腹', '仰卧起坐']],
  ['glute-bridge', ['臀桥', '桥式']],
  ['dead-bug', ['死虫']],
  ['neck-stretch-l', ['颈部侧拉伸（左）', '颈部拉伸（左）']],
  ['neck-stretch-r', ['颈部侧拉伸（右）', '颈部拉伸（右）']],
  ['neck-stretch-l', ['颈部侧拉伸', '颈部拉伸']],
  ['overhead-stretch', ['过顶拉伸', '手臂过顶', '侧腰拉伸', '体侧拉伸']],
  ['seated-fold', ['体前屈', '前屈']],
  ['butterfly', ['蝴蝶式', '束角式']],
  ['childs-pose', ['婴儿式']],
  ['supine-twist-l', ['卧姿转体（左）', '仰卧转体（左）']],
  ['supine-twist-r', ['卧姿转体（右）', '仰卧转体（右）']],
  ['supine-twist-l', ['卧姿转体', '仰卧转体', '脊柱扭转']],
  ['idle', ['拉伸', '伸展', '调息', '冥想', '呼吸']],
]

const byKey = new Map(POSE_REGISTRY.map((e) => [e.key, e]))

/** 为动作选择人体模型动画：预设 id 精确匹配 → 名称关键词 → 站立调息兜底 */
export function getPoseEntry(exercise: { id: string; name: string }): PoseEntry {
  const exact = PRESET_ID_MAP[exercise.id]
  if (exact) {
    const entry = byKey.get(exact)
    if (entry) return entry
  }
  const name = exercise.name.trim()
  if (name) {
    for (const [key, keywords] of KEYWORD_MAP) {
      if (keywords.some((k) => name.includes(k))) {
        const entry = byKey.get(key)
        if (entry) return entry
      }
    }
  }
  return byKey.get('idle')!
}
