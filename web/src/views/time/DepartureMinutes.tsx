import './departure-minutes.css'
import { defaultMinuteDraft, minuteError, minuteFields, type MinuteDraft } from './departureMinuteValues'

export function DepartureMinutes({ value, onChange, showErrors }: {
  value: MinuteDraft; onChange: (next: MinuteDraft) => void; showErrors: boolean
}) {
  const valid = minuteFields.every((f) => !minuteError(value[f.key], f.max))
  return <details className="departure-minutes" id="departureMinutes">
    <summary>
      <span>나에게 맞는 이동 시간 <span className="departure-minutes-optional">선택</span></span>
      <span className="departure-minutes-summary">{valid
        ? `역까지 ${value.walkToStationMinutes}분 · 역 안 ${value.stationEntryMinutes}분 · 하차 후 ${value.exitWalkMinutes}분 · 여유 ${value.bufferMinutes}분`
        : '입력한 시간을 확인해 주세요'}</span>
    </summary>
    <p className="departure-minutes-note">기본값은 추정 시간이에요. 평소 걸리는 시간에 맞춰 바꿔 주세요. 몸 상태나 장애 정도는 입력하지 않아도 돼요.</p>
    <fieldset className="departure-buffer-options">
      <legend>여유 시간을 간편하게 선택</legend>
      <div>{[{ minutes: '5', label: '기본 5분' }, { minutes: '10', label: '넉넉히 10분' }, { minutes: '15', label: '더 넉넉히 15분' }].map((option) =>
        <button type="button" key={option.minutes} className="btn btn-sm" aria-pressed={value.bufferMinutes === option.minutes}
          onClick={() => onChange({ ...value, bufferMinutes: option.minutes })}>{option.label}</button>)}</div>
    </fieldset>
    <div className="departure-minutes-fields">{minuteFields.map((field) => {
      const error = showErrors ? minuteError(value[field.key], field.max) : ''
      return <div className="departure-minutes-field" key={field.key}>
        <label htmlFor={field.key}>{field.label} (분)</label>
        <input id={field.key} type="number" inputMode="numeric" min="0" max={field.max} step="1" required
          value={value[field.key]} aria-invalid={!!error} aria-describedby={`${field.key}Hint${error ? ` ${field.key}Error` : ''}`}
          onChange={(e) => onChange({ ...value, [field.key]: e.target.value })} />
        <span id={`${field.key}Hint`} className="departure-minutes-note">{field.hint} · 0~{field.max}분</span>
        {error ? <span id={`${field.key}Error`} className="departure-minutes-error">{error}</span> : null}
      </div>
    })}</div>
    <button type="button" className="btn btn-ghost" onClick={() => onChange(defaultMinuteDraft())}>기본 시간으로 되돌리기</button>
    <p className="departure-minutes-note">입력한 시간은 이 화면에서만 유지돼요. 이동 속도나 환승 시간을 자동으로 판단하지 않아요.</p>
  </details>
}
