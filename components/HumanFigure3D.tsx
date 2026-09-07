'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { RotateCcwIcon, OrbitIcon } from 'lucide-react'
import { computePoseFrame, type PoseAnimation } from '@/lib/figure'
import { PIECE_SPECS, PROFILES, poseTo3D, resolvePieces, type Vec3 } from '@/lib/human3d'
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

// ── 共享几何体（单位尺寸，靠 mesh scale 适配各部位）────
const BALL_GEO = new THREE.SphereGeometry(1, 32, 24)

/** 肌肉轮廓旋转曲面缓存：轮廓系数 → 单位长度 lathe 几何（平移居中到原点，mesh 按中点+轴向摆放） */
const limbGeoCache = new Map<string, THREE.LatheGeometry>()
function getLimbGeometry(profile: string): THREE.LatheGeometry {
  let geo = limbGeoCache.get(profile)
  if (!geo) {
    const coefficients = PROFILES[profile] ?? [1, 1]
    const pts = coefficients.map(
      (c, i) => new THREE.Vector2(Math.max(c, 0), i / (coefficients.length - 1)),
    )
    geo = new THREE.LatheGeometry(pts, 32)
    // lathe 默认 y∈[0,1]，平移到以原点为中心，与中点摆放逻辑一致
    geo.translate(0, -0.5, 0)
    limbGeoCache.set(profile, geo)
  }
  return geo
}

const UP = new THREE.Vector3(0, 1, 0)
const scratchDir = new THREE.Vector3()
const scratchQuat = new THREE.Quaternion()

function quatArray(dir: Vec3): [number, number, number, number] {
  scratchDir.set(dir[0], dir[1], dir[2])
  scratchQuat.setFromUnitVectors(UP, scratchDir)
  return scratchQuat.toArray() as [number, number, number, number]
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

/**
 * 3D 人体模型场景内容：由 2D 姿态数据驱动，圆柱四肢 + 球关节拼成有体积感的人体。
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
  const frame = useMemo(
    () => computePoseFrame(animation, breath, elapsedMs),
    [animation, breath, elapsedMs],
  )
  const pieces = useMemo(
    () => resolvePieces(poseTo3D(frame.pose, frame.view)),
    [frame],
  )

  const materials = useMemo(() => {
    const ca = new THREE.Color(colors[0])
    const cb = new THREE.Color(colors[1])
    return PIECE_SPECS.map(
      (spec) =>
        new THREE.MeshPhysicalMaterial({
          color: ca.clone().lerp(cb, spec.t),
          roughness: 0.42,
          metalness: 0.05,
          clearcoat: 0.45,
          clearcoatRoughness: 0.35,
        }),
    )
  }, [colors])
  useEffect(
    () => () => {
      materials.forEach((m) => m.dispose())
    },
    [materials],
  )

  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (spin !== 0 && groupRef.current) groupRef.current.rotation.y += delta * spin
  })

  const groundY = frame.ground === null ? null : 0.5 - frame.ground

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
      <group ref={groupRef}>
        {pieces.map((p, i) => (
          <mesh
            key={p.id}
            geometry={p.kind === 'limb' ? getLimbGeometry(p.profile) : BALL_GEO}
            material={materials[i]}
            position={p.pos}
            quaternion={quatArray(p.dir)}
            scale={
              p.kind === 'limb'
                ? [p.r, p.len, p.r]
                : [p.r * p.squash[0], p.r * p.squash[1], p.r * p.squash[2]]
            }
          />
        ))}
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
        <PerspectiveCamera makeDefault fov={34} near={0.05} far={30} position={[0, 0.2, 2]} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={[0, 0.02, 0]}
          enablePan={false}
          enableDamping
          dampingFactor={0.12}
          rotateSpeed={0.85}
          zoomSpeed={0.8}
          minDistance={1.1}
          maxDistance={4.5}
          autoRotate={interactive && autoRotate}
          autoRotateSpeed={2.4}
        />
        <FigureContent
          animation={animation}
          breath={breath}
          elapsedMs={elapsedMs}
          colors={colors}
          spin={interactive && autoRotate ? 0 : spin}
          shadow
        />
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
