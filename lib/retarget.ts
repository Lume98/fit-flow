/**
 * 骨骼重定向：把 lib/figure.ts 的 2D 姿态（归一化 x/y + 视图深度）反解成
 * 驱动 GLB 人体（mixamorig 骨骼命名）的逐骨骼旋转。
 *
 * 原理：每个有子骨的驱动骨骼用「两点定向」(aim)。每帧先把所有驱动骨骼
 * 复位到 rest 局部旋转，保持逐帧确定性（不累积漂移）；然后从根到末端
 * 逐级 aim —— 让骨骼的「当前世界方向」旋转到「姿态中的父→子目标方向」。
 * 之所以用当前方向而非 rest 方向，是因为父骨骼已被旋转，必须在当前
 * 父坐标系下求解，才能正确处理关节链。
 *
 * 坐标系约定：GLB 模型面向 -Z（three.js 默认），X 右、Y 上、Z 朝观察者。
 * 2D 姿态里 x∈[0,1] 左→右、y∈[0,1] 上→下。
 */

import * as THREE from 'three'
import { JOINTS, type Pose, type JointName } from './figure'
import { poseTo3D, type Vec3 } from './human3d'

/** 关键关节聚合名（与 GLB 骨骼名对应；GLTFLoader 会把 mixamorig: 转义为 mixamorig） */
export const BONE_NAMES = {
  hips: 'mixamorigHips',
  spine: 'mixamorigSpine',
  chest: 'mixamorigSpine2',
  neck: 'mixamorigNeck',
  head: 'mixamorigHead',
  shoulderL: 'mixamorigLeftShoulder',
  upperArmL: 'mixamorigLeftArm',
  foreArmL: 'mixamorigLeftForeArm',
  handL: 'mixamorigLeftHand',
  shoulderR: 'mixamorigRightShoulder',
  upperArmR: 'mixamorigRightArm',
  foreArmR: 'mixamorigRightForeArm',
  handR: 'mixamorigRightHand',
  upLegL: 'mixamorigLeftUpLeg',
  legL: 'mixamorigLeftLeg',
  footL: 'mixamorigLeftFoot',
  upLegR: 'mixamorigRightUpLeg',
  legR: 'mixamorigRightLeg',
  footR: 'mixamorigRightFoot',
} as const

export type BoneKey = keyof typeof BONE_NAMES

/** 一根可定向骨骼：目标方向由「父锚点 -> 子锚点」推导 */
interface BoneRouter {
  key: BoneKey
  from: JointName | 'pelvisCenter' | 'neck' | 'headTop' | 'shoulderL' | 'shoulderR' | 'hipL' | 'hipR'
  to: JointName | 'neck' | 'headTop'
}

/** 骨骼路由表：按自根向末端的顺序逐级把姿态方向映射到骨骼 */
const BONE_ROUTING: ReadonlyArray<BoneRouter> = [
  // 躯干（spine 指向 neck，chest 由层级带动）
  { key: 'spine', from: 'pelvisCenter', to: 'neck' },
  { key: 'neck', from: 'neck', to: 'head' },
  { key: 'head', from: 'neck', to: 'headTop' },
  // 左臂
  { key: 'upperArmL', from: 'shoulderL', to: 'elbowL' },
  { key: 'foreArmL', from: 'elbowL', to: 'handL' },
  // 右臂
  { key: 'upperArmR', from: 'shoulderR', to: 'elbowR' },
  { key: 'foreArmR', from: 'elbowR', to: 'handR' },
  // 左腿
  { key: 'upLegL', from: 'hipL', to: 'kneeL' },
  { key: 'legL', from: 'kneeL', to: 'footL' },
  // 右腿
  { key: 'upLegR', from: 'hipR', to: 'kneeR' },
  { key: 'legR', from: 'kneeR', to: 'footR' },
]

