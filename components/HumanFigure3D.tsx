'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { RotateCcwIcon, OrbitIcon } from 'lucide-react'
import { computePoseFrame, type PoseAnimation } from '@/lib/figure'
import { captureRest, collectBones, applyRetarget, type BoneBind, type BoneKey } from '@/lib/retarget'
import type { BreathPattern } from '@/types'
import { Button } from '@/components/ui/button'
import { ExerciseFigure } from '@/components/ExerciseFigure'

/** 主题色：读 CSS 变量并跟随明暗主题切换 */
export function useBrandColors(): [string, string, string] {
  const [colors, setColors] = useState<[string, string, string]>(['#0d9488', '#2563eb', '#5b6472'])
  useEffect(() => {
    const root = document.documentElement
    const read = () => {
      const s = getComputedStyle(root)
      const a = s.getPropertyValue('--brand-a').trim()
      const b = s.getPropertyValue('--brand-b').trim()
      const m = s.getPropertyValue('--muted-foreground').trim()
      if (a && b) setColors([a, b, m || '#5b6472'])
    }
    read()
    const ob = new MutationObserver(read)
    ob.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => ob.disconnect()
  }, [])
  return colors
}

export function ModelLights() {
  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[2.5, 4, 3.5]} intensity={1.35} />
      <directionalLight position={[-3, 1.5, -3]} intensity={0.5} color="#7dd3fc" />
    </>
  )
}

/** 地面：淡色圆盘 + 边圈，给模型一个可旋转参照 */
function Ground({ y, muted }: { y: number | null; muted: string }) {
  if (y === null) return null
  return (
    <group position={[0, y, 0]}>
      <mesh rotation-x={-Math.PI / 2} renderOrder={-1}>
        <circleGeometry args={[0.52, 48]} />
        <meshBasicMaterial color={muted} transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.5, 0.525, 48]} />
        <meshBasicMaterial
          color={muted}
          transparent
          opacity={0.28}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export interface FigureContentProps {
  animation: PoseAnimation
  breath: BreathPattern
  elapsedMs: number
  colors: [string, string, string]
  /** 模型绕竖直轴自转速度（rad/s），0 关闭 */
  spin?: number
  /** 是否渲染接触阴影 */
  shadow?: boolean
}

/** GLB 人体资源路径（部署到 /fit-flow 子路径时由 NEXT_PUBLIC_BASE_PATH 前缀修正） */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const HUMAN_URL = `${BASE}/models/human.glb`

/**
 * 克隆 scene 后，SkinnedMesh.skeleton 仍指向源场景的骨骼（clone 不深拷贝骨骼引用）。
 * 这里把克隆出的每个 SkinnedMesh 的 skeleton 重建为指向克隆骨骼的骨架，使重定向生效。
 * 注意：不要传 mesh.matrixWorld 给 bind —— 克隆初期矩阵可能未更新，会烘焙错误偏移
 * （R3F 环境尤为如此）。绑定到骨骼当前 rest 姿态即可。
 */
function rebindSkeleton(cloned: THREE.Object3D): void {
  const cloneBones = new Map<string, THREE.Bone>()
  cloned.traverse((o) => {
    if ((o as THREE.Bone).isBone) cloneBones.set(o.name, o as THREE.Bone)
  })
  cloned.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh
    if (!mesh.isSkinnedMesh) return
    const bones = mesh.skeleton.bones.map((b) => cloneBones.get(b.name) ?? b)
    const skeleton = new THREE.Skeleton(bones, mesh.skeleton.boneInverses)
    mesh.bind(skeleton, new THREE.Matrix4())
  })
}

/**
 * 3D 人体模型场景内容：加载 GLB 人体，用骨骼重定向驱动姿态（见 lib/retarget.ts）。
 * 每帧按 computePoseFrame 计算当前姿态并应用重定向，配合呼吸节拍循环。
 * 可放进独立 Canvas，也可放进 drei <View> 共享画布。
 */
