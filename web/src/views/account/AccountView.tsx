// 로그인/마이페이지 탭(#view-login). app.js 로그인 구간(initLoginTab/renderLoginTab/즐겨찾기/글자 크기)을 옮겼다.
// 탭바의 "로그인"/"마이페이지" 글자는 useApp().setLoginTabLabel로 바꾼다.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import { Auth } from '../../legacy/services'
import { useSession, touchAuth } from './authStore'
import './mypage-edit.css'
import { SpeechSettings, useChatSpeech } from '../chat/voice/tts'
import { DepartureSettingsCard } from './DepartureSettingsCard'
import {
  applyFontSize, loadFavs, readFontSize, useFavorites, realAuth,
  addFavorite, renameFavorite, deleteFavorite, fetchFavorites, clearFavorites,
  type Favorite, type FontLevel,
} from './favorites'

const FONT_CHIPS: { level: FontLevel; label: string }[] = [
  { level: 'normal', label: '보통' }, { level: 'lg', label: '크게' },
  { level: 'xl', label: '아주 크게' }, { level: 'max', label: '최대' },
]
const PROV_LABELS: Record<string, string> = { google: 'Google', kakao: '카카오' }

function FavRenameRow({ fav, onDone, onToast }: { fav: Favorite; onDone: () => void; onToast: (m: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  const commit = async () => {
    const val = (ref.current?.value ?? '').trim()
    if (!val) { onToast('이름을 입력해 주세요'); ref.current?.focus(); return }
    if (savingRef.current) return
    savingRef.current = true
    try { await renameFavorite(fav.id, val); onDone() }
    catch (error) { onToast(error instanceof Error ? error.message : '저장하지 못했어요.') }
    finally { savingRef.current = false }
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

function FavRenameRowWrap(props: { fav: Favorite; onDone: () => void; onToast: (m: string) => void }) {
  return <div className="fav-inline-row fav-rename-wrap"><FavRenameRow {...props} /></div>
}

export function AccountView() {
  const { currentTab, toast, setLoginTabLabel, openSheet, closeSheet, getSheet } = useApp()
  const session = useSession()
  const checking = session === null
  const signedIn = !!(session && typeof session === 'object')

  const favs = useFavorites()
  const speech = useChatSpeech()
  const [favError, setFavError] = useState('')
  const [favLoading, setFavLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [favEditMode, setFavEditMode] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [nameEditing, setNameEditing] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [fontSize, setFontSize] = useState<FontLevel>(() => readFontSize())
  const addInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    const error = url.searchParams.get('auth_error')
    if (!error) return
    toast(error === 'cancelled' ? '로그인을 취소했어요.' : '로그인하지 못했어요. 다시 시도해 주세요.')
    url.searchParams.delete('auth_error')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }, [toast])

  // 글자 크기: 시작 때 저장값을 적용(index.html이 먼저 적용하지만 원본 initFontSize도 다시 쓴다)
  useEffect(() => { applyFontSize(readFontSize()) }, [])
  const pickFont = (level: string) => setFontSize(applyFontSize(level))

  // renderLoginTab: 세션이 바뀔 때마다
  useEffect(() => {
    let cancelled = false
    if (session === null) return
    setFavError('')
    if (!session) {
      clearFavorites()
      setFavLoading(false)
      setAddOpen(false)
      setNameEditing(false)
      const s = getSheet()
      if (s.open && (s.mode === 'favDetail' || s.mode === 'filter')) closeSheet()
    } else if (realAuth()) {
      setFavLoading(true)
      fetchFavorites().catch((error) => {
        if (!cancelled) setFavError(error instanceof Error ? error.message : '즐겨찾기를 불러오지 못했어요.')
      }).finally(() => { if (!cancelled) setFavLoading(false) })
    }
    setFavEditMode(false)
    setRenamingId(null)
    return () => { cancelled = true }
  }, [session, getSheet, closeSheet])

  useLayoutEffect(() => { setLoginTabLabel(signedIn ? '마이페이지' : '로그인') }, [signedIn, setLoginTabLabel])

  // 다른 탭으로 가면 편집 상태를 닫는다. 저장하지 않은 임시 입력은 버리고, 저장된 이름·즐겨찾기는 그대로 둔다.
  useEffect(() => {
    if (currentTab === 'login') return
    setNameEditing(false)
    setAddOpen(false)
    setAddValue('')
    setFavEditMode(false)
    setRenamingId(null)
  }, [currentTab])

  const refreshFavs = () => {
    if (!realAuth()) return
    setFavError('')
    setFavLoading(true)
    fetchFavorites().catch((error) => setFavError(error instanceof Error ? error.message : '즐겨찾기를 불러오지 못했어요.'))
      .finally(() => setFavLoading(false))
  }

  const openFavAdd = () => {
    if (!Auth()?.getSession()) return
    setAddValue('')
    setAddOpen(true)
    requestAnimationFrame(() => addInputRef.current?.focus())
  }
  const closeFavAdd = () => { setAddOpen(false); setAddValue('') }
  const commitFavAdd = async () => {
    if (!Auth()?.getSession()) return
    const val = addValue.trim()
    if (!val) { toast('장소 이름을 입력해 주세요'); addInputRef.current?.focus(); return }
    if (savingRef.current || favLoading || favError) return
    savingRef.current = true
    setSaving(true)
    try {
      await addFavorite(val)
      closeFavAdd()
      toast('"' + val + '" 즐겨찾기에 추가했어요')
    } catch (error) { toast(error instanceof Error ? error.message : '즐겨찾기를 저장하지 못했어요.') }
    finally { savingRef.current = false; setSaving(false) }
  }
  const toggleFavEdit = () => {
    setFavEditMode((m) => !m)
    setRenamingId(null)
    closeFavAdd()
  }
  const deleteFav = async (id: string) => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    const removed = loadFavs().find((f) => f.id === id)
    try {
      await deleteFavorite(id)
      if (removed) toast('"' + (removed.alias || removed.placeName) + '" 즐겨찾기에서 삭제했어요')
    } catch (error) { toast(error instanceof Error ? error.message : '즐겨찾기를 삭제하지 못했어요.') }
    finally { savingRef.current = false; setSaving(false) }
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
      if (savingRef.current) return
      savingRef.current = true
      setSaving(true)
      Auth()?.updateProfile?.(val).then(() => { cancelNameEdit(); toast('이름을 변경했어요') })
        .catch((error) => toast(error instanceof Error ? error.message : '이름을 저장하지 못했어요.'))
        .finally(() => { savingRef.current = false; setSaving(false) })
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
          Promise.resolve(Auth()?.logout()).then((ok) => toast(ok ? '로그아웃했습니다' : '로그아웃하지 못했어요. 다시 시도해 주세요.'))
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
              <p className="card-sub">자주 이용하는 역과 장소를 계정에 저장할 수 있습니다.</p>
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
                    <div id="nameEditRow" className="name-edit-row fav-inline-row" hidden={!nameEditing}>
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
                  <button id="favAddBtn" className="btn btn-sm btn-ghost" type="button" disabled={saving || favLoading || !!favError} onClick={openFavAdd}><Icon name="add" />추가</button>
                  <button id="favEditBtn" className="btn btn-sm btn-ghost" type="button" disabled={saving || favLoading || !!favError} onClick={toggleFavEdit}>{favEditMode ? '완료' : '수정'}</button>
                </div>
              </div>
              {/* 추가 입력 행 (기본 숨김) */}
              <div id="favAddRow" className="fav-add-row fav-inline-row" hidden={!addOpen}>
                <input
                  id="favAddInput" ref={addInputRef} type="text" className="fav-rename-input" placeholder="장소 이름 입력" autoComplete="off" maxLength={20}
                  value={addValue} onChange={(e) => setAddValue(e.target.value)}
                  onKeyDown={(e) => { enter(commitFavAdd)(e); if (e.key === 'Escape') closeFavAdd() }}
                />
                <button id="favAddConfirm" className="btn btn-sm btn-primary" type="button" disabled={saving} onClick={commitFavAdd}>저장</button>
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
                          <button className="btn btn-sm fav-delete-btn" type="button" disabled={saving} data-fav-delete={fav.id} onClick={() => deleteFav(fav.id)}>삭제</button>
                        </div>
                      )}
                      {!favEditMode && (
                        <button className="fav-detail-btn" type="button" data-fav-open={fav.id} aria-label="장소 상세 보기" onClick={() => openFav(fav.id)}>
                          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                      )}
                      {renaming && (
                        <FavRenameRowWrap fav={fav} onToast={toast} onDone={() => { setRenamingId(null) }} />
                      )}
                    </li>
                  )
                })}
              </ul>
              {favLoading && <p role="status">즐겨찾기를 불러오고 있어요.</p>}
              {favError && <p role="alert">{favError} <button type="button" className="btn btn-sm btn-ghost" onClick={refreshFavs}>다시 불러오기</button></p>}
              <p id="favEmptyMsg" className="mypage-empty-hint" hidden={favs.length > 0 || favLoading || !!favError}>즐겨찾기한 장소가 없습니다.</p>
            </div>

            {/* 예상 이동 시간 (#87). 출발계산 화면에서 옮겨 왔다. */}
            {signedIn && <DepartureSettingsCard active={currentTab === 'login'} onToast={toast} />}

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

            {/* 답변 음성 설정 (#85). 챗봇 화면에서 옮겨 왔다. */}
            {signedIn && <div className="card mypage-section" id="voiceSettingsSection">
              <div className="mypage-section-header">
                <Icon name="volume_up" className="mypage-section-icon" />
                <span className="mypage-section-title">답변 음성</span>
              </div>
              <SpeechSettings speech={speech} />
            </div>}

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
