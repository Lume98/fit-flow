import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, XIcon } from 'lucide-react'
import { BREATH_PRESETS, type Exercise, type Workout } from '@/types'
import { uid } from '@/lib/util'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { toast } from '@/components/ui/toast'

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

function matchedPresetLabel(e: Exercise): string | null {
  return BREATH_PRESETS.find((p) => p.inhale === e.breath.inhaleSec && p.exhale === e.breath.exhaleSec)?.label ?? null
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
        { id: uid(), name: '', durationSec: 30, breath: { inhaleSec: 2, exhaleSec: 2 }, tip: '', sets: 1 },
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
      toast.add({ type: 'error', title: '至少需要一个动作', description: '点击「添加动作」开始编排你的课程。' })
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
        sets: clampInt(e.sets ?? 1, 1, 10),
        reps: e.reps && e.reps > 0 ? clampInt(e.reps, 1, 500) : undefined,
      })),
    }
    onSave(cleaned)
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pt-5 pb-8">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? '新建课程' : '编辑课程'}</h1>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="返回">
          <XIcon />
        </Button>
      </header>

      <Card className="mb-3">
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="workout-name">课程名称</FieldLabel>
              <Input
                id="workout-name"
                value={draft.name}
                placeholder="如：办公室午间放松"
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </Field>
            <div className="flex gap-3">
              <Field>
                <FieldLabel htmlFor="workout-prepare">准备倒计时（秒）</FieldLabel>
                <Input
                  id="workout-prepare"
                  type="number"
                  min={0}
                  max={60}
                  value={draft.prepareSec}
                  onChange={(e) => setDraft((d) => ({ ...d, prepareSec: Number(e.target.value) }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="workout-rest">动作间休息（秒）</FieldLabel>
                <Input
                  id="workout-rest"
                  type="number"
                  min={0}
                  max={120}
                  value={draft.restSec}
                  onChange={(e) => setDraft((d) => ({ ...d, restSec: Number(e.target.value) }))}
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      {draft.exercises.map((e, i) => {
        const active = matchedPresetLabel(e)
        return (
          <Card className="mb-3" key={e.id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <Input
                  className="flex-1"
                  value={e.name}
                  placeholder="动作名称，如 平板支撑"
                  aria-label={`第 ${i + 1} 个动作名称`}
                  onChange={(ev) => setExercise(e.id, { name: ev.target.value })}
                />
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveExercise(i, -1)}
                    disabled={i === 0}
                    aria-label="上移"
                  >
                    <ChevronUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => moveExercise(i, 1)}
                    disabled={i === draft.exercises.length - 1}
                    aria-label="下移"
                  >
                    <ChevronDownIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive"
                    onClick={() => removeExercise(e.id)}
                    aria-label="删除动作"
                  >
                    <XIcon />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Field>
                  <FieldLabel htmlFor={`ex-${e.id}-duration`}>坚持（秒/组）</FieldLabel>
                  <Input
                    id={`ex-${e.id}-duration`}
                    type="number"
                    min={5}
                    max={600}
                    value={e.durationSec}
                    onChange={(ev) => setExercise(e.id, { durationSec: Number(ev.target.value) })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`ex-${e.id}-sets`}>组数</FieldLabel>
                  <Input
                    id={`ex-${e.id}-sets`}
                    type="number"
                    min={1}
                    max={10}
                    value={e.sets ?? 1}
                    onChange={(ev) => setExercise(e.id, { sets: Number(ev.target.value) })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`ex-${e.id}-reps`}>次/组（可选）</FieldLabel>
                  <Input
                    id={`ex-${e.id}-reps`}
                    type="number"
                    min={1}
                    max={500}
                    placeholder="如 12"
                    value={e.reps ?? ''}
                    onChange={(ev) => {
                      const n = Number(ev.target.value)
                      setExercise(e.id, { reps: Number.isFinite(n) && n > 0 ? Math.round(n) : undefined })
                    }}
                  />
                </Field>
              </div>
              <div className="flex gap-2.5">
                <Field>
                  <FieldLabel htmlFor={`ex-${e.id}-inhale`}>吸气（秒）</FieldLabel>
                  <Input
                    id={`ex-${e.id}-inhale`}
                    type="number"
                    min={1}
                    max={30}
                    value={e.breath.inhaleSec}
                    onChange={(ev) => setExercise(e.id, { breath: { ...e.breath, inhaleSec: Number(ev.target.value) } })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`ex-${e.id}-exhale`}>呼气（秒）</FieldLabel>
                  <Input
                    id={`ex-${e.id}-exhale`}
                    type="number"
                    min={1}
                    max={30}
                    value={e.breath.exhaleSec}
                    onChange={(ev) => setExercise(e.id, { breath: { ...e.breath, exhaleSec: Number(ev.target.value) } })}
                  />
                </Field>
              </div>
              <ToggleGroup
                aria-label="呼吸预设"
                variant="outline"
                value={active ? [active] : []}
                onValueChange={(groupValue) => {
                  const next = groupValue.find((v) => v !== active)
                  if (!next) return // 取消选中时保持当前节拍
                  const p = BREATH_PRESETS.find((bp) => bp.label === next)
                  if (p) setExercise(e.id, { breath: { inhaleSec: p.inhale, exhaleSec: p.exhale } })
                }}
              >
                {BREATH_PRESETS.map((p) => (
                  <ToggleGroupItem key={p.label} value={p.label} title={p.hint}>
                    {p.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Field>
                <FieldLabel htmlFor={`ex-${e.id}-tip`}>动作要领（播报屏显）</FieldLabel>
                <Input
                  id={`ex-${e.id}-tip`}
                  value={e.tip ?? ''}
                  placeholder="可选，如：核心收紧，臀部不塌"
                  onChange={(ev) => setExercise(e.id, { tip: ev.target.value })}
                />
              </Field>
            </CardContent>
          </Card>
        )
      })}

      <Button variant="outline" className="mt-1 mb-4 w-full" onClick={addExercise}>
        <PlusIcon data-icon="inline-start" />
        添加动作
      </Button>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSave}>保存课程</Button>
      </div>
    </div>
  )
}
