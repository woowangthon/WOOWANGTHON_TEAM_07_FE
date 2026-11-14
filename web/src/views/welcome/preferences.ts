import { applyFontSize, readFontSize, type FontLevel, FONTSIZE_LEVELS } from '../account/favorites'

export const PREFERENCES_KEY = 'elevSubway.accessibility.v1'
export interface Preferences {
  font: FontLevel
  contrast: boolean
  simple: boolean
  touch: boolean
  motion: boolean
  stepFree: boolean
}
export const defaultPreferences = (): Preferences => ({
  font: readFontSize(), contrast: false, simple: false, touch: false, motion: false, stepFree: false,
})

export function readPreferences(): Preferences | null {
  try {
    const value = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || 'null')
    if (!value || value.version !== 1 || !FONTSIZE_LEVELS.includes(value.font)) return null
    if (!['contrast', 'simple', 'touch', 'motion', 'stepFree'].every((key) => typeof value[key] === 'boolean')) return null
    return { font: readFontSize(), contrast: value.contrast, simple: value.simple, touch: value.touch, motion: value.motion, stepFree: value.stepFree }
  } catch { return null }
}

export function applyPreferences(value: Preferences) {
  applyFontSize(value.font)
  for (const key of ['contrast', 'touch', 'motion'] as const) {
    document.documentElement.toggleAttribute(`data-access-${key}`, value[key])
  }
}

export function savePreferences(value: Preferences): boolean {
  applyPreferences(value)
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...value, version: 1 }))
    return true
  } catch { return false }
}
