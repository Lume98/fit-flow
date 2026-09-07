/**
 * 3D 人体模型构建：把 lib/figure.ts 的 2D 姿态（归一化 x/y）映射到 three.js 空间，
 * 并按身体部位展开成带肌肉轮廓的旋转曲面（lathe）与球体关节。
 * 坐标系：X 右、Y 上、Z 朝向观察者；模型整体高度约 0.8，原点约在身高中部，
 * 侧视图面向 +x（与 2D 数据一致），深度由 view 决定（L 侧为远端，在 -z）。
 */

import { JOINTS, type JointName, type Pose } from './figure'

export type Vec3 = [number, number, number]
export type Pose3D = Record<JointName, Vec3>

/** 侧视图下左右肢体的深度偏移（约身体厚度的一半），L 侧在身后 */
const SIDE_DEPTH = 0.055

const SIDE_Z: Partial<Record<JointName, number>> = {
  shoulderL: -SIDE_DEPTH,
  elbowL: -SIDE_DEPTH,
  handL: -SIDE_DEPTH,
  hipL: -SIDE_DEPTH,
  kneeL: -SIDE_DEPTH,
  footL: -SIDE_DEPTH,
  shoulderR: SIDE_DEPTH,
  elbowR: SIDE_DEPTH,
  handR: SIDE_DEPTH,
  hipR: SIDE_DEPTH,
  kneeR: SIDE_DEPTH,
  footR: SIDE_DEPTH,
}

/** 归一化 2D 姿态 → 居中三维关节坐标（y 翻转为向上） */
export function poseTo3D(pose: Pose, view: 'side' | 'front'): Pose3D {
  const out = {} as Pose3D
  for (const j of JOINTS) {
    const [x, y] = pose[j]
    out[j] = [x - 0.5, 0.5 - y, view === 'side' ? (SIDE_Z[j] ?? 0) : 0]
  }
  return out
}

/** 派生点：关节名或以下计算位置 */
export type Anchor = JointName | 'torsoMid' | 'headTop'

/**
 * 肌肉轮廓：沿 a→b 方向的半径系数序列（乘以部件基准半径），
 * 旋转成面后呈现胸肌、肱二头肌、股四头肌、小腿曲线等体积起伏。
 * 首尾系数需小于相接关节球半径，保证开口端被关节球遮住。
 */
export const PROFILES: Record<string, number[]> = {
  // 躯干：颈根 → 胸 → 收腰 → 髋部外扩
  torso: [0.62, 0.92, 1.04, 0.92, 0.78, 0.86, 0.98, 0.86],
  // 头部：下颌 → 颅骨 → 头顶收敛到 0 封口（headTop 端无关节球，必须闭合）
  head: [0.45, 0.72, 0.9, 1.0, 1.06, 1.04, 0.88, 0.45, 0],
  // 颈：微微外扩
  neck: [0.9, 1.0, 1.06],
  // 上臂：肩端 → 三角肌/肱二头隆起 → 肘窝收细
  'arm-upper': [0.85, 1.0, 1.14, 1.08, 0.88, 0.68],
  // 前臂：肘端粗 → 腕收细
  'arm-fore': [0.92, 1.08, 1.0, 0.8, 0.62],
  // 大腿：髋端 → 股四头肌隆起 → 膝收细
  thigh: [0.92, 1.06, 1.12, 1.0, 0.84, 0.66],
  // 小腿：膝端 → 腓肠肌隆起 → 踝收细
  calf: [0.88, 1.14, 1.12, 0.9, 0.64, 0.52],
}

export interface PieceSpec {
  id: string
  kind: 'limb' | 'ball'
  a: Anchor
  b?: Anchor
  /** 基准半径（模型单位）；limb 实际半径 = r × profile */
  r: number
  /** limb 使用的肌肉轮廓名（PROFILES 键） */
  profile?: string
  /** 品牌渐变色位置：0 = 顶端（品牌色 A）→ 1 = 底端（品牌色 B） */
  t: number
  /** 球体各轴缩放（如脚掌压扁成椭圆垫） */
  squash?: Vec3
}

/**
 * 身体部件规格（顺序即渲染材质索引，必须稳定）：
 * 躯干/头/四肢用带肌肉轮廓的旋转曲面，关节用球体衔接并遮住曲面开口端。
 */
