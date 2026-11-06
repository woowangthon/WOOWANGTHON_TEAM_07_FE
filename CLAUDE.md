# CLAUDE.md

## 프로젝트

우왕톤 7팀 프론트엔드. "엘리베이터 지하철" 모바일 웹 프로토타입.
- `Prototype/`: 정적 HTML/CSS/JS 프로토타입 (빌드 없음, `Prototype/index.html`을 브라우저로 열어 확인)
- `Prototype-v2/`: v2 프로토타입. 노선도를 공식 노선도 배치로 바꾸고 1~8호선만 남김 (REQ-MAP-001, 002). `Prototype-v2/index.html`로 확인
- `docs/`: 디자인 요구사항 문서

## 디자인 요구사항 문서 (docs/)

디자인이나 UI 관련 작업을 하기 전에 반드시 [docs/README.md](docs/README.md)를 먼저 읽는다.

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
