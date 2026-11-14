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
#view-map      → <MapView>       (앱 헤더 보임)
#view-elevator → <ElevatorView>  (앱 헤더 보임)
#view-time     → <TimeView>      (앱 헤더 숨김)
#view-chat     → <ChatView>      (앱 헤더 숨김)
#view-login    → <LoginView> / <MyPageView>  (앱 헤더 숨김)
```

- 탭 상태는 현재 `app.js`의 모듈 변수 `currentTab`으로 관리
- `switchTab(name)` 호출 시 `.app-header`의 `hidden` 속성 토글 (map/elevator만 표시)
- React 마이그레이션 시 React Router (`/map`, `/elevator`, ...) 또는 단순 상태로 대체

---

## 디자인 시스템

CSS 커스텀 프로퍼티(`--primary`, `--fs-scale` 등)는 `css/style.css` `:root` 에 정의.
React 마이그레이션 시 Tailwind CSS 변수 또는 CSS Modules로 옮깁니다.
토큰 목록: [`docs/design-system.md`](design-system.md)

---

## 엘리베이터 탭 커스텀 필터

```ts
// sessionStorage key: 'elevSubway.elevFilters.v1'
// 값: JSON 배열 of 노선 ID strings, e.g. ["2", "5"]
```

- 로그인 사용자 전용 (`AuthService.getSession()` 확인)
- 기본 필터 (전체/일부 불가) AND 커스텀 노선 필터 (OR 로직)
- `#customFilterRow` 에 렌더링, `#addFilterBtn` 클릭 → 노선 선택 바텀 시트
- React 마이그레이션 시 sessionStorage → 사용자 설정 API로 대체

## 출발 시각 계산 — 역 선택 콤보박스

- 기존 `<select>` 를 `<button class="combobox-btn">` + `<input type="hidden">` 으로 교체
- 클릭 시 `openStationPicker(role, label)` → 바텀 시트 (검색 + 역 목록)
- 선택 시 `setComboValue(role, id)` → 버튼 텍스트 + hidden input 값 갱신
- `#originComboBtn` / `#originSelect` (hidden), `#destComboBtn` / `#destSelect` (hidden)
- React에서는 `<Select>` 컴포넌트 (react-select 또는 직접 구현) + controlled input으로 대체

## 지하철 이동 애니메이션 (즐겨찾기 상세)

- 기본: 정적 (애니메이션 없음)
- `#subwayDemoPlay` 버튼 클릭 → `.subway-demo-anim.running` 클래스 추가 → CSS `animation: trainMove 3s forwards`
- 3.2초 후 `running` 제거, 버튼 재활성화
- `prefers-reduced-motion` 미디어 쿼리에서 `animation: none !important`
- React에서는 열차 도착 API 연동 후 실제 진행률 계산으로 대체

---

## 후속 백엔드 API 연동 (미구현)

| 기능 | 엔드포인트 | 비고 |
|------|-----------|------|
| 사용자 프로필 이름 변경 | `PATCH /api/auth/profile` `{ displayName: string }` | 현재 데모: sessionStorage만 업데이트 |
| 즐겨찾기 장소 목록 | `GET/POST/PATCH/DELETE /api/favorites` | 현재 데모: sessionStorage |
| 위치 좌표 → 주변 역 | 위치 API (미정) | `renderFavStations()` stub 구현됨 |
| 열차 도착 시간 | 열차 도착 API (미정) | 현재 데모 애니메이션만 표시 |

---

## 아이콘 인계 (react-icons)

현재 이모지 아이콘을 React 마이그레이션 시 `react-icons`로 대체한다.
REQ-DS-007 (Material Symbols 계획)보다 react-icons를 우선하기로 결정.

| 현재 이모지 | 역할 | react-icons 제안 |
|------------|------|-----------------|
| 🗺️ | 하단 탭 노선도 | `FaMapMarkedAlt` (react-icons/fa) |
| 🛗 | 하단 탭 엘리베이터 | `MdElevator` (react-icons/md) |
| ⏱️ | 하단 탭 출발계산 | `FaClock` (react-icons/fa) |
| 🤖 | 하단 탭 AI 챗봇 | `RiRobot2Line` (react-icons/ri) |
| 👤 | 하단 탭 로그인/마이페이지 | `FaUserCircle` (react-icons/fa) |
| ⭐ | 즐겨찾기 | `FaStar` (react-icons/fa) |
| ⚙️ | 설정 | `MdSettings` (react-icons/md) |
| 🚇 | 지하철 애니메이션 | `MdTrain` (react-icons/md) |

---

## 마이그레이션 체크리스트

- [ ] `AuthService` → `useAuth()` 훅
- [ ] `ElevatorService` → `useElevatorStore()` (Zustand)
- [ ] `MetroMap` SVG → React 컴포넌트 or Canvas
- [ ] `AIAgent.processMessage` → `useChatStream()` 훅
- [ ] 즐겨찾기 sessionStorage → `GET/POST/PATCH/DELETE /api/favorites`
- [ ] 글자 크기 → `_document.tsx` FOUC 방지 스크립트 + Zustand 상태
- [ ] `APP_CONFIG` → `.env` 환경 변수
- [ ] `window.MOCK` 데이터 → React Query + 실제 API
- [ ] 사용자 이름 변경 → `PATCH /api/auth/profile`
- [ ] `renderFavStations()` stub → 위치 API 연동 후 구현
- [ ] 지하철 애니메이션 → 열차 도착 API 연동 후 실제 진행률 계산
- [ ] 이모지 아이콘 → react-icons (위 매핑 표 참고)
- [ ] REQ-DS-007 Material Symbols 계획 → react-icons로 대체 결정됨
