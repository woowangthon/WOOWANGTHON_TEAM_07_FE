// 마이페이지 "예상 이동 시간" 카드 (#87). 출발계산 화면의 개인 설정 UI를 옮겼다.
// 저장하기 전의 입력은 탭을 떠나거나 다시 들어오면 저장값으로 되돌린다(임시 입력 취소).
import { useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { DepartureMinutes } from '../time/DepartureMinutes'
import { defaultMinuteDraft, minuteError, minuteFields, type MinuteDraft } from '../time/departureMinuteValues'
import { clearPersonalMinutes, savePersonalMinutes, usePersonalMinutes } from '../time/personalMinutes'

export function DepartureSettingsCard({ active, onToast }: { active: boolean; onToast: (message: string) => void }) {
  const personal = usePersonalMinutes()
  const [draft, setDraft] = useState<MinuteDraft>(personal.draft)
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    setDraft(personal.draft)
    setShowErrors(false)
  }, [personal.draft, active])

  const dirty = JSON.stringify(draft) !== personal.key

  const save = () => {
    setShowErrors(true)
    if (minuteFields.some((field) => minuteError(draft[field.key], field.max))) return
    if (!savePersonalMinutes(draft)) { onToast('저장하지 못했어요. 다시 시도해 주세요.'); return }
    onToast('예상 이동 시간을 저장했어요')
  }
  const useDefault = () => {
    clearPersonalMinutes()
    setDraft(defaultMinuteDraft())
    setShowErrors(false)
    onToast('기본 예상 시간으로 되돌렸어요')
  }

  return (
    <div id="departureSettings" className="card mypage-section">
      <div className="mypage-section-header">
        <Icon name="schedule" className="mypage-section-icon" />
        <span className="mypage-section-title">예상 이동 시간</span>
      </div>
      <p className="departure-minutes-note" role="status">
        {personal.saved ? '저장한 설정으로 출발 시각을 계산해요.' : '지금은 기본값으로 계산해요. 바꾸고 저장하면 출발 시각 계산에 반영돼요.'}
      </p>
      <DepartureMinutes value={draft} onChange={setDraft} showErrors={showErrors} />
      <div className="departure-settings-actions">
        <button type="button" className="btn btn-sm btn-primary" disabled={!dirty} onClick={save}>저장</button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={useDefault}>저장값 지우고 기본값 쓰기</button>
      </div>
    </div>
  )
}
