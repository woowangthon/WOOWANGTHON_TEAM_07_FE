# React 마이그레이션 핸드오프

## 개요

`Prototype-v2/`는 빌드 없는 바닐라 HTML/CSS/JS 프로토타입입니다.
React로 마이그레이션할 때 아래 항목을 참고하세요.

---

## 현재 아키텍처 요약

| 파일 | 역할 |
|------|------|
| `index.html` | 앱 셸, 탭 뷰 HTML, 환경 설정 (`APP_CONFIG`) |
| `js/app.js` | UI 총괄 (`window.App`): 탭 전환, 검색, 시트, 엘리베이터, 출발계산, 챗, 로그인/마이페이지 |
| `js/auth.js` | 인증 어댑터 (`window.AuthService`): 데모 / 실제 FastAPI 모드 분리 |
| `js/mock-data.js` | 목업 데이터 (`window.MOCK`) |
| `js/elevator-service.js` | 엘리베이터 상태 서비스 (`window.ElevatorService`) |
| `js/time-calculator.js` | 출발 시각 계산 (`window.TimeCalculator`) |
| `js/metro-map.js` | 노선도 SVG 렌더링 (`window.MetroMap`) |
| `js/ai-agent.js` | AI 챗봇 (`window.AIAgent`) |
| `css/style.css` | 앱 셸 + 공용 컴포넌트 스타일 |
| `css/map.css` | 노선도 전용 스타일 |

---

## 환경 설정

```js
// index.html 의 APP_CONFIG 블록
window.APP_CONFIG = {
  authMode: 'demo',   // 'demo' | 'real'
  apiBase:  ''        // 백엔드 오리진 ('' = 같은 오리진)
};
```

React에서는 `.env` / Vite 환경 변수로 대체합니다:
- `VITE_AUTH_MODE=real`
- `VITE_API_BASE=https://api.example.com`

---

## 인증 (`AuthService`)

### 데모 어댑터 (현재 기본값)
- `sessionStorage['elevSubway.demoAuth.v1']` 에 `{ isDemoUser: true, provider, name, email }` 저장
- 탭 닫으면 초기화됨
- **`isDemoUser: true` 는 실제 인증 수단이 아님. 백엔드 API 요청에 사용 금지**

### 실제 어댑터 (`authMode: 'real'`)
- FastAPI 백엔드와 HTTP-only Secure 쿠키로 연동
- `credentials: 'include'` 필수
- 엔드포인트 (제안 계약):
  - `GET /api/auth/me` — 세션 확인
  - `GET /api/auth/google/login` — 구글 OAuth 리다이렉트
  - `GET /api/auth/kakao/login` — 카카오 OAuth 리다이렉트
  - `POST /api/auth/logout` — 로그아웃

### React 마이그레이션 방향
- `AuthService` 를 `useAuth()` 훅으로 변환
- `session` 상태를 Zustand / Context로 관리
- `isDemoUser` 플래그 보존 — 프로덕션 빌드에서는 절대 `true` 로 설정 금지

---

## 즐겨찾기 (`loadFavs` / `saveFavs`)

```ts
interface Favorite {
  id: string;        // nanoid
  placeName: string; // 원본 역 이름
  alias: string;     // 사용자 지정 이름 (빈 문자열이면 placeName 표시)
}
```

- 현재 저장소: `sessionStorage['elevSubway.demoFavorites.v1']`
- React 마이그레이션 시 백엔드 API로 대체 (`GET/POST/PATCH/DELETE /api/favorites`)
- 데모에서는 `isDemoUser === true` 일 때만 sessionStorage 사용

---

## 글자 크기 설정

- 저장소: `localStorage['elevSubway.fontSize.v1']`
- 값: `'normal' | 'lg' | 'xl' | 'max'`
- 적용: `<html data-fontsize="lg">` → CSS `--fs-scale` 변수 오버라이드
- FOUC 방지: `<head>` 인라인 스크립트에서 DOM이 그려지기 전에 적용

```js
// index.html head 인라인 스크립트
try {
  var _fs = localStorage.getItem('elevSubway.fontSize.v1');
  if (_fs && _fs !== 'normal') document.documentElement.setAttribute('data-fontsize', _fs);
} catch(e) {}
```

React에서는 `_app.tsx`의 `useEffect` 없이 동일 패턴을 `<Script strategy="beforeInteractive">` 또는 `_document.tsx` 에서 처리합니다.

---

## 탭 / 뷰 구조

```
#view-map      → <MapView>
#view-elevator → <ElevatorView>
#view-time     → <TimeView>
#view-chat     → <ChatView>
#view-login    → <LoginView> / <MyPageView>
```

- 탭 상태는 현재 `app.js`의 모듈 변수 `currentTab`으로 관리
- React 마이그레이션 시 React Router (`/map`, `/elevator`, ...) 또는 단순 상태로 대체

---

## 디자인 시스템

CSS 커스텀 프로퍼티(`--primary`, `--fs-scale` 등)는 `css/style.css` `:root` 에 정의.
React 마이그레이션 시 Tailwind CSS 변수 또는 CSS Modules로 옮깁니다.
토큰 목록: [`docs/design-system.md`](design-system.md)

---

## 마이그레이션 체크리스트

- [ ] `AuthService` → `useAuth()` 훅
- [ ] `ElevatorService` → `useElevatorStore()` (Zustand)
- [ ] `MetroMap` SVG → React 컴포넌트 or Canvas
- [ ] `AIAgent.processMessage` → `useChatStream()` 훅
- [ ] 즐겨찾기 sessionStorage → 백엔드 API
- [ ] 글자 크기 → `_document.tsx` FOUC 방지 스크립트 + Zustand 상태
- [ ] `APP_CONFIG` → `.env` 환경 변수
- [ ] `window.MOCK` 데이터 → React Query + 실제 API
