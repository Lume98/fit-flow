import { useState } from 'react'
import { formatDuration } from '../lib/util'
import { loadHistory } from '../lib/storage'
import type { HistoryEntry, Settings, Workout } from '../types'
import { PRESET_WORKOUTS } from '../data/presets'

interface Props {
  customWorkouts: Workout[]
  settings: Settings
  onSettingsChange: (s: Settings) => void
  onPlay: (w: Workout) => void
  onEdit: (w: Workout) => void
  onDuplicate: (w: Workout) => void
  onNew: () => void
  onDelete: (id: string) => void
}

function workoutTotalSec(w: Workout): number {
  const rest = w.exercises.length > 1 ? w.restSec * (w.exercises.length - 1) : 0
  return w.prepareSec + w.exercises.reduce((s, e) => s + e.durationSec, 0) + rest
}

function isToday(ts: number): boolean {
  const d = new Date(ts)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function WorkoutCard(props: {
  w: Workout
  isPreset: boolean
  onPlay: (w: Workout) => void
  onEdit?: (w: Workout) => void
  onDuplicate?: (w: Workout) => void
  onDelete?: (id: string) => void
}) {
  const { w, isPreset } = props
  return (
    <div className="card workout-card">
      <div className="workout-info">
        <div className="workout-title-row">
          <h3>{w.name}</h3>
          {isPreset && <span className="tag">内置</span>}
        </div>
        {w.description && <p className="workout-desc">{w.description}</p>}
        <div className="workout-meta">
          <span>⏱ {formatDuration(workoutTotalSec(w))}</span>
          <span>·</span>
          <span>{w.exercises.length} 个动作</span>
          <span>·</span>
          <span>休息 {w.restSec}s</span>
        </div>
      </div>
      <div className="workout-actions">
        <button className="btn btn-primary" onClick={() => props.onPlay(w)}>
          开始
        </button>
        {isPreset && props.onDuplicate && (
          <button className="btn btn-ghost" onClick={() => props.onDuplicate!(w)}>
            复制编辑
          </button>
        )}
        {!isPreset && props.onEdit && (
          <button className="btn btn-ghost" onClick={() => props.onEdit!(w)}>
            编辑
          </button>
        )}
        {!isPreset && props.onDelete && (
          <button className="btn btn-ghost btn-danger" onClick={() => props.onDelete!(w.id)}>
            删除
          </button>
        )}
      </div>
    </div>
  )
}

export function Home(props: Props) {
  const { customWorkouts, settings, onSettingsChange } = props
  const [showSettings, setShowSettings] = useState(false)
  const [history] = useState<HistoryEntry[]>(() => loadHistory())

  const todaySec = history.filter((h) => isToday(h.completedAt)).reduce((s, h) => s + h.totalSec, 0)

  return (
    <div className="container">
      <header className="home-header">
        <div>
          <h1 className="app-title">FitFlow</h1>
          <p className="app-sub">跟着节拍练，呼吸不迷路</p>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings((v) => !v)} aria-label="设置">
          ⚙️
        </button>
      </header>

      {showSettings && (
        <div className="card settings-panel">
          <label className="setting-row">
            <span>语音播报（吸气 / 呼气 / 动作名）</span>
            <input
              type="checkbox"
              checked={settings.voiceEnabled}
              onChange={(e) => onSettingsChange({ ...settings, voiceEnabled: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>提示音</span>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => onSettingsChange({ ...settings, soundEnabled: e.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>音量</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.volume * 100)}
              onChange={(e) => onSettingsChange({ ...settings, volume: Number(e.target.value) / 100 })}
            />
          </label>
        </div>
      )}

      {(todaySec > 0 || history.length > 0) && (
        <p className="history-line">
          {todaySec > 0 ? `今日已练 ${Math.round(todaySec / 60)} 分钟` : '今天还没动起来'}
          {history.length > 0 && ` · 累计完成 ${history.length} 次`}
        </p>
      )}

      <h2 className="section-title">内置课程</h2>
      <div className="card-list">
        {PRESET_WORKOUTS.map((w) => (
          <WorkoutCard key={w.id} w={w} isPreset onPlay={props.onPlay} onDuplicate={props.onDuplicate} />
        ))}
      </div>

      <div className="section-head">
        <h2 className="section-title">我的课程</h2>
        <button className="btn btn-ghost" onClick={props.onNew}>
          ＋ 新建
        </button>
      </div>
      {customWorkouts.length === 0 ? (
        <div className="empty-hint">
          还没有自己的课程。点击「内置课程」卡片上的「复制编辑」，改造成你的专属节奏。
        </div>
      ) : (
        <div className="card-list">
          {customWorkouts.map((w) => (
            <WorkoutCard
              key={w.id}
              w={w}
              isPreset={false}
              onPlay={props.onPlay}
              onEdit={props.onEdit}
              onDelete={props.onDelete}
            />
          ))}
        </div>
      )}

      <footer className="home-footer">FitFlow · 数据保存在本浏览器中</footer>
    </div>
  )
}