/** 目标方向的派生锚点：躯干中点/胸口用姿态关节近似 */
function anchorPoints(pose: Pose, view: 'side' | 'front'): Record<string, Vec3> {
  const p3 = poseTo3D(pose, view)
  const out: Record<string, Vec3> = {}
  for (const j of JOINTS) out[j] = p3[j]
  out.pelvisCenter = p3.pelvis
  out.neck = p3.neck
  const head = p3.head
  const neck = p3.neck
  out.headTop = [
    neck[0] + (head[0] - neck[0]) * 1.6,
    neck[1] + (head[1] - neck[1]) * 1.6,
    neck[2] + (head[2] - neck[2]) * 1.6,
  ]
  return out
}

/** 收集 GLB 场景里的骨骼，返回 (key→BoneObject) 映射 */
export function collectBones(scene: THREE.Object3D): Map<BoneKey, THREE.Object3D> {
  const bind = new Map<BoneKey, THREE.Object3D>()
  scene.traverse((o) => {
    const k = (Object.keys(BONE_NAMES) as BoneKey[]).find((bk) => BONE_NAMES[bk] === o.name)
    if (k) bind.set(k, o)
  })
  return bind
}

export interface BoneBind {
  /** 骨骼对象 */
  bone: THREE.Object3D
  /** rest 时的局部旋转（用于每帧复位，保证确定性） */
  restQuat: THREE.Quaternion
}

/** 捕获 rest 基准：记录每根骨骼的 rest 局部旋转（含 hips 根，用于复位与寻根）。 */
export function captureRest(bind: Map<BoneKey, THREE.Object3D>): Map<BoneKey, BoneBind> {
  const out = new Map<BoneKey, BoneBind>()
  for (const [key, bone] of bind) {
    out.set(key, { bone, restQuat: bone.quaternion.clone() })
  }
  return out
}

/** 骨骼当前世界方向（指向首个 BONE 子骨骼），失败返回 null */
function currentWorldDir(bone: THREE.Object3D): THREE.Vector3 | null {
  const firstChild = bone.children.find((c) => (c as THREE.Bone).isBone)
  if (!firstChild) return null
  const from = bone.getWorldPosition(new THREE.Vector3())
  const to = firstChild.getWorldPosition(new THREE.Vector3())
  const w = to.sub(from)
  return w.lengthSq() < 1e-10 ? null : w.normalize()
}

/** 把骨骼世界方向旋转到 targetDirWorld；同时处理父坐标系。 */
function aimBone(bone: THREE.Object3D, targetDirWorld: THREE.Vector3, root: THREE.Object3D): void {
  if (!bone.parent) return
  const parentQuat = bone.parent!.getWorldQuaternion(new THREE.Quaternion())
  const curDir = currentWorldDir(bone)
  if (!curDir) return
  const delta = new THREE.Quaternion().setFromUnitVectors(curDir, targetDirWorld)
  const local = parentQuat.clone().invert().multiply(delta).multiply(parentQuat).multiply(bone.quaternion)
  bone.quaternion.copy(local)
  root.updateWorldMatrix(true, true)
}

/** 在 bind 骨骼上应用重定向：每帧复位 rest，再逐级按当前方向绝对转向。 */
export function applyRetarget(
  pose: Pose,
  view: 'side' | 'front',
  bind: Map<BoneKey, BoneBind>,
): void {
  const root = bind.get('hips')?.bone ?? null
  if (!root) return
  const anchors = anchorPoints(pose, view)

  // 1) 复位所有驱动骨骼到 rest，保证本帧从确定状态开始（避免逐帧漂移）
  for (const { bone, restQuat } of bind.values()) {
    bone.quaternion.copy(restQuat)
  }
  root.updateWorldMatrix(true, true)

  // 2) 从根到末端，用当前方向逐级 aim 到姿态目标方向
  for (const route of BONE_ROUTING) {
    const item = bind.get(route.key)
    if (!item) continue
    const from = anchors[route.from]
    const to = anchors[route.to]
    if (!from || !to) continue
    const targetDir = new THREE.Vector3(to[0], to[1], to[2]).sub(
      new THREE.Vector3(from[0], from[1], from[2]),
    )
    if (targetDir.lengthSq() < 1e-8) continue
    aimBone(item.bone, targetDir.normalize(), root)
  }
}
