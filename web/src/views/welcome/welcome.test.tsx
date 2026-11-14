import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Welcome from './Welcome'
import { PREFERENCES_KEY, readPreferences } from './preferences'

beforeEach(() => { localStorage.clear() })
afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.removeAttribute('data-fontsize')
  for (const key of ['contrast', 'touch', 'motion']) document.documentElement.removeAttribute(`data-access-${key}`)
  vi.restoreAllMocks()
})

it('첫 안내에서 여러 도움을 조합하고 저장하면 다음 방문에도 쉬운 화면으로 시작한다', () => {
  const first = render(<Welcome />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('이동의 시작')
  fireEvent.click(screen.getByRole('button', { name: /나에게 맞게 시작/ }))
  fireEvent.click(screen.getByRole('radio', { name: '아주 크게' }))
  fireEvent.click(screen.getByRole('checkbox', { name: /복잡한 화면/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: /글자와 배경/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: /작은 버튼/ }))
  fireEvent.click(screen.getByRole('button', { name: /이 설정으로 이용/ }))
  expect(document.documentElement.getAttribute('data-fontsize')).toBe('xl')
  expect(document.documentElement.hasAttribute('data-access-contrast')).toBe(true)
  expect(readPreferences()).toMatchObject({ simple: true, contrast: true, touch: true, font: 'xl' })
  expect(screen.getByRole('button', { name: /엘리베이터 확인/ })).toBeTruthy()
  first.unmount()
  render(<Welcome />)
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('오늘은 어디로')
})

it('편집 취소는 저장한 설정을 복구하고 기본값 되돌리기는 글씨도 초기화한다', () => {
  render(<Welcome />)
  fireEvent.click(screen.getByRole('button', { name: /나에게 맞게 시작/ }))
  fireEvent.click(screen.getByRole('radio', { name: '최대' }))
  fireEvent.click(screen.getByRole('button', { name: /돌아가기/ }))
  expect(document.documentElement.hasAttribute('data-fontsize')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: /나에게 맞게 시작/ }))
  fireEvent.click(screen.getByRole('radio', { name: '최대' }))
  fireEvent.click(screen.getByRole('button', { name: /기본 설정으로/ }))
  expect(document.documentElement.hasAttribute('data-fontsize')).toBe(false)
})

it('깨진 저장값은 첫 방문으로 처리하고 저장이 막혀도 이용할 수 있다', () => {
  localStorage.setItem(PREFERENCES_KEY, '{broken')
  expect(readPreferences()).toBeNull()
  render(<Welcome />)
  fireEvent.click(screen.getByRole('button', { name: /나에게 맞게 시작/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: /계단 이용/ }))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  fireEvent.click(screen.getByRole('button', { name: /이 설정으로 이용/ }))
  expect(screen.getByRole('status').textContent).toContain('이번 이용에 적용')
  expect(screen.getByText(/계단 없는 전체 경로를 보장/)).toBeTruthy()
})
