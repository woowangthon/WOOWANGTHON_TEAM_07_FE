import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../../App'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
type Result = Record<string, unknown>
const result = (leaveAt: string): Result => ({ leaveAt, boardAt: '10:00', arriveAt: '10:30', live: true, route: {}, elevatorWarnings: [], limitations: [], warningStatus: 'UNCONFIRMED' })
const open = (destId = 'gangnam') => act(() => { (window.App!.openTime as (o: object) => void)({ originId: 'sindorim', destId, arriveBy: null }) })
const deferred = () => { let resolve!: (r: Result) => void; const promise = new Promise<Result>((r) => { resolve = r }); return { promise, resolve } }

it('API 응답 순서가 뒤집혀도 마지막 계산 결과를 유지한다', async () => {
  const first = deferred(), second = deferred()
  vi.spyOn(window.ApiClient, 'isApiMode').mockReturnValue(true)
  const calculate = vi.spyOn(window.TimeCalculator, 'calculateDepartureLive').mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  render(<App />)
  open()
  await waitFor(() => expect(calculate).toHaveBeenCalledTimes(1))
  open('gyodae')
  await waitFor(() => expect(calculate).toHaveBeenCalledTimes(2))
  await act(async () => second.resolve(result('09:20')))
  expect(document.querySelector('#timeResult .big-time')!.textContent).toContain('9:20')
  await act(async () => first.resolve(result('08:10')))
  expect(document.querySelector('#timeResult .big-time')!.textContent).toContain('9:20')
})

it('같은 역으로 새 계산을 요청하면 이전 응답을 버리고 로딩을 해제한다', async () => {
  const pending = deferred()
  vi.spyOn(window.ApiClient, 'isApiMode').mockReturnValue(true)
  const calculate = vi.spyOn(window.TimeCalculator, 'calculateDepartureLive').mockReturnValue(pending.promise)
  render(<App />)
  open()
  await waitFor(() => expect(calculate).toHaveBeenCalledOnce())
  open('sindorim')
  await act(async () => pending.resolve(result('08:10')))
  expect(document.querySelector('#timeResult .big-time')).toBeNull()
  expect(document.querySelector('#timeResult')!.textContent).toContain('같아요')
  expect((document.querySelector('#timeForm button[type="submit"]') as HTMLButtonElement).disabled).toBe(false)
})

it('API 실패는 오류로 표시하고 mock 계산으로 넘어가지 않는다', async () => {
  vi.spyOn(window.ApiClient, 'isApiMode').mockReturnValue(true)
  vi.spyOn(window.TimeCalculator, 'calculateDepartureLive').mockRejectedValue({ code: 'NETWORK' })
  const mock = vi.spyOn(window.TimeCalculator, 'calculateDeparture')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<App />)
  open()
  await waitFor(() => expect(document.querySelector('#timeResult [role="alert"]')).not.toBeNull())
  expect(mock).not.toHaveBeenCalled()
  expect(document.querySelector('#timeResult')!.textContent).toContain('연결')
})
