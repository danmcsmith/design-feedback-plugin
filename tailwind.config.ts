import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const tagColors = ['indigo', 'blue', 'emerald', 'amber', 'rose', 'violet']
const tagSafelist = tagColors.flatMap((c) => [
  `df-bg-${c}-100`,
  `df-bg-${c}-500`,
  `df-text-${c}-700`,
])

export default {
  content: ['./src/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}', './demo/**/*.{ts,tsx}'],
  prefix: 'df-',
  safelist: tagSafelist,
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      zIndex: {
        overlay: '2147483640',
        form: '2147483642',
        sidebar: '2147483644',
        tab: '2147483645',
        fab: '2147483646',
      },
    },
  },
  plugins: [animate],
} satisfies Config
