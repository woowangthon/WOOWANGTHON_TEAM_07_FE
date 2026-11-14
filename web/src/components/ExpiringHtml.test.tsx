import { act, cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ExpiringHtml } from './ExpiringHtml'

afterEach(() => { cleanup(); vi.useRealTimers() })
it('각 경로의 근거가 만료되면 해당 안내만 철회하고 마지막 추천 제목을 제거한다', () => {
  vi.useFakeTimers()
  vi.setSystemTime(10000)
  const card = (expiry: number) => '<article class="accessible-route--verified" data-valid-until="' + expiry + '"><ol class="accessible-route-itinerary"><li>이동 안내</li></ol></article>'
  const { container } = render(<ExpiringHtml html={'<section class="accessible-routes"><h3 class="accessible-routes-heading">추천 대체 경로</h3>' + card(11000) + card(13000) + '</section>'} />)
  expect(container.querySelectorAll('.accessible-route--verified')).toHaveLength(2)
  act(() => vi.advanceTimersByTime(1001))
  expect(container.querySelectorAll('.accessible-route--verified')).toHaveLength(1)
  expect(container.querySelector('.accessible-routes-heading')).not.toBeNull()
  act(() => vi.advanceTimersByTime(2000))
  expect(container.querySelector('.accessible-route-itinerary')).toBeNull()
  expect(container.querySelector('.accessible-routes-heading')).toBeNull()
  expect(container.textContent).toContain('만료')
})
