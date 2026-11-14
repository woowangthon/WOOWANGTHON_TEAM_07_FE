# AGENTS.md — FE 에이전트 작업 가이드

이 레포에서 작업하는 AI 코딩 에이전트(Gemini, Claude, Codex 등)가 **가장 먼저** 읽는 문서다.
`README.md`는 UTF-16으로 저장돼 있어 내용이 거의 없다. 이 문서와 `docs/`가 기준이다.

## 1. 이 레포는 무엇인가

우왕톤 7팀 프론트엔드. "엘리베이터 지하철" 모바일 웹 프로토타입. 휠체어·유모차 이용자가 노선도에서 엘리베이터 상태를 보고, 대체역과 출발 시각을 확인하고, AI 챗봇에 묻는다.
- `Prototype/`: 정적 HTML/CSS/JS 프로토타입 원본 (빌드 없음, `Prototype/index.html`을 브라우저로 열어 확인). **수정하지 않는다.**
- `Prototype-v2/`: 현재 작업 대상. 노선도를 공식 노선도 배치로 바꾸고 1~8호선만 남김. `Prototype-v2/index.html`로 확인. 화면은 노선도(`#view-map`), 엘리베이터(`#view-elevator`), 출발계산(`#view-time`), AI 챗봇(`#view-chat`)과 계정/즐겨찾기다.
- `docs/`: 디자인 요구사항 문서
- `tests/`: 테스트 (§4)

기술: 순수 HTML/CSS/JS(번들러·패키지 매니저 없음). 지도·엘리베이터 상태·출발 계산 로직은 `Prototype-v2/js/`의 모듈이다.

## 2. 지금 BE·AI와 연결되어 있는가 (중요)

**연결되어 있다(2026-11-15).** 데이터 모드는 `index.html`의 `window.APP_CONFIG.dataSource`가 정한다. `file://`로 열면 `mock`(`window.MOCK`, 화면에 "목업 데이터" 배지), http로 열면 `api`(BE/AI 실데이터)다. `file://`에서는 BE CORS가 Origin `null`을 막으므로 실데이터를 쓰려면 정적 서버로 연다. 지도 형태(역 `x/y`, 노선 `paths/segments`)만 FE 상수이고, 나머지는 API 모드에서 아래처럼 서버에서 받는다.

| 화면 | 서버 호출 | 코드 |
|---|---|---|
| 지도 색·역 상태 | BE `GET /api/stations`(역 ID 매핑) → `GET /api/stations/status`(5분마다) | `js/station-id-map.js`, `js/elevator-service.js` `startLive` |
| 역 시트 설비 목록 | BE `GET /api/stations/{id}/elevators`(역을 열 때) | `elevator-service.js` `fetchStationElevators` |
| 출발 계산 | BE `GET /api/routes` → `POST /api/departure-time`(이동 시간 = 경로 `total_minutes`, 도보 7·진입 3·대기 5·출구 3 명시) | `js/time-calculator.js` `calculateDepartureLive` |
| 챗봇 | AI `POST /api/chat` | `js/ai-agent.js` (API 모드 경로) |

- **역 ID**: FE slug ↔ BE 정수 ID를 이름(괄호 부제·'역' 제거)과 노선 일치로 맞춘다. 238개 중 222개가 매핑된다. 안 맞는 16개는 BE에 없는 1호선 역이고, BE에만 있는 18개는 FE 지도에 없는 연장 구간 역이다. 이름이 바뀐 역은 `NAME_ALIASES`(뚝섬유원지 → 자양)에 둔다. 매핑 안 된 역은 "정보 없음"이며, 챗봇 버튼이 그런 역을 가리키면 버튼을 만들지 않는다.
- **실패 처리**: BE가 실패하면 이전 값을 쓰지 않고 "연결 실패"와 "정보 없음"을 보인다. AI 서버가 실패하면 "지금은 답변할 수 없습니다"만 보이고 로컬 규칙 엔진(Mock)으로 넘어가지 않는다. BE `null` 상태는 "정보 없음"이며 정상으로 그리지 않는다.
- **표시 규칙**: `limitations`는 그대로 보인다. 단, 출발 계산에서 BE의 "예상 이동 시간은 외부에서 입력한 값이며 경로 탐색으로 검증되지 않음"은 이동 시간이 BE 경로 값이라 사실이 아니므로 뺀다(AI와 같은 처리). 시간표 열차면 "시간표 열차 기준(열차 번호·계획 시각, 지연 미반영)", 아니면 "추정"이다. `CLEAR`는 "확인된 설비 기준"이며 이용 가능을 보장하지 않는다. 서버 문자열은 이스케이프하며 HTML로 넣지 않는다.
- **시연 패널**: API 모드에서는 고장 조작(`toggleElevator`·`setStationBroken`·`reset`)을 숨기고 동작하지 않게 한다. 그 자리에 넣을 요소는 미정이다.
- **아직 안 된 것**: 출발 계산 결과의 대체역 표시(`ALTERNATIVES_HOOK` 표시, `ElevatorService.findAlternativeStationAsync`는 준비됨), 엘리베이터 탭 갱신 시각은 역을 하나 열어야 BE 시각이 보인다.

