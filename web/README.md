# web — React 앱

Vite + React + TypeScript. `Prototype-v2`의 화면(`app.js`)을 React로 옮긴 앱이다. 프로젝트 소개·설치·연동은 [상위 README](../README.md), 작업 원칙은 FE `AGENTS.md`를 본다.

- **서비스 로직은 다시 쓰지 않는다.** `../Prototype-v2/js`의 서비스 스크립트(ElevatorService, TimeCalculator, MetroMap, AIAgent, AuthService 등)와 `../Prototype-v2/css`를 고치지 않고 `/legacy/` 경로로 그대로 불러온다(`vite.config.ts`의 `legacyAssets` 플러그인, `index.html`의 일반 `<script>`). 전역 타입은 `src/legacy/globals.d.ts`, 접근은 `src/legacy/services.ts`.
- **화면은 기존 DOM id·클래스를 그대로 쓴다.** 그래야 기존 CSS가 그대로 적용되고, 기존 브라우저 테스트(`../tests/browser-*.cjs`)로 동등성을 확인할 수 있다.
- **설정**: `.env`(공개 값만) — `VITE_DATA_SOURCE=api|mock`, `VITE_BE_BASE`, `VITE_CHAT_BASE`, `VITE_AUTH_MODE`, `VITE_API_BASE`. 로컬 덮어쓰기는 `.env.local`(git 제외).

```sh
npm install
npm run dev            # http://127.0.0.1:5173, 실제 로그인 모드. 다른 포트로 자동 변경하지 않는다.
npm run dev:mock       # 데모 인증·목업 데이터로 실행
npm run build          # 타입 검사 + 빌드 (dist/, legacy 파일 복사 포함)
npm test               # Vitest(jsdom). src/test/setup.ts가 legacy 서비스를 mock 모드로 불러온다
npm run test:legacy    # 기존 노드 테스트(../tests/*.test.cjs)
npm run build:mock && npm run test:browser   # 기존 브라우저 테스트를 React mock 빌드에 실행 (Chrome 필요, CHROME_PATH로 경로 지정 가능)
npm run lint
```

## 실제 Google·카카오 로그인

인증 키는 [BE 로그인 준비](../../BE/README.md#google카카오-로그인-준비)에 따라 **BE/.env에만** 넣는다. `npm.cmd run dev`와 `npm.cmd run build`는 실제 OAuth 로그인 모드다. `dev:auth`와 `build:auth`도 같은 모드의 별칭으로 유지한다. 데모 인증은 `npm.cmd run dev:mock`을 명시해서 실행한다. 공개 API 주소는 `VITE_API_BASE`와 `VITE_BE_BASE`로 지정한다.

Google 버튼은 먼저 `/api/auth/providers`에서 키·저장소 준비 여부를 확인하고, 준비된 경우 실제 `/api/auth/google/login`으로 이동한다. 준비되지 않은 제공자나 저장소는 로그인 화면에서 설명한다. Google 코드 교환은 서버에서 수행하며 프론트엔드에는 Client Secret을 보내지 않는다. BE에 제공자 키가 있으면 `AUTH_FRONTEND_URL`의 정확한 Origin을 쿠키 요청에 자동 허용한다.

개인 즐겨찾기는 서버 DB에 저장하며 실제 계정 캐시는 브라우저 메모리에만 둔다. 서버 저장 실패 시 성공 토스트를 띄우지 않는다. 401 응답은 비로그인 상태로 바꾸고 이전 계정 추천을 숨긴다. 로그아웃 요청 실패는 실패로 안내한다.

실제 카카오 진입 확인은 `node scripts/verify-kakao-live.mjs`로 실행한다. 키와 Redirect URI를 설정한 서비스에서 카카오 버튼을 눌러 계정 입력 화면을 확인하며, 키·인증 URL·쿠키·비밀번호를 출력하지 않는다. Google·카카오 모두 사용자 비밀번호와 동의는 직접 입력한다.

## 외부 LLM 검증 실행

실제 FactChat과 BE 데이터를 사용하는 별도 평가는 [외부 LLM 검증 기록](../docs/external-llm-validation-2026-11-15.md)을 따른다. API 사용량과 데이터 외부 전송이 발생하므로 승인된 환경에서 명시적 플래그로 실행한다.

```sh
npm run test:llm:checks
npm run test:llm:live -- --allow-external-llm
```

기본 template 방식의 실제 LLM 질문 12개와 직접 문장 생성 비교 4개, 두 방식의 React 동작 버튼을 검증했다. 재현에는 문서에 안내한 별도 Python 검증 환경과 등록된 제공자 키가 필요하다. 결과·스크린샷은 `artifacts/external-llm/`, `artifacts/external-llm-prose/`에 저장하며 검증 서버는 실행 후 종료한다.

## 화면 이전 및 검증 상태 (2026-11-15)

다섯 화면을 통합하고 React 테스트 31개·서비스 테스트 84개, 기존 브라우저 테스트 5개, 실제 BE·AI 연결을 검증했다. [복구·통합 기록](../docs/react-migration-recovery-2026-11-15.md)을 참고한다. 통합본은 PR #73으로 main에 반영됐으며 배포 전환은 별도다.

npm run build:mock 이후 npm run test:visual로 원본/React 18쌍을 비교한다. npm run test:live로 운영 DB 복사본과 별도 포트의 실제 BE·AI를 검증한다. 결과는 artifacts/migration과 artifacts/live에 저장한다. 화면 비교는 외부 폰트·애니메이션을 끈 조건이며 live 검증에서는 외부 LLM 호출을 비활성화한다. 실제 OAuth는 검증하지 않는다. live 검증에는 BE의 기존 Python 가상환경이 필요하다.
