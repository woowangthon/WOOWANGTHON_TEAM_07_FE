import { useEffect, useState } from 'react'
import { pad2 } from '../lib/time'

function clockText(): string {
  const d = new Date()
  return d.getHours() + ':' + pad2(d.getMinutes())
}

/** 폰 상단 상태바. 시계(#statusTime)는 20초마다 갱신한다. */
export function StatusBar() {
  const [time, setTime] = useState(clockText)
  useEffect(() => {
    const id = setInterval(() => setTime(clockText()), 20000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="status-bar">
      <span id="statusTime">{time}</span>
      <span className="status-icons" aria-hidden="true"><span className="ms">signal_cellular_alt</span><span className="ms">wifi</span><span className="ms">battery_full</span></span>
    </div>
  )
}
