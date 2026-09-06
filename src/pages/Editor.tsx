import { useState } from 'react'
import { BREATH_PRESETS, type Exercise, type Workout } from '../types'
import { uid } from '../lib/util'

interface Props {
  initial: Workout
  isNew: boolean
  onSave: (w: Workout) => void
  onCancel: () => void
}

function clampInt(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.max(min, Math.min(max, Math.round(v)))
}

export function Editor({ initial, isNew, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<Workout>(() => structuredClone(initial))

  const setExercise = (id: string, patch: Partial<Exercise>) => {
    setDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
  }

  const addExercise = () => {
    setDraft((d) => ({
      ...d,
      exercises: [
        ...d.exercises,
        { id: uid(), name: '', durationSec: 30, breath: { inhaleSec: 2, exhaleSec: 2 }, tip: '' },
      ],
    }))
  }

  const removeExercise = (id: string) => {
    setDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) }))
  }

  const moveExercise = (index: number, dir: -1 | 1) => {
    setDraft((d) => {
      const target = index + dir
      if (target < 0 || target >= d.exercises.length) return d
      const list = [...d.exercises]
      ;[list[index], list[target]] = [list[target], list[index]]
      return { ...d, exercises: list }
    })
  }

  const handleSave = () => {
    if (draft.exercises.length === 0) {
      alert('至少需要一个动作')
      return
    }
    const cleaned: Workout = {
      ...draft,
      name: draft.name.trim() || '我的课程',
      prepareSec: clampInt(draft.prepareSec, 0, 60),
      restSec: clampInt(draft.restSec, 0, 120),
      exercises: draft.exercises.map((e) => ({
        ...e,
        name: e.name.trim() || '未命名动作',
        durationSec: clampInt(e.durationSec, 5, 600),
        breath: {
          inhaleSec: clampInt(e.breath.inhaleSec, 1, 30),
          exhaleSec: clampInt(e.breath.exhaleSec, 1, 30),
        },
      })),
    }
    onSave(cleaned)
  }

  return (
    <div className="container editor">
      <header className="home-header">
        <h1 className="app-title">{isNew ? '新建课程' : '编辑课程'}</h1>
        <button className="icon-btn" onClick={onCancel} aria-label="返回">
          ✕
        </button>
      </header>

      <div className="card editor-form">
        <label className="field">
          <span>课程名称</span>
          <input
            type="text"
            value={draft.name}
            placeholder="如：办公室午间放松"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>准备倒计时（秒）</span>
            <input
              type="number"
              min={0}
              max={60}
              value={draft.prepareSec}
              onChange={(e) => setDraft((d) => ({ ...d, prepareSec: Number(e.target.value) }))}
            />
          </label>
          <label className="field">
            <span>动作间休息（秒）</span>
            <input
              type="number"
              min={0}
              max={120}
              value={draft.restSec}
              onChange={(e) => setDraft((d) => ({ ...d, restSec: Number(e.target.value) }))}
            />
          </label>
        </div>
      </div>

      {draft.exercises.map((e, i) => (
        <div className="card ex-card" key={e.id}>
          <div className="ex-head">
            <span className="ex-index">{i + 1}</span>
            <input
              className="ex-name"
              type="text"
              value={e.name}
              placeholder="动作名称，如 平板支撑"
              onChange={(ev) => setExercise(e.id, { name: ev.target.value })}
            />
            <div className="ex-ops">
              <button className="mini-btn" onClick={() => moveExercise(i, -1)} disabled={i === 0} aria-label="上移">
                ↑
              </button>
              <button
                className="mini-btn"
                onClick={() => moveExercise(i, 1)}
                disabled={i === draft.exercises.length - 1}
                aria-label="下移"
              >
                ↓
              </button>
              <button className="mini-btn mini-danger" onClick={() => removeExercise(e.id)} aria-label="删除">
                ✕
              </button>
            </div>
          </div>
          <div className="ex-fields">
            <label className="field field-sm">
              <span>坚持（秒）</span>
              <input
                type="number"
                min={5}
                max={600}
                value={e.durationSec}
                onChange={(ev) => setExercise(e.id, { durationSec: Number(ev.target.value) })}
              />
            </label>
            <label className="field field-sm">
              <span>吸气（秒）</span>
              <input
                type="number"
                min={1}
                max={30}
                value={e.breath.inhaleSec}
                onChange={(ev) => setExercise(e.id, { breath: { ...e.breath, inhaleSec: Number(ev.target.value) } })}
              />
            </label>
            <label className="field field-sm">
              <span>呼气（秒）</span>
              <input
                type="number"
                min={1}
                max={30}
                value={e.breath.exhaleSec}
                onChange={(ev) => setExercise(e.id, { breath: { ...e.breath, exhaleSec: Number(ev.target.value) } })}
              />
            </label>
          </div>
          <div className="chip-row">
            {BREATH_PRESETS.map((p) => {
              const active = e.breath.inhaleSec === p.inhale && e.breath.exhaleSec === p.exhale
              return (
                <button
                  key={p.label}
                  className={`chip ${active ? 'chip-active' : ''}`}
                  title={p.hint}
                  onClick={() => setExercise(e.id, { breath: { inhaleSec: p.inhale, exhaleSec: p.exhale } })}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <label className="field">
            <span>动作要领（播报屏显）</span>
            <input
              type="text"
              value={e.tip ?? ''}
              placeholder="可选，如：核心收紧，臀部不塌"
              onChange={(ev) => setExercise(e.id, { tip: ev.target.value })}
            />
          </label>
        </div>
      ))}

      <button className="btn btn-secondary add-ex" onClick={addExercise}>
        ＋ 添加动作
      </button>

      <div className="editor-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          取消
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          保存课程
        </button>
      </div>
    </div>
  )
}
