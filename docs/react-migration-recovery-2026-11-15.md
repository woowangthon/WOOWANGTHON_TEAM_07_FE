# React 마이그레이션 복구·통합 기록 (2026-11-15)

## 결과와 위치

중단된 다섯 worktree의 소스를 보존하면서 feat/react-shell의 3bf36a5 위에 feat/react-migration-recovery 브랜치를 만들었다. 새 worktree는 C:/woowang_thon/wt/fe-react-integration이다. 원래 작업에는 새 커밋이 없어서 해당 소스를 새 worktree에 복사하고 공통 파일을 통합했다.
역 시트·시연 패널, 엘리베이터, 출발 계산, 챗봇, 계정 화면을 연결하고 검증했다. main 반영과 배포 전환은 아직 수행하지 않았다.

## 구현 및 수정

- 역 시트: 설비 정렬, 운행 수, 서버 상태·limitations, 접근성 확인, 출발 계산·AI 질문 연결.
- 시연 패널: 데스크톱·모바일 제어판과 전체화면. API 모드에서는 가상 고장 조작을 숨기고 처리 함수에서도 차단.
- 엘리베이터: 요약, 상태·호선·사용자 필터, 정렬, 갱신 시각, 필터 저장·로그아웃 초기화.
- 출발 계산: 키보드 콤보박스, 최근 역, 오전·오후 선택기, mock/live 계산, 결과·이동 그래픽·접근성 카드.
- 챗봇: 질문·답변·제안·도구 표시·동작 버튼과 역 시트 질문 큐. API 모드의 HTML은 렌더링하지 않음.
- 계정: 인증 구독, 이름·즐겨찾기 편집, 상세 시트, 글자 크기 저장, 로그아웃.
- 공통: registry와 AppContext를 통합하고 질문 API를 askChat으로 통일.
- window.App의 동기 DOM 계약을 flushSync로 유지. 로그인 탭 이름은 layout effect에서 갱신해 사용자 화면과 함께 반영.
- 출발 계산 요청 번호를 검증 단계부터 증가시켜 오래된 응답과 검증 실패 후 응답을 무시. 동기 예외·API 실패도 처리.
- 접근성 근거 만료를 React ExpiringHtml로 이전. 만료된 경로만 철회하며 마지막 검증 경로 만료 시 추천 제목도 제거. 원본 DOM MutationObserver 스크립트는 React 앱에서 로드하지 않음.

Prototype-v2의 JS·CSS와 원본 Prototype은 수정하지 않았다. 기존 서비스·지도·CSS를 그대로 재사용한다.

## 실행한 검증

| 검증 | 결과 |
|---|---|
| npm test | 7개 파일, 31개 테스트 통과 |
| npm run test:legacy | 84개 통과 |
| npm run lint | 오류 0, 경고 0 |
| npm run build:mock / npm run build | 타입 검사와 mock·production 빌드 통과 |
| browser-accessible-routes.cjs | 65개 검증 통과 |
| browser-account-filters.cjs | 33개 검증 통과 |
| browser-departure.cjs | 33개 검증 통과 |
| browser-design-integration.cjs | 14개 그룹 통과 |
| browser-favorites.cjs | 19개 검증 통과 |
| npm run test:live | 실제 BE·AI 연결 및 장애 처리 12개 항목 통과 |

인증 복구 테스트는 기존 가상 응답을 유지하면서 HTTP 앱 자체 요청을 허용하고 CORS Origin을 앱 Origin에 맞췄다. assertion은 완화하지 않았다.
Vite는 일반 legacy script와 runtime CSS 경고를 출력한다. 기존 전역 실행 순서를 유지하는 구조이며, 빌드 후 legacyAssets 플러그인이 실제 JS·CSS를 dist/legacy에 복사한다. 브라우저 테스트는 해당 빌드를 대상으로 실행했다.

## 화면 비교

