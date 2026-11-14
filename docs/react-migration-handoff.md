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
- 같은 줄의 스크롤 구역은 `전체` → `일부 불가` → 사용자 추가 칩(`#customFilterSlot`) 순서다. `＋ 노선`(`#addFilterBtn`)은 스크롤 바깥의 오른쪽 끝에 고정하며 노선 선택 바텀 시트를 연다. 칩은 줄바꿈/축소하지 않고, 넘칠 때만 가로 스크롤과 끝 방향 힌트를 제공한다.
- 로그아웃하면 사용자 필터를 메모리와 sessionStorage에서 모두 지운다. 로그인 상태가 아니면 필터를 적용하지 않는다
- React 마이그레이션 시 sessionStorage → 사용자 설정 API로 대체

## 출발 시각 계산 — 역 선택 콤보박스

- 현재 구조는 검색 입력 + 결과 목록 + 숨은 station_id다. 이전 `originComboBtn`/`originSelect` 기반 바텀시트 방식은 사용하지 않는다.
- `#originSearch`/`#originResults`/`#originValue`, `#destSearch`/`#destResults`/`#destValue`를 `initStationCombo`로 연결한다.
- `.station-pair`는 출발역 → 44px `⇄` 교환 버튼 → 도착역의 3열 그리드다. 375px·글자 150%에서도 두 입력창 크기를 같게 유지한다.
- 도착 희망 시각은 기존 native `input type=time`을 유지한다. `.time-options-row`는 글자가 커져 좁아질 때만 시각 입력과 지금 출발 스위치를 줄바꿈하여 시각이 잘리지 않게 한다.
- 결과 목록은 `--station-combo-results-min-width`를 쓰며 화면 안으로 폭을 제한한다. 출발역은 왼쪽, 도착역은 오른쪽 기준이다.
- React에서는 `<StationCombobox value onChange />`로 옮긴다. 포커스 전체 목록·부분 검색·실제 선택 여부·ID와 이름 교환을 유지한다.

## 지하철 이동 애니메이션 (즐겨찾기 상세)

- 기본: 정적 (애니메이션 없음)
- `#subwayDemoPlay` 버튼 클릭 → `.subway-demo-anim.running` 클래스 추가 → CSS `animation: trainMove 3s forwards`
- 3.2초 후 `running` 제거, 버튼 재활성화
- `prefers-reduced-motion` 미디어 쿼리에서 `animation: none !important`
- React에서는 열차 도착 API 연동 후 실제 진행률 계산으로 대체

---

## 편집 상태와 UX 규칙 (2026-11-14)

- **이름 편집 (인라인)**: 편집을 누르면 이름 텍스트가 있던 자리가 입력창으로 바뀐다. 별도 위치에 입력창을 두지 않는다. 입력창에는 기존 이름이 들어 있고 포커스가 간다. 저장·취소 버튼은 입력창 옆에 있다. 공백만 있는 이름은 저장하지 않는다. 저장하면 이름과 아바타 이니셜이 바뀐다. React에서는 `{ editing, draft }` 로컬 상태로 두고, 저장 시 `PATCH /api/auth/profile`을 호출한다.
- **즐겨찾기 카드**: 장소마다 독립 카드. 이름은 읽기 전용 텍스트다. 오른쪽 화살표(`›`, `aria-label="장소 상세 보기"`)만 상세 바텀 시트를 연다. 이름을 눌러도 상세가 열리지 않는다. 현재 표시 이름(`alias || placeName`) 하나만 출력하고 원래 이름/이전 이름 보조 텍스트는 출력하지 않는다(2026-11-14 최신 요청). `placeName`, `id`, 좌표 등 원본 식별 데이터는 유지한다. 장문은 일반/편집 모드 모두 줄바꿈하여 큰 글자에서도 잘리지 않게 한다.
- **즐겨찾기 편집 모드**: `favEditMode`(기본 `false`)를 목록 컴포넌트가 가진다. 상단 `수정`/`완료` 버튼으로 전환한다. 편집 모드에서만 항목별 `변경`(파랑)·`삭제`(빨강)를 보이고, 화살표는 숨긴다.
- **이름 변경은 한 번에 한 항목**: 변경 입력창은 편집 중인 항목 하나만 연다. React에서는 `editingId` 하나로 관리한다.
- **추가 행은 조건부 렌더링으로**: 프로토타입은 `hidden` 속성을 쓰는데, `display:flex`를 준 행에서는 `hidden`이 적용되지 않는 문제가 있었다. 전역 `[hidden]{display:none !important}`로 고쳤다. React에서는 조건부 렌더링을 쓰므로 이 문제가 없다.
- **버튼 크기**: 보이는 높이는 32px(`.btn-sm`), 터치 영역은 44px이다. 터치 영역은 `.btn-sm::after`의 음수 inset으로 넓힌다. 글자 크기 150%에서도 잘리지 않아야 한다. React에서는 `min-height`가 아니라 같은 방식(의사 요소 또는 패딩 영역)으로 맞춘다.
- **글자 크기 규칙**: 모든 글자 크기는 `calc(Npx * var(--fs-scale))`를 쓴다. 고정 px은 글자 크기 설정이 적용되지 않는다. 앱 셸 CSS는 2026-11-14에 전부 이 형식으로 바꿨다.
- **챗봇 글자 크기**: 말풍선, 입력창, 전송 버튼, 도구 칩, 카드 안 큰 숫자 등 모든 글자 크기는 `var(--fs-scale)`을 곱한다. 고정 px을 쓰면 글자 크기 설정이 적용되지 않는다.
- **시연용 애니메이션**: 즐겨찾기 상세의 지하철 이동은 `▶ 데모 보기`를 누를 때만 움직인다. 라벨은 "시연용 애니메이션 · 실제 열차 위치가 아닙니다"이다. 시트를 닫으면 `running`을 지워 멈춘다. 실제 열차 위치를 만들어 내지 않는다.

## 검색형 역 선택 컴포넌트 (`initStationCombo`)

- 구조: 텍스트 입력(`type="search"`, `role="combobox"`) + 결과 목록(`role="listbox"`) + 숨은 입력(station_id).
- 상태: `committed`는 실제로 역을 고른 상태다. 입력을 바꾸면 `false`가 되어 계산이 막힌다.
- 포커스하면 입력을 전체 선택하고 전체 역을 이름순으로 펼친다. 입력하면 검색한다.
- 역을 고르면 입력창에는 역 이름만 넣는다(호선 숫자 없음). station_id와 호선 정보는 내부 값으로 유지한다.
- 키보드: `↓`로 첫 항목으로 이동, `↑`/`↓`로 이동, `Enter`로 선택, `Esc`로 닫기.
- React에서는 `<StationCombobox value onChange />`로 만든다. `value`는 station_id(또는 `null`), 입력 텍스트는 로컬 상태다. `value !== null`이 `committed`에 해당한다.
- 아직 없음: 최근 고른 역(REQ-TIME-001 요구 5), 결과의 엘리베이터 상태 아이콘(요구 1). 요구사항 문서 참고.

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
