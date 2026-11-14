import test from 'node:test'
import assert from 'node:assert/strict'
import { containsTime } from './llm-quality.mjs'

test('같은 시각의 24시간·한글·오후 표기를 인식한다', () => {
  for (const text of ['14:40에 출발', '**14시 40분** 출발', '오후 2시 40분에 출발']) assert(containsTime(text, '14:40'))
})
test('정오와 자정 및 오전을 구분한다', () => {
  assert(containsTime('오전 12시 05분', '00:05'))
  assert(containsTime('오후 12시 05분', '12:05'))
  assert(!containsTime('오전 2시 40분', '14:40'))
})
test('틀린 시각과 범위 밖 값을 통과시키지 않는다', () => {
  for (const text of ['14:41', '24:40', '14:99', '14시 출발', '114:40', '14:400', '오후 14시 40분']) assert(!containsTime(text, '14:40'))
})
