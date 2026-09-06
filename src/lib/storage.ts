import type { HistoryEntry, Settings, Workout } from '../types'
import { DEFAULT_SETTINGS } from '../types'

const KEYS = {
  customWorkouts: 'fitflow.customWorkouts',
  settings: 'fitflow.settings',
  history: 'fitflow.history',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 存储不可用时静默失败，功能不受影响
  }
}

export function loadCustomWorkouts(): Workout[] {
  return read<Workout[]>(KEYS.customWorkouts, [])
}

export function saveCustomWorkouts(list: Workout[]): void {
  write(KEYS.customWorkouts, list)
}

export function upsertCustomWorkout(w: Workout): Workout[] {
  const list = loadCustomWorkouts()
  const idx = list.findIndex((x) => x.id === w.id)
  if (idx >= 0) list[idx] = w
  else list.push(w)
  saveCustomWorkouts(list)
  return list
}

export function deleteCustomWorkout(id: string): Workout[] {
  const list = loadCustomWorkouts().filter((x) => x.id !== id)
  saveCustomWorkouts(list)
  return list
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) }
}

export function saveSettings(s: Settings): void {
  write(KEYS.settings, s)
}

export function loadHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(KEYS.history, [])
}

export function addHistory(entry: HistoryEntry): HistoryEntry[] {
  const list = [entry, ...loadHistory()].slice(0, 50)
  write(KEYS.history, list)
  return list
}
