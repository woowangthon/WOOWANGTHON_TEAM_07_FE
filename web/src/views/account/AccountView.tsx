// 로그인/마이페이지 탭(#view-login). 1단계는 정적 마크업만 둔다(로그인 상태 전환, 즐겨찾기, 글자 크기는 2단계, app.js 로그인 구간).
// 탭바의 "로그인"/"마이페이지" 글자는 useApp().setLoginTabLabel로 바꾼다.
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'

export function AccountView() {
  const { currentTab } = useApp()
  return (
    <section id="view-login" className={'view' + (currentTab === 'login' ? ' active' : '')} data-view="login">
      <div className="view-scroll">

        {/* ① 비로그인 상태 */}
        <div id="loginSection">
          <div id="authGuest" className="auth-state" hidden>
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
          <div id="authUser" className="auth-state" hidden>
            <h2 className="view-title">마이페이지</h2>

            {/* 프로필 */}
            <div className="card auth-card auth-profile-card">
              <div className="auth-profile">
                <div id="authProfileAvatar" className="auth-avatar" aria-hidden="true">G</div>
                <div className="auth-profile-info">
                  <div className="auth-profile-name-row">
                    <p id="authProfileName" className="auth-profile-name">게스트 사용자</p>
                    <div id="nameEditRow" className="name-edit-row" hidden>
                      <input id="nameEditInput" type="text" className="name-edit-input" autoComplete="off" maxLength={30} aria-label="사용자 이름" />
                      <button id="nameEditConfirm" className="btn btn-sm btn-primary" type="button">저장</button>
                      <button id="nameEditCancel" className="btn btn-sm btn-ghost" type="button">취소</button>
                    </div>
                    <button id="editNameBtn" className="btn btn-sm btn-ghost" type="button" aria-label="이름 편집">편집</button>
                  </div>
                  <p className="auth-provider-sub">
                    <span id="authProviderBadge" className="auth-provider-badge"></span>
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
                  <button id="favAddBtn" className="btn btn-sm btn-ghost" type="button"><Icon name="add" />추가</button>
                  <button id="favEditBtn" className="btn btn-sm btn-ghost" type="button">수정</button>
                </div>
              </div>
              {/* 추가 입력 행 (기본 숨김) */}
              <div id="favAddRow" className="fav-add-row" hidden>
                <input id="favAddInput" type="text" className="fav-rename-input" placeholder="장소 이름 입력" autoComplete="off" maxLength={20} />
                <button id="favAddConfirm" className="btn btn-sm btn-primary" type="button">저장</button>
                <button id="favAddCancel" className="btn btn-sm btn-ghost" type="button">취소</button>
              </div>
              <ul id="favList" className="fav-list"></ul>
              <p id="favEmptyMsg" className="mypage-empty-hint">즐겨찾기한 장소가 없습니다.</p>
            </div>

            {/* 글자 크기 설정 */}
            <div className="card mypage-section">
              <div className="mypage-section-header">
                <Icon name="format_size" className="mypage-section-icon" />
                <span className="mypage-section-title">글자 크기</span>
              </div>
              <div className="fontsize-chips">
                <button className="fontsize-chip" type="button" data-fontsize="normal">보통</button>
                <button className="fontsize-chip" type="button" data-fontsize="lg">크게</button>
                <button className="fontsize-chip" type="button" data-fontsize="xl">아주 크게</button>
                <button className="fontsize-chip" type="button" data-fontsize="max">최대</button>
              </div>
            </div>

            {/* 로그아웃 */}
            <button className="btn btn-ghost btn-block auth-signout-btn" type="button" data-auth="signout">로그아웃</button>
          </div>
        </div>

        {/* ③ 세션 확인 중 (real 모드 초기) */}
        <div id="authLoading" className="auth-loading" hidden>
          <span className="auth-loading-dot"></span>
        </div>

      </div>
    </section>
  )
}
