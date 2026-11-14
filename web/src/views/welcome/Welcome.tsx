import { useEffect, useRef, useState } from 'react'
import App from '../../App'
import { applyPreferences, defaultPreferences, readPreferences, savePreferences, type Preferences } from './preferences'
import { TABS, type TabName } from '../../app/context'
import { readFontSize } from '../account/favorites'
import './welcome.css'

type Page = 'landing' | 'needs' | 'home' | 'app'
const options = [
  { key: 'simple', title: '복잡한 화면이 어려워요', description: '지도 대신 큰 기능 버튼이 있는 첫 화면으로 시작해요.' },
  { key: 'contrast', title: '글자와 배경이 또렷하면 좋겠어요', description: '배경과 글자의 대비를 높이고 테두리를 선명하게 해요.' },
  { key: 'touch', title: '작은 버튼을 누르기 어려워요', description: '주요 버튼과 입력칸을 더 넉넉하게 바꿔요.' },
  { key: 'motion', title: '화면 움직임이 불편해요', description: '전환 효과와 반복되는 움직임을 줄여요.' },
  { key: 'stepFree', title: '계단 이용이 어려워요', description: '첫 화면에서 엘리베이터 확인을 먼저 안내해요.' },
] as const
const fontOptions = [ ['normal', '보통'], ['lg', '크게'], ['xl', '아주 크게'], ['max', '최대'] ] as const
const tasks: { tab: TabName; number: string; title: string; description: string }[] = [
  { tab: 'elevator', number: '01', title: '엘리베이터 확인', description: '이용할 역의 설비 상태를 확인해요' },
  { tab: 'time', number: '02', title: '출발 시각 계산', description: '출발역과 도착역을 선택해요' },
  { tab: 'map', number: '03', title: '지하철 노선도', description: '노선과 역을 찾아봐요' },
  { tab: 'chat', number: '04', title: '궁금한 점 물어보기', description: '글로 질문하고 답변을 읽어요' },
]

