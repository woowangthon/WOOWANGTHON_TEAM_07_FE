import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AnswerText } from './AnswerText'

afterEach(cleanup)

describe('AI 답변 본문 렌더링 (#86)', () => {
  it('문단·제목·목록·굵은 글씨를 블록 요소로 나눈다', () => {
    const { container } = render(<AnswerText text={'## 강남역\n\n**1호선** 엘리베이터는 정상이에요.\n두 번째 줄\n\n- 첫째\n- 둘째\n\n1. 가\n2. 나'} />)
    expect(container.querySelector('h4.answer-heading')?.textContent).toBe('강남역')
    expect(container.querySelectorAll('p.answer-para')).toHaveLength(1)
    expect(container.querySelector('p.answer-para strong')?.textContent).toBe('1호선')
    expect(container.querySelector('p.answer-para br')).not.toBeNull()
    expect(container.querySelector('ul.answer-list')?.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('ol.answer-list')?.querySelectorAll('li')).toHaveLength(2)
  })

  it('엘리베이터 상태 단어는 색 클래스와 글자를 함께 가진다', () => {
    const { container } = render(<AnswerText text={'상태: 이용 불가, 일부 운행, 정상'} />)
    expect(container.querySelector('.answer-status.status-bad')?.textContent).toBe('이용 불가')
    expect(container.querySelector('.answer-status.status-warn')?.textContent).toBe('일부 운행')
    expect(container.querySelector('.answer-status.status-ok')?.textContent).toBe('정상')
  })

  it('HTML과 스크립트는 실행되지 않고 글자로 보인다', () => {
    const { container } = render(<AnswerText text={'<img src=x onerror="alert(1)"> **<script>alert(2)</script>**'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
    expect(container.querySelector('strong')?.textContent).toBe('<script>alert(2)</script>')
  })
})
