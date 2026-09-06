/** 提示音封装（Web Audio 合成，无需音频文件） */

let ctx: AudioContext | null = null

/** 必须在用户手势（如点击「开始」）后调用，解锁音频上下文 */
export function ensureAudio(): void {
  if (typeof AudioContext === 'undefined') return
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

function tone(freq: number, durationMs: number, volume: number, delayMs = 0, type: OscillatorType = 'sine'): void {
  if (!ctx) return
  const start = ctx.currentTime + delayMs / 1000
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  // 快速起音、收音，避免爆音
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationMs / 1000)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + durationMs / 1000 + 0.05)
}

/** 倒计时哔声（最后 3 秒） */
export function playTick(volume: number): void {
  tone(880, 120, volume * 0.5, 0, 'square')
}

/** 呼吸相位切换提示：吸气稍高、呼气稍低 */
export function playBreathCue(phase: 'inhale' | 'exhale', volume: number): void {
  tone(phase === 'inhale' ? 660 : 520, 180, volume * 0.35)
}

/** 动作/阶段切换 */
export function playSegmentChange(volume: number): void {
  tone(523, 150, volume * 0.5)
  tone(784, 220, volume * 0.5, 120)
}

/** 训练完成 */
export function playFinish(volume: number): void {
  tone(523, 180, volume * 0.5)
  tone(659, 180, volume * 0.5, 150)
  tone(784, 350, volume * 0.55, 300)
}
