/** 中文语音播报封装（Web Speech API） */

let cachedVoice: SpeechSynthesisVoice | null = null
let voicesReady = typeof speechSynthesis !== 'undefined' && speechSynthesis.getVoices().length > 0

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice
  const voices = speechSynthesis.getVoices()
  if (voices.length === 0) return null
  // 优先 zh-CN，其次任意中文，最后交给浏览器默认
  cachedVoice =
    voices.find((v) => v.lang.replace('_', '-').toLowerCase() === 'zh-cn') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('zh')) ??
    voices.find((v) => /中文|chinese/i.test(v.name)) ??
    null
  return cachedVoice
}

if (typeof speechSynthesis !== 'undefined' && !voicesReady) {
  // Chrome 首次加载时 voices 可能为空，监听加载完成事件
  speechSynthesis.addEventListener('voiceschanged', () => {
    pickVoice()
    voicesReady = true
  })
}

export function speak(text: string, opts: { volume?: number; rate?: number } = {}): void {
  if (typeof speechSynthesis === 'undefined') return
  // 取消未播完的短句，避免提示积压导致延迟
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice()
  if (voice) u.voice = voice
  u.lang = 'zh-CN'
  u.rate = opts.rate ?? 1
  u.volume = opts.volume ?? 1
  speechSynthesis.speak(u)
}

export function cancelSpeech(): void {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}
