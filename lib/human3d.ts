/**
 * 3D 人体模型构建：把 lib/figure.ts 的 2D 姿态（归一化 x/y）映射到 three.js 空间，
 * 并按身体部位展开成有体积感的圆柱（四肢/躯干）与球体（关节/头）部件。
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

export interface PieceSpec {
  id: string
  kind: 'limb' | 'ball'
  /** 连接端点/所在位置：关节名，或躯干中段派生点 */
  a: JointName | 'torsoMid'
  b?: JointName | 'torsoMid'
  /** 半径（模型单位） */
  r: number
  /** 品牌渐变色位置：0 = 顶端（品牌色 A）→ 1 = 底端（品牌色 B） */
  t: number
  /** 球体各轴缩放（如脚掌压扁成椭圆垫） */
  squash?: Vec3
}

/**
 * 身体部件规格（顺序即渲染材质索引，必须稳定）：
 * 躯干分胸/腰两段做收腰，四肢用圆柱 + 关节球，头为微椭球，脚压扁成脚垫。
 */
export const PIECE_SPECS: ReadonlyArray<PieceSpec> = [
  { id: 'head', kind: 'ball', a: 'head', r: 0.046, t: 0, squash: [1.06, 1.14, 1] },
  { id: 'neck', kind: 'limb', a: 'neck', b: 'head', r: 0.021, t: 0.06 },
  { id: 'neck-base', kind: 'ball', a: 'neck', r: 0.044, t: 0.1 },
  { id: 'chest', kind: 'limb', a: 'neck', b: 'torsoMid', r: 0.06, t: 0.16 },
  { id: 'torso-mid', kind: 'ball', a: 'torsoMid', r: 0.052, t: 0.23 },
  { id: 'waist', kind: 'limb', a: 'torsoMid', b: 'pelvis', r: 0.05, t: 0.3 },
  { id: 'pelvis', kind: 'ball', a: 'pelvis', r: 0.058, t: 0.34 },
  { id: 'shoulderL', kind: 'ball', a: 'shoulderL', r: 0.033, t: 0.2 },
  { id: 'upper-arm-L', kind: 'limb', a: 'shoulderL', b: 'elbowL', r: 0.026, t: 0.24 },
  { id: 'elbowL', kind: 'ball', a: 'elbowL', r: 0.023, t: 0.28 },
  { id: 'forearm-L', kind: 'limb', a: 'elbowL', b: 'handL', r: 0.021, t: 0.32 },
  { id: 'handL', kind: 'ball', a: 'handL', r: 0.028, t: 0.36 },
  { id: 'shoulderR', kind: 'ball', a: 'shoulderR', r: 0.033, t: 0.2 },
  { id: 'upper-arm-R', kind: 'limb', a: 'shoulderR', b: 'elbowR', r: 0.026, t: 0.24 },
  { id: 'elbowR', kind: 'ball', a: 'elbowR', r: 0.023, t: 0.28 },
  { id: 'forearm-R', kind: 'limb', a: 'elbowR', b: 'handR', r: 0.021, t: 0.32 },
  { id: 'handR', kind: 'ball', a: 'handR', r: 0.028, t: 0.36 },
  { id: 'hipL', kind: 'ball', a: 'hipL', r: 0.04, t: 0.4 },
  { id: 'thigh-L', kind: 'limb', a: 'hipL', b: 'kneeL', r: 0.036, t: 0.55 },
  { id: 'kneeL', kind: 'ball', a: 'kneeL', r: 0.03, t: 0.66 },
  { id: 'calf-L', kind: 'limb', a: 'kneeL', b: 'footL', r: 0.027, t: 0.78 },
  { id: 'footL', kind: 'ball', a: 'footL', r: 0.033, t: 0.92, squash: [1.3, 0.62, 1.1] },
  { id: 'hipR', kind: 'ball', a: 'hipR', r: 0.04, t: 0.4 },
  { id: 'thigh-R', kind: 'limb', a: 'hipR', b: 'kneeR', r: 0.036, t: 0.55 },
  { id: 'kneeR', kind: 'ball', a: 'kneeR', r: 0.03, t: 0.66 },
  { id: 'calf-R', kind: 'limb', a: 'kneeR', b: 'footR', r: 0.027, t: 0.78 },
  { id: 'footR', kind: 'ball', a: 'footR', r: 0.033, t: 0.92, squash: [1.3, 0.62, 1.1] },
]

export interface ResolvedPiece {
  id: string
  kind: 'limb' | 'ball'
  /** 球心 / 圆柱中点 */
  pos: Vec3
  /** 圆柱轴向（单位向量），球体恒为 +y */
  dir: Vec3
  /** 圆柱长度（两端关节距离），球体为 0 */
  len: number
  r: number
  t: number
  squash: Vec3
}

const Y_UP: Vec3 = [0, 1, 0]

function resolvePoint(pose: Pose3D, at: JointName | 'torsoMid'): Vec3 {
  if (at === 'torsoMid') {
    const n = pose.neck
    const p = pose.pelvis
    const k = 0.42
    return [n[0] + (p[0] - n[0]) * k, n[1] + (p[1] - n[1]) * k, n[2] + (p[2] - n[2]) * k]
  }
  return pose[at]
}

/** 按当前 3D 关节坐标解析所有身体部件的位置与朝向 */
export function resolvePieces(pose: Pose3D): ResolvedPiece[] {
  return PIECE_SPECS.map((spec) => {
    const a = resolvePoint(pose, spec.a)
    if (spec.kind === 'ball') {
      return {
        id: spec.id,
        kind: spec.kind,
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
      pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
      dir,
      len,
      r: spec.r,
      t: spec.t,
      squash: [1, 1, 1],
    }
  })
}