export function FigureContent({
  animation,
  breath,
  elapsedMs,
  colors,
  spin = 0,
  shadow = false,
}: FigureContentProps) {
  const { scene: sourceScene } = useGLTF(HUMAN_URL)
  // useGLTF 返回共享缓存的 scene，多实例（播放器当前动作+预览、图鉴 21 个 View）同时驱动会互相覆盖。
  // 因此每个实例克隆一份 scene，并重建蒙皮骨骼（clone 后的 SkinnedMesh.skeleton 仍指向原场景骨骼，
  // 必须重新构建指向克隆骨骼的 Skeleton，否则重定向不生效）。
  const scene = useMemo(() => {
    const s = sourceScene.clone(true)
    rebindSkeleton(s)
    return s
  }, [sourceScene])
  const bindRef = useRef<Map<BoneKey, BoneBind> | null>(null)
  const groupRef = useRef<THREE.Group>(null)

  // 捕获 rest 基准：场景挂载后、任何姿态应用前，记录骨骼的 rest 局部旋转
  useEffect(() => {
    scene.updateMatrixWorld(true)
    if (!bindRef.current) {
      bindRef.current = captureRest(collectBones(scene))
      scene.updateMatrixWorld(true)
    }
  }, [scene])

  // 每帧按动画 + 呼吸计算当前姿态并应用重定向，配合呼吸节拍循环；自转也在帧循环里做。
  useFrame((_, delta) => {
    if (bindRef.current) {
      const frame = computePoseFrame(animation, breath, elapsedMs)
      applyRetarget(frame.pose, frame.view, bindRef.current)
      scene.updateMatrixWorld(true)
    }
    if (spin !== 0 && groupRef.current) groupRef.current.rotation.y += delta * spin
  })

  const groundY = 0.005

  return (
    <>
      <ModelLights />
      <Ground y={groundY} muted={colors[2]} />
      {shadow && groundY !== null && (
        <ContactShadows
          position={[0, groundY + 0.002, 0]}
          scale={1.5}
          blur={2.4}
          far={1}
          opacity={0.3}
          resolution={256}
          color="#334155"
        />
      )}
      <group ref={groupRef} rotation-y={Math.PI}>
        <primitive object={scene} />
      </group>
    </>
  )
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

interface Props {
  animation: PoseAnimation
  breath: BreathPattern
  elapsedMs: number
  className?: string
  /** 启用拖拽旋转/缩放与视角控制按钮（默认 true） */
  interactive?: boolean
  spin?: number
}

/**
 * 3D 人体模型：按呼吸节拍演示动作姿态，支持 360° 自由旋转视角
 * （拖拽环绕、滚轮/双指缩放、自动旋转、重置）。
 * 无 WebGL 环境自动回退为 SVG 火柴人（ExerciseFigure）。
 */
export default function HumanFigure3D({
  animation,
  breath,
  elapsedMs,
  className,
  interactive = true,
  spin = 0,
}: Props) {
  const colors = useBrandColors()
  const [mounted, setMounted] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  useEffect(() => setMounted(true), [])

  const supported = useMemo(() => (mounted ? detectWebGL() : false), [mounted])

  if (!mounted) return <div className={className} aria-hidden />
  if (!supported) {
    return (
      <ExerciseFigure animation={animation} breath={breath} elapsedMs={elapsedMs} className={className} />
    )
  }

  return (
    <div className={`relative ${className ?? ''}`} title="拖拽旋转视角 · 滚轮缩放">
      <Canvas
        flat
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <PerspectiveCamera makeDefault fov={34} near={0.05} far={30} position={[0, 0.9, 3.2]} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={[0, 0.88, 0]}
          enablePan={false}
          enableDamping
          dampingFactor={0.12}
          rotateSpeed={0.85}
          zoomSpeed={0.8}
          minDistance={1.5}
          maxDistance={5.5}
          autoRotate={interactive && autoRotate}
          autoRotateSpeed={2.4}
        />
        <Suspense fallback={null}>
          <FigureContent
            animation={animation}
            breath={breath}
            elapsedMs={elapsedMs}
            colors={colors}
            spin={interactive && autoRotate ? 0 : spin}
            shadow
          />
        </Suspense>
      </Canvas>
      {interactive && (
        <>
          <div className="pointer-events-none absolute bottom-2 left-2 text-[10px] leading-none text-muted-foreground/70 select-none">
            拖拽旋转 · 滚轮缩放
          </div>
          <div className="absolute right-1.5 bottom-1.5 flex gap-1.5">
            <Button
              variant="secondary"
              size="icon"
              className={`size-7 rounded-full ${autoRotate ? 'text-primary' : ''}`}
              onClick={() => setAutoRotate((v) => !v)}
              aria-label="自动旋转"
              title="自动旋转"
            >
              <OrbitIcon className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="size-7 rounded-full"
              onClick={() => controlsRef.current?.reset()}
              aria-label="重置视角"
              title="重置视角"
            >
              <RotateCcwIcon className="size-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