export default function Welcome() {
  const [saved, setSaved] = useState(readPreferences)
  const [draft, setDraft] = useState<Preferences>(() => saved || defaultPreferences())
  const initial = useRef(draft)
  const [page, setPage] = useState<Page>(() => saved ? (saved.simple || saved.stepFree ? 'home' : 'app') : 'landing')
  const [appStarted, setAppStarted] = useState(() => !!saved && !saved.simple && !saved.stepFree)
  const [returnPage, setReturnPage] = useState<Page>('landing')
  const [tab, setTab] = useState<TabName>('map')
  const [notice, setNotice] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const setupHeading = useRef<HTMLHeadingElement>(null)
  const appEntry = useRef<HTMLButtonElement>(null)

  useEffect(() => { applyPreferences(draft) }, [draft])
  useEffect(() => {
    if (page === 'app') {
      const switchTab = window.App?.switchTab
      if (typeof switchTab === 'function') switchTab(tab)
      appEntry.current?.focus()
    }
    else if (page === 'needs') setupHeading.current?.focus()
    else heading.current?.focus()
  }, [page, tab])

  const edit = () => {
    const current = { ...draft, font: readFontSize() }
    initial.current = current
    setDraft(current)
    if (page === 'app') {
      const active = document.body.getAttribute('data-active-tab')
      if (TABS.includes(active as TabName)) setTab(active as TabName)
    }
    setReturnPage(page)
    setPage('needs')
  }
  const finish = (value: Preferences) => {
    const persisted = savePreferences(value)
    setSaved(value)
    setDraft(value)
    setNotice(persisted ? '' : '설정은 이번 이용에 적용했어요. 이 브라우저에서는 다음 방문까지 저장할 수 없어요.')
    if (!value.simple && !value.stepFree) setAppStarted(true)
    setPage(value.simple || value.stepFree ? 'home' : 'app')
  }
  const open = (next: TabName) => { setTab(next); setAppStarted(true); setPage('app') }

  return <>
    <div className="welcome-app" hidden={page !== 'app'}>
    {appStarted && <App welcomeControl={
      <div className="welcome-return">
        <button ref={appEntry} type="button" onClick={edit} aria-label="내 화면 바꾸기 · 시작 화면에서 설정">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 17h16M9 4v6m6 4v6" strokeLinecap="round" /></svg>
          <span>내 화면 바꾸기</span><span aria-hidden="true">›</span>
        </button>
      </div>
    } />}
    {notice && <p className="access-notice" role="status">{notice}</p>}
    </div>

    {page !== 'app' && (
    <div className="welcome-shell">
      <header className="welcome-header">
        <a className="welcome-brand" href="#" onClick={(event) => { event.preventDefault(); setPage(saved ? 'home' : 'landing') }}>
          <span className="welcome-mark" aria-hidden="true">↗</span> 엘리베이터 지하철
        </a>
        <span className="welcome-tag">모두의 편안한 이동</span>
      </header>
      <main className="welcome-main" data-page={page}>
        {(page === 'landing' || page === 'needs') && <section className="welcome-intro">
          <div className="welcome-eyebrow">나에게 맞는 지하철 이용 안내</div>
          <h1 ref={heading} tabIndex={-1}>이동의 시작을,<br /><span>조금 더 편안하게.</span></h1>
          <p className="welcome-lead">역의 엘리베이터를 확인하고 출발 시각을 알아보세요.<br />읽기 편한 글씨와 누르기 쉬운 화면으로 함께할게요.</p>
          {page === 'landing' && <div className="welcome-actions">
            <button className="welcome-primary" type="button" onClick={edit}>나에게 맞게 시작하기 <span aria-hidden="true">→</span></button>
            <button className="welcome-secondary" type="button" onClick={() => finish(defaultPreferences())}>설정 없이 바로 이용하기</button>
          </div>}
          <p className="welcome-hint">로그인 없이 이용해요. 설정은 언제든 바꿀 수 있어요.</p>
        </section>}

        {page === 'needs' && <section className="welcome-setup" aria-labelledby="setup-title">
          <div className="welcome-eyebrow">화면 맞춤 설정 · 선택 사항</div>
          <h2 id="setup-title" ref={setupHeading} tabIndex={-1}>나에게 편한 화면을 골라보세요</h2>
          <p className="welcome-lead" id="needs-help">필요한 도움을 여러 개 골라도 괜찮아요.<br />나이나 장애 정보를 입력하지 않아도 돼요.</p>
          <form onSubmit={(event) => { event.preventDefault(); finish(draft) }} aria-describedby="needs-help">
            <fieldset className="welcome-fieldset"><legend>1. 읽기 편한 글자 크기</legend>
              <div className="welcome-fonts">{fontOptions.map(([value, label]) => <label key={value}><input type="radio" name="font" value={value} checked={draft.font === value} onChange={() => setDraft({ ...draft, font: value })} /><span>{label}</span></label>)}</div>
              <p className="welcome-sample">이 글씨가 편하게 보이시나요?</p>
            </fieldset>
            <fieldset className="welcome-fieldset"><legend>2. 필요한 도움을 골라주세요</legend>
              <div className="welcome-options">{options.map((option) => <label className="welcome-option" key={option.key}>
                <input type="checkbox" checked={draft[option.key]} onChange={(event) => setDraft({ ...draft, [option.key]: event.target.checked })} />
                <span><strong>{option.title}</strong><span>{option.description}</span></span>
              </label>)}</div>
            </fieldset>
            <aside className="welcome-help"><h2>지금 선택한 화면</h2><p aria-live="polite">글자 {fontOptions.find(([value]) => value === draft.font)?.[1]} · {draft.contrast ? '높은 대비' : '기본 대비'} · {draft.simple || draft.stepFree ? '쉬운 첫 화면' : '노선도로 시작'}</p><p>선택한 설정만 이 브라우저에 저장해요. 서버로 보내지 않아요.</p></aside>
            <div className="welcome-actions"><button className="welcome-primary" type="submit">이 설정으로 이용하기 <span aria-hidden="true">→</span></button><button className="welcome-secondary" type="button" onClick={() => setDraft({ ...defaultPreferences(), font: 'normal' })}>기본 설정으로 되돌리기</button></div>
            <button className="welcome-back" type="button" onClick={() => { setDraft(initial.current); setPage(returnPage) }}>← 돌아가기</button>
          </form>
        </section>}

        {page === 'landing' && <>
          <div className="welcome-features" aria-label="이용할 수 있는 기능">
            {tasks.slice(0, 3).map((task) => <article key={task.tab}><span className="welcome-number">{task.number}</span><h2>{task.title}</h2><p>{task.description}</p></article>)}
          </div>
          <section className="welcome-help" aria-labelledby="welcome-help-title"><h2 id="welcome-help-title">누구나, 각자의 속도로</h2><p>어르신, 휠체어·유모차 이용자, 작은 글씨나 복잡한 화면이 불편한 분까지. 필요한 도움을 직접 골라보세요.</p></section>
        </>}

        {page === 'home' && <>
          <div className="welcome-eyebrow">쉬운 첫 화면</div>
          <h1 ref={heading} tabIndex={-1}>오늘은 어디로<br /><span>이동하시나요?</span></h1>
          <p className="welcome-lead">하고 싶은 일을 골라주세요.</p>
          {notice && <p role="status">{notice}</p>}
          {draft.stepFree && <aside className="welcome-help"><h2>이동 전에 엘리베이터부터 확인해요</h2><p>설비 상태만으로 계단 없는 전체 경로를 보장할 수는 없어요. 이용할 출입구와 환승 구간도 확인해 주세요.</p></aside>}
          <div className="welcome-tasks">{tasks.map((task) => <button type="button" key={task.tab} onClick={() => open(task.tab)}><span className="welcome-number" aria-hidden="true">{task.number}</span><span><strong>{task.title}</strong><span>{task.description}</span></span><span aria-hidden="true">→</span></button>)}</div>
          <button className="welcome-secondary" type="button" onClick={edit}>내 화면 바꾸기</button>
        </>}
      </main>
      <footer className="welcome-footer">서울 지하철 1–8호선 · 설비 정보가 없는 경우 ‘정보 없음’으로 안내해요.</footer>
    </div>
    )}
  </>
}