390×844 모바일, 1440×1000 데스크톱에서 원본/React 18쌍을 저장했다. 외부 폰트를 차단한 동일 fallback 글꼴과 애니메이션 비활성 조건이다. RGB 채널 차이가 20을 넘는 픽셀 비율을 기록했다. 최대 차이는 0.032%다.
지도·시트·엘리베이터·출발 계산·그래픽·계정과 차이 이미지를 직접 확인했다. 확인한 차이는 텍스트 경계·간격의 작은 차이였고 주요 화면 구조는 유지됐다. 온라인 웹폰트 환경의 픽셀 동등성은 별도로 확인하지 않았다.

| 화면 | 모바일 | 데스크톱 |
|---|---|---|
| 노선도 | 0.000% | 0.000% |
| 역 시트 요약 | 0.000% | 0.002% |
| 역 시트 펼침 | 0.000% | 0.002% |
| 엘리베이터 | 0.032% | 0.008% |
| 출발 계산 입력 | 0.029% | 0.009% |
| 출발 결과 | 0.029% | 0.009% |
| 출발~탑승 그래픽 | 0.000% | 0.002% |
| 챗봇 | 0.000% | 0.002% |
| 계정 | 0.000% | 0.002% |

수치 원본: [비교 JSON](react-migration-comparison-2026-11-15.json).
이미지는 로컬 web/artifacts/migration에 있다. 각 화면은 <폭>-<상태>-prototype.png, -react.png, -diff.png로 저장했다. [출발 그래픽](../web/artifacts/migration/390-time-graphic-react.png), [엘리베이터 차이](../web/artifacts/migration/390-elevator-diff.png)를 참고한다. 이미지·DB·서버 응답은 git에서 제외하고 재현 스크립트와 수치·보고서는 커밋한다.

## 실제 서버 검증 조건과 한계

운영 DB를 SQLite read-only 연결로 열어 backup API로 web/artifacts/live/verification.db에 복사했다. BE·AI 소스와 운영 DB는 변경하지 않았다. BE의 기존 Python 가상환경에 FastAPI/uvicorn이 설치돼 있어 두 앱 모두 이 환경에서 실행했다.
별도 포트 BE 18000, AI 18001, FE 5175를 사용했다. CORS와 API base는 자식 프로세스 환경 변수로 지정했다. 기존 서버는 종료하지 않았고 검증용 서버는 종료했다.
강남 설비·서버 데이터 표시, 가상 고장 조작 숨김, 강남→교대 시간표 열차, 강남→서울 환승 추정, 챗봇 응답과 역 열기 버튼, AI 중단 시 오류, BE 중단 시 UNKNOWN 및 출발 계산 오류, 브라우저 런타임 오류 없음을 확인했다.
외부 LLM 키는 빈 값으로 덮었다. 실제 AI HTTP 서버와 BE 데이터 기반 fallback 엔진의 연결 검증이며 외부 LLM 호출·응답 품질 검증은 아니다. 실제 OAuth 로그인과 현장 접근성은 검증하지 않았다. 서버 응답·결과는 로컬 web/artifacts/live/results.json에 있다.

## 재현

web 폴더에서:

```powershell
npm ci
npm test
npm run test:legacy
npm run lint
npm run build:mock
npm run test:browser
npm run test:visual
npm run test:live
npm run build
```

Chrome이 기본 경로에 없으면 CHROME_PATH를 지정한다. live 검증은 BE·AI 상위 폴더를 자동 탐색하며 필요하면 MIGRATION_WORKSPACE로 지정한다. 현재 live 스크립트는 Windows BE 가상환경 경로를 사용한다.
production 빌드 후 브라우저·화면 비교를 다시 하려면 먼저 build:mock을 실행한다. mock은 개발 검증용이며 시연·서비스는 API 모드를 사용한다. BE·AI의 CORS Origin에는 실제 FE 주소를 추가해야 한다.

## 남은 전환 작업

- 이 통합 브랜치를 리뷰해 main에 반영한 뒤 배포 엔트리를 web/dist로 전환.
- 실제 OAuth/프로필 저장 API, 온라인 폰트, 외부 LLM 검증은 별도 작업.
- 기존 backlog의 미구현 요구사항과 접근성 경로 데이터 계약은 유지.
- Prototype-v2는 비교 기준으로 유지. 다른 저장소의 경로 안내와 전체 PROJECT-STATE는 실제 전환 시점에 갱신.
