import { useCallback } from 'react'

const CROP_WIDTH = 600
const CROP_HEIGHT = 450

export function useScreenshot() {
  const capture = useCallback(async (clickX: number, clickY: number): Promise<string | undefined> => {
    try {
      const { default: html2canvas } = await import('html2canvas')

      const x = Math.max(0, clickX - CROP_WIDTH / 2)
      const y = Math.max(0, clickY - CROP_HEIGHT / 2)

      const canvas = await html2canvas(document.body, {
        x,
        y,
        width: CROP_WIDTH,
        height: CROP_HEIGHT,
        useCORS: true,
        allowTaint: true,
        logging: false,
        ignoreElements: (el) => el.id === 'df-root',
      })

      return canvas.toDataURL('image/jpeg', 0.82)
    } catch (err) {
      console.warn('[FeedbackWidget] Screenshot capture failed:', err)
      return undefined
    }
  }, [])

  return { capture }
}
