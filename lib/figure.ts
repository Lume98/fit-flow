/**
 * 通用人体骨骼模型：15 个关节点的归一化坐标（x∈[0,1] 左→右，y∈[0,1] 上→下），
 * 由关键帧插值驱动，可摆出任意动作姿态。具体动作姿态定义见 data/poses.ts。
 */

export type Pt = [number, number]

export interface Pose {
  head: Pt
  neck: Pt
  pelvis: Pt
  shoulderL: Pt
  shoulderR: Pt
  elbowL: Pt
  elbowR: Pt
  handL: Pt
  handR: Pt
  hipL: Pt
  hipR: Pt
  kneeL: Pt
  kneeR: Pt
  footL: Pt
  footR: Pt
}

export const JOINTS = [
  'head',
  'neck',
  'pelvis',
  'shoulderL',
  'shoulderR',
  'elbowL',
  'elbowR',
  'handL',
  'handR',
  'hipL',
  'hipR',
  'kneeL',
  'kneeR',
  'footL',
  'footR',
] as const satisfies ReadonlyArray<keyof Pose>

export type JointName = (typeof JOINTS)[number]

/** 骨骼连线（头颈 + 躯干 + 四肢）；侧视图下 L 侧为远端肢体，渲染时降低透明度 */
export const BONES: ReadonlyArray<readonly [JointName, JointName]> = [
  ['neck', 'head'],
  ['neck', 'pelvis'],
  ['neck', 'shoulderL'],
  ['neck', 'shoulderR'],
  ['shoulderL', 'elbowL'],
  ['elbowL', 'handL'],
  ['shoulderR', 'elbowR'],
  ['elbowR', 'handR'],
  ['pelvis', 'hipL'],
  ['pelvis', 'hipR'],
  ['hipL', 'kneeL'],
  ['kneeL', 'footL'],
  ['hipR', 'kneeR'],
  ['kneeR', 'footR'],
]

/** 远端（左侧）肢体的骨骼，侧视图时画在躯干后面并降透明度（躯干连接线除外） */
const FAR_BONES: ReadonlySet<string> = new Set([
  'shoulderL|elbowL',
  'elbowL|handL',
  'hipL|kneeL',
  'kneeL|footL',
])

export function isFarBone([a, b]: readonly [JointName, JointName]): boolean {
  return FAR_BONES.has(`${a}|${b}`)
}

/** 水平镜像（左右对调）：x → 1-x，用于左/右变体动作复用同一姿态 */
export function mirrorPose(p: Pose): Pose {
  const out = {} as Record<JointName, Pt>
  for (const j of JOINTS) {
    const [x, y] = p[j]
    out[j] = [1 - x, y]
  }
  return out as unknown as Pose
}

const smoothstep = (t: number): number => t * t * (3 - 2 * t)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

export function interpolatePose(a: Pose, b: Pose, t: number): Pose {
  const k = smoothstep(Math.max(0, Math.min(1, t)))
  const out = {} as Record<JointName, Pt>
  for (const j of JOINTS) {
    out[j] = [lerp(a[j][0], b[j][0], k), lerp(a[j][1], b[j][1], k)]
  }
  return out as unknown as Pose
}

export type PoseAnimation =
  /** 单姿态静态保持（配合呼吸微起伏） */
  | { mode: 'hold'; view: 'side' | 'front'; ground?: number; pose: Pose }
  /** 一次呼吸 = 一次动作循环：rest ↔ active，吸气走向由 activeOnInhale 决定 */
  | {
      mode: 'rep'
      view: 'side' | 'front'
      ground?: number
      rest: Pose
      active: Pose
      activeOnInhale: boolean
      /** 每个呼吸循环内完成的动作次数（默认 1；高抬腿等快节奏动作 >1） */
      cyclesPerBreath?: number
    }
  /** 自由关键帧序列：at ∈ [0,1] 为循环内位置，数据须含 at:1 收尾帧 */
  | {
      mode: 'sequence'
      view: 'side' | 'front'
      ground?: number
      frames: ReadonlyArray<{ at: number; pose: Pose }>
      cyclesPerBreath?: number
    }

/**
 * 按循环相位采样姿态。
 * @param phase 循环内位置 [0,1)
 * @param inhaleFrac 吸气占呼吸循环的比例 [0,1]
 * @param swell 呼吸起伏量 [0,1]（hold 模式：吸气扩张/上升）
 */
export function samplePose(anim: PoseAnimation, phase: number, inhaleFrac: number, swell: number): Pose {
  switch (anim.mode) {
    case 'hold': {
      // 呼吸微起伏：上躯干随吸气轻微上浮
      const rise = swell * 0.008
      const p = anim.pose
      const float = (pt: Pt): Pt => [pt[0], pt[1] - rise]
      return {
        ...p,
        head: float(p.head),
        neck: float(p.neck),
        shoulderL: float(p.shoulderL),
        shoulderR: float(p.shoulderR),
        elbowL: float(p.elbowL),
        elbowR: float(p.elbowR),
        handL: float(p.handL),
        handR: float(p.handR),
      }
    }
    case 'rep': {
      const { rest, active, activeOnInhale } = anim
      if (phase < inhaleFrac || inhaleFrac >= 1) {
        const t = inhaleFrac > 0 ? phase / inhaleFrac : 1
        return activeOnInhale ? interpolatePose(rest, active, t) : interpolatePose(active, rest, t)
      }
      const t = (phase - inhaleFrac) / (1 - inhaleFrac)
      return activeOnInhale ? interpolatePose(active, rest, t) : interpolatePose(rest, active, t)
    }
    case 'sequence': {
      const { frames } = anim
      if (frames.length === 0) throw new Error('sequence 动画至少需要一帧')
      if (phase <= frames[0].at) return frames[0].pose
      for (let i = 0; i < frames.length - 1; i++) {
        const cur = frames[i]
        const next = frames[i + 1]
        if (phase >= cur.at && phase <= next.at) {
          const span = next.at - cur.at
          return interpolatePose(cur.pose, next.pose, span > 0 ? (phase - cur.at) / span : 1)
        }
      }
      return frames[frames.length - 1].pose
    }
  }
}

/** 头部骨骼在头圆边缘截断，避免线段穿进头部圆内 */
export function headAnchor(head: Pt, neck: Pt, headR: number): Pt {
  const dx = head[0] - neck[0]
  const dy = head[1] - neck[1]
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return head
  return [head[0] - (dx / len) * headR, head[1] - (dy / len) * headR]
}
