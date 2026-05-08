const PALETTE = [
  { bg: 'df-bg-indigo-100', text: 'df-text-indigo-700', dot: 'df-bg-indigo-500' },
  { bg: 'df-bg-blue-100',   text: 'df-text-blue-700',   dot: 'df-bg-blue-500'   },
  { bg: 'df-bg-emerald-100',text: 'df-text-emerald-700', dot: 'df-bg-emerald-500'},
  { bg: 'df-bg-amber-100',  text: 'df-text-amber-700',   dot: 'df-bg-amber-500'  },
  { bg: 'df-bg-rose-100',   text: 'df-text-rose-700',    dot: 'df-bg-rose-500'   },
  { bg: 'df-bg-violet-100', text: 'df-text-violet-700',  dot: 'df-bg-violet-500' },
] as const

export function getTagColor(index: number) {
  return PALETTE[index % PALETTE.length]
}
