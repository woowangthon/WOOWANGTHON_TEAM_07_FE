# 디자인 요구사항 문서

프로토타입(`Prototype/`) 디자인 피드백을 요구사항 명세 형태로 기록한 문서입니다.
AI와 개발자가 이 문서를 보고 수정 작업을 진행합니다.

## 문서 구성

| 경로 | 내용 |
|---|---|
| [design-system.md](design-system.md) | 색상, 폰트, 간격, 모서리, 그림자 등 전역 디자인 기준 |
| [backlog.md](backlog.md) | 전체 요구사항 목록과 상태 (진행 현황판) |
| [requirements/_template.md](requirements/_template.md) | 요구사항 작성 양식 |
| [requirements/common.md](requirements/common.md) | 공통 요소: 상태바, 검색 헤더, 탭바, 바텀시트, 데모 패널 |
| [requirements/map.md](requirements/map.md) | 노선도 화면 (`#view-map`) |
| [requirements/elevator.md](requirements/elevator.md) | 엘리베이터 화면 (`#view-elevator`) |
| [requirements/time.md](requirements/time.md) | 출발계산 화면 (`#view-time`) |
| [requirements/chat.md](requirements/chat.md) | AI 챗봇 화면 (`#view-chat`) |
| [assets/](assets/) | 요구사항에 첨부하는 스크린샷 |

## 요구사항 ID 규칙

`REQ-<영역>-<번호 3자리>` 형식을 씁니다. 번호는 영역마다 001부터 증가하고, 삭제되어도 재사용하지 않습니다.

| 영역 코드 | 대상 | 기록 위치 |
|---|---|---|
| `DS` | 전역 디자인 기준 (색상, 폰트 등) | design-system.md |
| `COM` | 공통 요소 | requirements/common.md |
| `MAP` | 노선도 | requirements/map.md |
| `ELV` | 엘리베이터 | requirements/elevator.md |
| `TIME` | 출발계산 | requirements/time.md |
| `CHAT` | AI 챗봇 | requirements/chat.md |

## 상태와 우선순위

- 상태: `대기` → `진행중` → `완료` / `보류`
- 우선순위
  - `P0` 필수: 시연에 지장을 주거나 눈에 띄게 깨지는 문제
  - `P1` 중요: 사용성, 일관성에 영향
  - `P2` 개선: 다듬기, 있으면 좋은 것

## 스크린샷 규칙

- 위치: `assets/<영역 소문자>/` (예: `assets/map/`)
- 파일명: `<REQ-ID>_<설명>.png` (예: `REQ-MAP-003_라벨겹침.png`)
- 수정 후 비교 이미지는 `_after`를 붙입니다 (예: `REQ-MAP-003_라벨겹침_after.png`)
- 문서에서는 상대 경로로 참조합니다: `![](../assets/map/REQ-MAP-003_라벨겹침.png)`

## 작업 절차 (AI용)

1. [backlog.md](backlog.md)에서 대상 요구사항을 찾고, 해당 영역 문서에서 상세 내용을 읽는다.
2. 디자인 값(색상, 간격 등)은 [design-system.md](design-system.md)의 기준을 따른다. 기준에 없는 값을 새로 쓰지 않는다.
3. 작업 시작 시 상태를 `진행중`으로, 끝나면 `완료`로 바꾼다. 영역 문서와 backlog.md를 함께 갱신한다.
4. 완료 조건 체크리스트를 하나씩 확인하고 체크한다. 충족하지 못한 항목이 있으면 `완료`로 바꾸지 않고 사유를 적는다.
5. 요구사항끼리 충돌하면 임의로 판단하지 말고 사용자에게 묻는다.