export const PIECE_SPECS: ReadonlyArray<PieceSpec> = [
  { id: 'head', kind: 'limb', a: 'neck', b: 'headTop', r: 0.05, t: 0, profile: 'head' },
  { id: 'neck', kind: 'limb', a: 'neck', b: 'head', r: 0.02, t: 0.06, profile: 'neck' },
  { id: 'neck-base', kind: 'ball', a: 'neck', r: 0.043, t: 0.1 },
  { id: 'torso', kind: 'limb', a: 'neck', b: 'pelvis', r: 0.062, t: 0.2, profile: 'torso' },
  { id: 'pelvis', kind: 'ball', a: 'pelvis', r: 0.058, t: 0.34 },
  { id: 'shoulderL', kind: 'ball', a: 'shoulderL', r: 0.036, t: 0.18 },
  { id: 'upper-arm-L', kind: 'limb', a: 'shoulderL', b: 'elbowL', r: 0.027, t: 0.24, profile: 'arm-upper' },
  { id: 'elbowL', kind: 'ball', a: 'elbowL', r: 0.023, t: 0.28 },
  { id: 'forearm-L', kind: 'limb', a: 'elbowL', b: 'handL', r: 0.022, t: 0.32, profile: 'arm-fore' },
  { id: 'handL', kind: 'ball', a: 'handL', r: 0.027, t: 0.36, squash: [1.1, 1.2, 0.9] },
  { id: 'shoulderR', kind: 'ball', a: 'shoulderR', r: 0.036, t: 0.18 },
  { id: 'upper-arm-R', kind: 'limb', a: 'shoulderR', b: 'elbowR', r: 0.027, t: 0.24, profile: 'arm-upper' },
  { id: 'elbowR', kind: 'ball', a: 'elbowR', r: 0.023, t: 0.28 },
  { id: 'forearm-R', kind: 'limb', a: 'elbowR', b: 'handR', r: 0.022, t: 0.32, profile: 'arm-fore' },
  { id: 'handR', kind: 'ball', a: 'handR', r: 0.027, t: 0.36, squash: [1.1, 1.2, 0.9] },
  { id: 'hipL', kind: 'ball', a: 'hipL', r: 0.041, t: 0.4 },
  { id: 'thigh-L', kind: 'limb', a: 'hipL', b: 'kneeL', r: 0.038, t: 0.55, profile: 'thigh' },
  { id: 'kneeL', kind: 'ball', a: 'kneeL', r: 0.027, t: 0.66 },
  { id: 'calf-L', kind: 'limb', a: 'kneeL', b: 'footL', r: 0.028, t: 0.78, profile: 'calf' },
  { id: 'footL', kind: 'ball', a: 'footL', r: 0.032, t: 0.92, squash: [1.35, 0.6, 1.1] },
  { id: 'hipR', kind: 'ball', a: 'hipR', r: 0.041, t: 0.4 },
  { id: 'thigh-R', kind: 'limb', a: 'hipR', b: 'kneeR', r: 0.038, t: 0.55, profile: 'thigh' },
  { id: 'kneeR', kind: 'ball', a: 'kneeR', r: 0.027, t: 0.66 },
  { id: 'calf-R', kind: 'limb', a: 'kneeR', b: 'footR', r: 0.028, t: 0.78, profile: 'calf' },
  { id: 'footR', kind: 'ball', a: 'footR', r: 0.032, t: 0.92, squash: [1.35, 0.6, 1.1] },
]

export interface ResolvedPiece {
  id: string
  kind: 'limb' | 'ball'
  profile: string
  /** 球心 / 曲面中点 */
  pos: Vec3
  /** limb 轴向（单位向量），球体恒为 +y */
  dir: Vec3
  /** limb 长度（两端锚点距离），球体为 0 */
  len: number
  r: number
  t: number
  squash: Vec3
}

const Y_UP: Vec3 = [0, 1, 0]

function resolvePoint(pose: Pose3D, at: Anchor): Vec3 {
  switch (at) {
    case 'torsoMid': {
      const n = pose.neck
      const p = pose.pelvis
      const k = 0.42
      return [n[0] + (p[0] - n[0]) * k, n[1] + (p[1] - n[1]) * k, n[2] + (p[2] - n[2]) * k]
    }
    case 'headTop': {
      const n = pose.neck
      const h = pose.head
      // 头顶沿颈→头方向延长：总长约 0.12，头关节落在颅骨后侧位置
      const k = 1.55
      const x = n[0] + (h[0] - n[0]) * k
      const y = n[1] + (h[1] - n[1]) * k
      const z = n[2] + (h[2] - n[2]) * k
      return [x, y, z]
    }
    default:
      return pose[at]
  }
}

/** 按当前 3D 关节坐标解析所有身体部件的位置与朝向 */
export function resolvePieces(pose: Pose3D): ResolvedPiece[] {
  return PIECE_SPECS.map((spec) => {
    const a = resolvePoint(pose, spec.a)
    if (spec.kind === 'ball') {
      return {
        id: spec.id,
        kind: spec.kind,
        profile: '',
        pos: a,
        dir: Y_UP,
        len: 0,
        r: spec.r,
        t: spec.t,
        squash: spec.squash ?? [1, 1, 1],
      }
    }
    const b = resolvePoint(pose, spec.b!)
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const dz = b[2] - a[2]
    const len = Math.hypot(dx, dy, dz)
    const dir: Vec3 = len > 1e-6 ? [dx / len, dy / len, dz / len] : Y_UP
    return {
      id: spec.id,
      kind: spec.kind,
      profile: spec.profile ?? 'neck',
      pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
      dir,
      len,
      r: spec.r,
      t: spec.t,
      squash: [1, 1, 1],
    }
  })
}
