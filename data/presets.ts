import type { Exercise, Workout } from '../types'

function ex(id: string, name: string, durationSec: number, inhale: number, exhale: number, tip?: string): Exercise {
  return { id, name, durationSec, breath: { inhaleSec: inhale, exhaleSec: exhale }, tip }
}

export const PRESET_WORKOUTS: Workout[] = [
  {
    id: 'preset-core',
    name: '核心挑战',
    description: '腹部与核心力量入门，平板支撑系列为主',
    prepareSec: 10,
    restSec: 15,
    preset: true,
    exercises: [
      ex('core-1', '卷腹', 40, 2, 2, '下背贴地，用腹肌发力，不要用手拉头'),
      ex('core-2', '平板支撑', 45, 3, 3, '身体成一条直线，臀部不塌不撅'),
      ex('core-3', '左侧平板支撑', 30, 3, 3, '髋部抬离地面，身体侧向一条线'),
      ex('core-4', '右侧平板支撑', 30, 3, 3, '髋部抬离地面，身体侧向一条线'),
      ex('core-5', '臀桥', 45, 2, 2, '顶起时夹紧臀部，脚跟发力'),
      ex('core-6', '死虫式', 40, 3, 3, '下背压住地面，手脚缓慢伸展'),
    ],
  },
  {
    id: 'preset-hiit',
    name: 'HIIT 入门',
    description: '六组动作循环的燃脂训练，节奏较快',
    prepareSec: 10,
    restSec: 20,
    preset: true,
    exercises: [
      ex('hiit-1', '开合跳', 30, 1, 1, '落地屈膝缓冲，保持节奏'),
      ex('hiit-2', '高抬腿', 30, 1, 1, '膝盖抬至髋部高度，核心收紧'),
      ex('hiit-3', '深蹲', 30, 2, 2, '下蹲呼气起身吸气，膝盖对准脚尖'),
      ex('hiit-4', '俯卧撑（可跪姿）', 30, 2, 2, '手肘约 45 度，身体保持直线'),
      ex('hiit-5', '登山者', 30, 1, 1, '核心收紧，交替提膝保持节奏'),
      ex('hiit-6', '波比跳', 30, 2, 2, '量力而行，保持动作质量'),
    ],
  },
  {
    id: 'preset-stretch',
    name: '睡前拉伸',
    description: '慢呼吸静态拉伸，放松全身助眠',
    prepareSec: 10,
    restSec: 5,
    preset: true,
    exercises: [
      ex('stretch-1', '颈部侧拉伸（左）', 30, 4, 6, '手轻扶头侧向拉伸，肩膀下沉'),
      ex('stretch-2', '颈部侧拉伸（右）', 30, 4, 6, '手轻扶头侧向拉伸，肩膀下沉'),
      ex('stretch-3', '手臂过顶拉伸', 40, 4, 6, '吸气向上延展，呼气加深侧弯'),
      ex('stretch-4', '坐姿体前屈', 60, 4, 6, '呼气时缓慢前倾，背部放松'),
      ex('stretch-5', '蝴蝶式', 60, 4, 6, '脚心相对，膝盖向地面沉'),
      ex('stretch-6', '婴儿式', 60, 4, 6, '额头点地，呼吸放慢放深'),
      ex('stretch-7', '卧姿转体（左）', 40, 4, 6, '呼气时膝盖倒向一侧，肩膀贴地'),
      ex('stretch-8', '卧姿转体（右）', 40, 4, 6, '呼气时膝盖倒向一侧，肩膀贴地'),
    ],
  },
]
