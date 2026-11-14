// 즐겨찾기 저장소(sessionStorage, 로그인 중에만 유효). app.js loadFavs/saveFavs/genFavId와 같다.
export const FAV_KEY = 'elevSubway.demoFavorites.v1'

export interface Favorite {
  id: string
  placeName: string
  alias?: string
  [k: string]: unknown
}

export function loadFavs(): Favorite[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(FAV_KEY) || '[]')
    return Array.isArray(saved)
      ? saved.filter((fav) => fav && typeof fav.id === 'string' && typeof fav.placeName === 'string')
      : []
  } catch { return [] }
}

export function saveFavs(list: Favorite[]) {
  try { sessionStorage.setItem(FAV_KEY, JSON.stringify(list)) } catch { /* 저장 불가 */ }
}

export function genFavId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

// 글자 크기(localStorage). index.html이 로드 때 먼저 적용한다.
export const FONTSIZE_KEY = 'elevSubway.fontSize.v1'
export const FONTSIZE_LEVELS = ['normal', 'lg', 'xl', 'max'] as const
export type FontLevel = (typeof FONTSIZE_LEVELS)[number]

export function readFontSize(): FontLevel {
  let stored = 'normal'
  try { stored = localStorage.getItem(FONTSIZE_KEY) || 'normal' } catch { /* 저장소 사용 불가 */ }
  return (FONTSIZE_LEVELS as readonly string[]).includes(stored) ? (stored as FontLevel) : 'normal'
}

export function applyFontSize(level: string): FontLevel {
  const lv: FontLevel = (FONTSIZE_LEVELS as readonly string[]).includes(level) ? (level as FontLevel) : 'normal'
  if (lv === 'normal') document.documentElement.removeAttribute('data-fontsize')
  else document.documentElement.setAttribute('data-fontsize', lv)
  try { localStorage.setItem(FONTSIZE_KEY, lv) } catch { /* 저장소 사용 불가 */ }
  return lv
}
