// 로그인/마이페이지 탭(#view-login). app.js 로그인 구간(initLoginTab/renderLoginTab/즐겨찾기/글자 크기)을 옮겼다.
// 탭바의 "로그인"/"마이페이지" 글자는 useApp().setLoginTabLabel로 바꾼다.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import { Auth } from '../../legacy/services'
import { useSession, touchAuth } from './authStore'
import {
  applyFontSize, genFavId, loadFavs, readFontSize, saveFavs,
  type Favorite, type FontLevel,
} from './favorites'

const FONT_CHIPS: { level: FontLevel; label: string }[] = [
  { level: 'normal', label: '보통' }, { level: 'lg', label: '크게' },
  { level: 'xl', label: '아주 크게' }, { level: 'max', label: '최대' },
]
const PROV_LABELS: Record<string, string> = { google: 'Google', kakao: '카카오' }

function FavRenameRow({ fav, onDone, onToast }: { fav: Favorite; onDone: () => void; onToast: (m: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  const commit = () => {
    const val = (ref.current?.value ?? '').trim()
    if (!val) { onToast('이름을 입력해 주세요'); ref.current?.focus(); return }
    const updated = loadFavs()
    for (const f of updated) { if (f.id === fav.id) { f.alias = val; break } }
    saveFavs(updated)
    onDone()
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') onDone()
  }
  return (
    <>
      <input ref={ref} type="text" className="fav-rename-input" defaultValue={fav.alias || fav.placeName} maxLength={20} onKeyDown={onKey} />
      <button type="button" className="btn btn-sm btn-primary" onClick={commit}>저장</button>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onDone}>취소</button>
    </>
  )
}

export function AccountView() {
  const { currentTab, toast, setLoginTabLabel, openSheet, closeSheet, getSheet } = useApp()
  const session = useSession()
  const checking = session === null
  const signedIn = !!(session && typeof session === 'object')

  const [favs, setFavs] = useState<Favorite[]>(() => loadFavs())
  const [favEditMode, setFavEditMode] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [nameEditing, setNameEditing] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [fontSize, setFontSize] = useState<FontLevel>(() => readFontSize())
  const addInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // 글자 크기: 시작 때 저장값을 적용(index.html이 먼저 적용하지만 원본 initFontSize도 다시 쓴다)
  useEffect(() => { applyFontSize(readFontSize()) }, [])
  const pickFont = (level: string) => setFontSize(applyFontSize(level))

  // renderLoginTab: 세션이 바뀔 때마다
  useEffect(() => {
    if (session === null) return
    if (!session) {
      saveFavs([])
      setFavs([])
      setAddOpen(false)
      setNameEditing(false)
      const s = getSheet()
      if (s.open && (s.mode === 'favDetail' || s.mode === 'filter')) closeSheet()
    } else {
      setFavs(loadFavs())
    }
    setFavEditMode(false)
    setRenamingId(null)
  }, [session, getSheet, closeSheet])

  useLayoutEffect(() => { setLoginTabLabel(signedIn ? '마이페이지' : '로그인') }, [signedIn, setLoginTabLabel])

  const refreshFavs = () => setFavs(loadFavs())

  const openFavAdd = () => {
    if (!Auth()?.getSession()) return
    setAddValue('')
    setAddOpen(true)
    requestAnimationFrame(() => addInputRef.current?.focus())
  }
  const closeFavAdd = () => { setAddOpen(false); setAddValue('') }
  const commitFavAdd = () => {
    if (!Auth()?.getSession()) return
    const val = addValue.trim()
    if (!val) { toast('장소 이름을 입력해 주세요'); addInputRef.current?.focus(); return }
    const list = loadFavs()
    list.push({ id: genFavId(), placeName: val, alias: '' })
    saveFavs(list)
    closeFavAdd()
    refreshFavs()
    toast('"' + val + '" 즐겨찾기에 추가했어요')
  }
  const toggleFavEdit = () => {
    setFavEditMode((m) => !m)
    setRenamingId(null)
    closeFavAdd()
    refreshFavs()
  }
  const deleteFav = (id: string) => {
    const removed = loadFavs().find((f) => f.id === id)
    saveFavs(loadFavs().filter((f) => f.id !== id))
    refreshFavs()
    if (removed) toast('"' + (removed.alias || removed.placeName) + '" 즐겨찾기에서 삭제했어요')
  }
  const openFav = (id: string) => {
    const target = loadFavs().find((f) => f.id === id)
    if (target) openSheet('favDetail', { fav: target })
  }

  // 이름 편집
  const profileName = signedIn ? (session as { name?: string }).name || '게스트 사용자' : '게스트 사용자'
  const startNameEdit = () => {
    setNameValue(profileName)
    setNameEditing(true)
    requestAnimationFrame(() => nameInputRef.current?.focus())
  }
  const cancelNameEdit = () => setNameEditing(false)
  const commitNameEdit = () => {
    const val = (nameInputRef.current?.value ?? nameValue).trim()
    if (!val) { toast('이름을 입력해 주세요'); nameInputRef.current?.focus(); return }
    const sess = Auth()?.getSession() as (Record<string, unknown> & { isDemoUser?: boolean }) | null | false | undefined
    if (sess && sess.isDemoUser) {
      sess.name = val
      try { sessionStorage.setItem('elevSubway.demoAuth.v1', JSON.stringify(sess)) } catch { /* 저장 불가 */ }
      touchAuth()
      cancelNameEdit()
      toast('이름을 변경했어요')
    } else if (sess) {
      console.warn('[Auth:real] 사용자 이름 변경은 아직 백엔드 API가 연결되지 않았습니다. PATCH /api/auth/profile { displayName } 구현 필요.')
      toast('백엔드 연결 후 저장됩니다 (현재 데모)')
      cancelNameEdit()
    }
  }

  const provider = signedIn ? (session as { provider?: string }).provider || '' : ''
  const enter = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); fn() }
  }

  return (
    <section
      id="view-login"
      className={'view' + (currentTab === 'login' ? ' active' : '')}
      data-view="login"
      onClick={(e) => {
        const target = e.target as Element
        const provBtn = target.closest('[data-provider]')
        if (provBtn && provBtn.classList.contains('auth-btn')) { Auth()?.login(provBtn.getAttribute('data-provider') || ''); return }
        if (target.closest('[data-auth="signout"]')) {
          Promise.resolve(Auth()?.logout()).then(() => toast('로그아웃했습니다'))
        }
      }}
    >
      <div className="view-scroll">

        {/* ① 비로그인 상태 */}
        <div id="loginSection">
          <div id="authGuest" className="auth-state" hidden={checking || signedIn}>
            <h2 className="view-title">로그인</h2>
            <div className="card auth-card">
              <p className="card-title">계정으로 시작하기</p>
              <p className="card-sub">집·회사 위치와 즐겨찾기를 저장할 수 있습니다.</p>
              <div className="auth-buttons">
                <button className="auth-btn auth-google" type="button" data-provider="google">
                  <span className="auth-btn-logo auth-google-logo" aria-hidden="true">G</span>
                  Google로 시작하기
                </button>
                <button className="auth-btn auth-kakao" type="button" data-provider="kakao">
                  <span className="auth-btn-logo auth-kakao-logo" aria-hidden="true">K</span>
                  카카오로 시작하기
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ② 로그인됨: 마이페이지 */}
        <div id="mypageSection">
          <div id="authUser" className="auth-state" hidden={checking || !signedIn}>
            <h2 className="view-title">마이페이지</h2>

            {/* 프로필 */}
            <div className="card auth-card auth-profile-card">
              <div className="auth-profile">
                <div id="authProfileAvatar" className="auth-avatar" aria-hidden="true" data-provider={provider || undefined}>
                  {profileName.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="auth-profile-info">
                  <div className="auth-profile-name-row">
                    <p id="authProfileName" className="auth-profile-name" hidden={nameEditing}>{profileName}</p>
                    <div id="nameEditRow" className="name-edit-row" hidden={!nameEditing}>
                      <input
                        id="nameEditInput" ref={nameInputRef} type="text" className="name-edit-input" autoComplete="off" maxLength={30}
                        aria-label="사용자 이름" value={nameValue} onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => { enter(commitNameEdit)(e); if (e.key === 'Escape') cancelNameEdit() }}
                      />
                      <button id="nameEditConfirm" className="btn btn-sm btn-primary" type="button" onClick={commitNameEdit}>저장</button>
                      <button id="nameEditCancel" className="btn btn-sm btn-ghost" type="button" onClick={cancelNameEdit}>취소</button>
                    </div>
                    <button id="editNameBtn" className="btn btn-sm btn-ghost" type="button" aria-label="이름 편집" hidden={nameEditing} onClick={startNameEdit}>편집</button>
                  </div>
                  <p className="auth-provider-sub">
                    <span id="authProviderBadge" className="auth-provider-badge" data-provider={provider}>{PROV_LABELS[provider] || provider}</span>
                    <span>계정으로 로그인됨</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 즐겨찾기 장소 */}
            <div id="favSection" className="card mypage-section">
              <div className="mypage-section-header">
                <Icon name="star" className="mypage-section-icon" />
                <span className="mypage-section-title">즐겨찾기 장소</span>
                <div className="fav-header-actions">
                  <button id="favAddBtn" className="btn btn-sm btn-ghost" type="button" onClick={openFavAdd}><Icon name="add" />추가</button>
                  <button id="favEditBtn" className="btn btn-sm btn-ghost" type="button" onClick={toggleFavEdit}>{favEditMode ? '완료' : '수정'}</button>
                </div>
              </div>
              {/* 추가 입력 행 (기본 숨김) */}
              <div id="favAddRow" className="fav-add-row" hidden={!addOpen}>
                <input
                  id="favAddInput" ref={addInputRef} type="text" className="fav-rename-input" placeholder="장소 이름 입력" autoComplete="off" maxLength={20}
                  value={addValue} onChange={(e) => setAddValue(e.target.value)}
                  onKeyDown={(e) => { enter(commitFavAdd)(e); if (e.key === 'Escape') closeFavAdd() }}
                />
                <button id="favAddConfirm" className="btn btn-sm btn-primary" type="button" onClick={commitFavAdd}>저장</button>
                <button id="favAddCancel" className="btn btn-sm btn-ghost" type="button" onClick={closeFavAdd}>취소</button>
              </div>
              <ul id="favList" className="fav-list">
                {favs.map((fav) => {
                  const renaming = renamingId === fav.id && favEditMode
                  return (
                    <li key={fav.id} className={'fav-item' + (favEditMode ? ' editing' : '')} data-fav-id={fav.id}>
                      <div className="fav-info fav-name" style={renaming ? { display: 'none' } : undefined}>
                        <span className="fav-primary">{fav.alias || fav.placeName}</span>
                      </div>
                      {favEditMode && (
                        <div className="fav-edit-actions" style={renaming ? { display: 'none' } : undefined}>
                          <button className="btn btn-sm fav-rename-btn" type="button" data-fav-rename={fav.id} onClick={() => setRenamingId(fav.id)}>변경</button>
                          <button className="btn btn-sm fav-delete-btn" type="button" data-fav-delete={fav.id} onClick={() => deleteFav(fav.id)}>삭제</button>
                        </div>
                      )}
                      {!favEditMode && (
                        <button className="fav-detail-btn" type="button" data-fav-open={fav.id} aria-label="장소 상세 보기" onClick={() => openFav(fav.id)}>
                          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      )}
                      {renaming && (
                        <FavRenameRow fav={fav} onToast={toast} onDone={() => { setRenamingId(null); refreshFavs() }} />
                      )}
                    </li>
                  )
                })}
              </ul>
              <p id="favEmptyMsg" className="mypage-empty-hint" hidden={favs.length > 0}>즐겨찾기한 장소가 없습니다.</p>
            </div>

            {/* 글자 크기 설정 */}
            <div className="card mypage-section">
              <div className="mypage-section-header">
                <Icon name="format_size" className="mypage-section-icon" />
                <span className="mypage-section-title">글자 크기</span>
              </div>
              <div className="fontsize-chips">
                {FONT_CHIPS.map((c) => (
                  <button
                    key={c.level} type="button" data-fontsize={c.level}
                    className={'fontsize-chip' + (fontSize === c.level ? ' active' : '')} aria-pressed={fontSize === c.level}
                    onClick={() => pickFont(c.level)}
                  >{c.label}</button>
                ))}
              </div>
            </div>

            {/* 로그아웃 */}
            <button className="btn btn-ghost btn-block auth-signout-btn" type="button" data-auth="signout">로그아웃</button>
          </div>
        </div>

        {/* ③ 세션 확인 중 (real 모드 초기) */}
        <div id="authLoading" className="auth-loading" hidden={!checking}>
          <span className="auth-loading-dot"></span>
        </div>

      </div>
    </section>
  )
}