실제 연동 전에 읽을 문서(다른 레포):
- `../BE/docs/api-contract.md` — API 응답 계약 (엔드포인트별 요청·응답·상태 판정·`limitations`)
- `../BE/docs/frontend-integration.md` — FE가 쓰는 API 요약, CORS 설정 (`CORS_ALLOWED_ORIGINS`에 FE 주소 필요)
- `../AI/docs/AI_DEVELOPMENT_SPEC.md` §4 — `/api/chat` 요청·응답(`actions`, 카드)
- BE 계약 리뷰(BE #14)와 FE 호출 확인(BE #43)은 FE 쪽 확인을 기다리는 중이다.
- 연동 설계(`docs/accessible-route-api-proposal.md`)는 협의 초안이며 미연동이다.

로컬에서 세 서버를 띄우는 순서(PowerShell 기준, 각각 별도 터미널):

```powershell
# 1) BE (:8000). FE Origin을 CORS에 넣는다. 확인용이면 data/dev.db 복사본을 DATABASE_URL로 지정한다.
cd BE; $env:CORS_ALLOWED_ORIGINS="http://127.0.0.1:5500,http://localhost:5500"; uv run uvicorn app.main:app --port 8000
# 2) AI (:8001). 상위 폴더에서 실행한다(레포 폴더 이름이 AI여야 함). LLM 키를 비우면 폴백 엔진으로만 답한다.
$env:AI_DATA_SOURCE="be"; $env:CORS_ALLOW_ORIGINS="http://127.0.0.1:5500,http://localhost:5500"; uv run --no-project --with-requirements AI/requirements.txt uvicorn AI.src.api.app:app --port 8001
# 3) FE (:5500)
cd FE/Prototype-v2; python -m http.server 5500 --bind 127.0.0.1   # 브라우저: http://127.0.0.1:5500/index.html
```

**BE `data/dev.db`에는 쓰지 않고, 외부 API를 호출하지 않는다.** AI 서버를 LLM 키가 있는 `.env`로 띄우면 실제 LLM(외부 API)을 호출한다.

## 3. 읽는 순서

1. 이 문서
2. [docs/README.md](docs/README.md) — 디자인 요구사항 문서 구성과 ID 규칙. **디자인이나 UI 관련 작업 전에 반드시 읽는다.**
3. [docs/design-system.md](docs/design-system.md) — 색상·글자·간격 토큰 (하드코딩 금지)
4. [docs/backlog.md](docs/backlog.md) — 전체 요구사항 목록과 상태
5. [docs/design-reintegration-2026-11-15.md](docs/design-reintegration-2026-11-15.md) — #43 디자인 기준과 최신 기능의 통합 근거, 보존 표
6. 영역별 `docs/requirements/*.md` — common, map, elevator, time, chat

## 4. 명령어

```sh
node --test tests/*.test.cjs        # 외부 의존성 없는 순수 모듈 테스트. 작업 전후로 실행 (2026-11-15 기준 84건 통과)
```

실제 브라우저 검증(`tests/browser-*.cjs`)은 Puppeteer와 Chromium이 별도로 설치돼 있어야 한다. 절차는 [tests/README.md](tests/README.md)를 따른다(`PUPPETEER_MODULE=<절대경로> node tests/browser-departure.cjs` 등). 계정 검증은 가상 인증 응답만 쓰며 실제 백엔드/OAuth에 요청하지 않는다. `tests/accessible-route-fixtures.cjs`는 가상 증거이므로 제품 데이터나 실제 안전 경로로 쓰지 않는다.

UI를 바꿨으면 `Prototype-v2/index.html`을 브라우저로 열어 직접 확인한다. 테스트가 통과했다고 화면이 맞는 것은 아니다. 브라우저를 못 쓰면 확인하지 못했다고 적는다.

## 5. 반드시 지킬 원칙

이 서비스에서 틀린 정보는 휠체어 이용자가 열차를 놓치거나 고장 난 역에 갇히는 결과로 이어진다.

1. **모르면 모른다고 보여 준다.** 상태를 알 수 없는 설비를 정상처럼 그리지 않는다. 색만으로 상태를 구분하지 않고 모양·아이콘을 함께 쓴다.
2. **실제로 확인하지 않은 것을 "완료"라고 쓰지 않는다.** 테스트 수·검증 결과는 실제로 돌린 값만 문서와 커밋·PR에 적는다.
3. **가상 데이터를 실제처럼 보이지 않게 한다.** 가상 접근성 경로·합성 설비는 제품 데이터에 넣지 않는다. 시연·서비스에서 Mock 데이터를 쓰지 않는 것이 대회 규칙이므로, 실제 연동 전에는 목업임을 분명히 한다.
4. **디자인 값은 토큰으로.** 색·폰트·간격은 `docs/design-system.md`의 토큰을 쓴다. 새 값이 필요하면 토큰을 추가하고 문서에 기록한다.

## 6. 디자인 요구사항 문서 (docs/)

### 사용자가 디자인을 지적할 때 (기록)

1. 지적 내용을 영역별 문서에 요구사항으로 기록한다. 양식: [docs/requirements/_template.md](docs/requirements/_template.md)
   - 공통 요소 → `requirements/common.md` (`REQ-COM-xxx`)
   - 노선도 → `requirements/map.md` (`REQ-MAP-xxx`)
   - 엘리베이터 → `requirements/elevator.md` (`REQ-ELV-xxx`)
   - 출발계산 → `requirements/time.md` (`REQ-TIME-xxx`)
   - AI 챗봇 → `requirements/chat.md` (`REQ-CHAT-xxx`)
   - 전역 기준(색상, 폰트, 간격 등) → `design-system.md` (`REQ-DS-xxx`)
2. 번호는 해당 영역의 마지막 번호 + 1. 삭제된 번호는 재사용하지 않는다.
3. [docs/backlog.md](docs/backlog.md) 목록과 현황 숫자를 함께 갱신한다.
4. 대상 파일과 셀렉터는 코드를 확인해서 정확히 적는다.
5. 지적이 모호하면 추측해서 적지 말고 확인 질문을 한다. 우선순위를 말하지 않았으면 기준(P0/P1/P2)에 따라 제안한다.
6. 스크린샷을 받으면 `docs/assets/<영역 소문자>/<REQ-ID>_<설명>.png`로 저장하고 문서에서 참조한다.
7. 기록만 요청받았으면 코드는 수정하지 않는다.

### 요구사항을 구현할 때 (개발)

1. 요구사항 ID로 지시받으면 해당 영역 문서에서 상세 내용을 읽는다.
2. 디자인 값은 [docs/design-system.md](docs/design-system.md)의 토큰을 쓴다. 하드코딩 금지. 새 값이 필요하면 토큰을 추가하고 문서에 기록한다.
3. 시작 시 상태를 `진행중`으로, 완료 조건을 모두 충족하면 `완료`로 바꾼다. 영역 문서와 backlog.md를 함께 갱신한다.
4. 완료 시 요구사항의 `작업 기록`에 수정한 파일과 변경 요약을 남긴다.
5. 요구사항끼리 충돌하면 사용자에게 묻는다.

## 7. FE 통합·GitHub 작업

- 공통 UI 변경은 main에 반영된 디자인 토큰·컴포넌트를 기준으로 수행한다. 파일 전체를 이전 브랜치 버전으로 대체하지 않는다.
- 관련 Issue를 먼저 확인하고 독립 브랜치에서 변경한다. 커밋은 필요한 파일만 명시적으로 stage하고(`git add -A`·`git add .` 금지) 영어 메시지와 Issue 번호를 쓴다.
- PR의 CLEAN은 코드·디자인 보존 검증을 대신하지 않는다. 실제 브라우저·접근성 정책·최종 main 트리 검증을 수행한다.
- 사용자가 명시 승인한 PR만 병합한다. force push, 기존 worktree 삭제/초기화는 하지 않는다.
- 백엔드는 다른 팀원 작업 중이므로 FE 작업 중에는 BE 코드/worktree/Commit/Push/Issue/PR/Merge를 변경하지 않는다.
- 디자인 기준과 최신 기능의 통합 근거는 docs/design-reintegration-2026-11-15.md에 있다. 원본 `Prototype/`는 수정하지 않는다.
- `main`에 직접 커밋하지 않고 브랜치로 작업해 PR을 연다. 이미 병합된 브랜치를 base로 PR을 열지 않는다(병합돼도 main에 안 들어간다).
- PR은 `.github/pull_request_template.md`(Changes / Testing / Related Issue) 양식을 쓴다. 이슈는 `Closes #N`으로 연결한다.
- GitHub Issue 본문 형식은 Notion 연동 workflow(`.github/workflows/notion-*.yml`, `issue-checklist-sync.yml`)가 의존하므로 임의로 바꾸지 않는다.
- `.env`·API 키·토큰을 읽어 출력하거나 코드·문서·커밋에 쓰지 않는다. 다른 사람·에이전트가 만든 수정·untracked 파일은 건드리지 않는다.

## 8. 작업 환경 (Windows)

- 터미널은 PowerShell 또는 Git Bash다. 한글 출력이 깨지면 파일로 저장해 UTF-8로 읽는다.
- 직접 작성하는 텍스트 파일은 UTF-8. UTF-16으로 저장하면 git이 바이너리로 취급한다(`README.md`가 그 사례다).
- 문서·주석·안내 문장은 한국어.

## 9. 아직 결정되지 않은 것 (임의로 정하지 말고 사용자에게 묻는다)

- API 모드 시연 패널 자리에 넣을 요소, 출발 계산의 대체역 표시 방식. BE 계약 리뷰(#14)·FE 호출 확인(#43)은 이 연결로 확인할 수 있게 됐다.
- 접근성 우회 경로 API(`docs/accessible-route-api-proposal.md`)의 계약.
- 시연에서 합성·Mock 데이터를 어디까지 보여 줄지(대회 규칙: 시연·서비스에서 Mock 금지).
