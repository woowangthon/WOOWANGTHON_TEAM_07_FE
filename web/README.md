# web — React 앱 (Prototype-v2 이전 중)

Vite + React + TypeScript. `Prototype-v2`의 화면(`app.js`)을 React로 옮기는 중이다. 계획과 진행은 FE `AGENTS.md`를 본다.

- **서비스 로직은 다시 쓰지 않는다.** `../Prototype-v2/js`의 서비스 스크립트(ElevatorService, TimeCalculator, MetroMap, AIAgent, AuthService 등)와 `../Prototype-v2/css`를 고치지 않고 `/legacy/` 경로로 그대로 불러온다(`vite.config.ts`의 `legacyAssets` 플러그인, `index.html`의 일반 `<script>`). 전역 타입은 `src/legacy/globals.d.ts`, 접근은 `src/legacy/services.ts`.
- **화면은 기존 DOM id·클래스를 그대로 쓴다.** 그래야 기존 CSS가 그대로 적용되고, 기존 브라우저 테스트(`../tests/browser-*.cjs`)로 동등성을 확인할 수 있다.
- **설정**: `.env`(공개 값만) — `VITE_DATA_SOURCE=api|mock`, `VITE_BE_BASE`, `VITE_CHAT_BASE`, `VITE_AUTH_MODE`, `VITE_API_BASE`. 로컬 덮어쓰기는 `.env.local`(git 제외).

```sh
npm install
npm run dev            # http://127.0.0.1:5173 (BE CORS_ALLOWED_ORIGINS, AI CORS_ALLOW_ORIGINS에 이 주소 필요)
npm run build          # 타입 검사 + 빌드 (dist/, legacy 파일 복사 포함)
npm test               # Vitest(jsdom). src/test/setup.ts가 legacy 서비스를 mock 모드로 불러온다
npm run test:legacy    # 기존 노드 테스트(../tests/*.test.cjs)
npm run build:mock && npm run test:browser   # 기존 브라우저 테스트를 React mock 빌드에 실행 (Chrome 필요, CHROME_PATH로 경로 지정 가능)
npm run lint
```

## 화면 이전 및 검증 상태 (2026-11-15)

다섯 화면을 통합하고 React 테스트 31개·서비스 테스트 84개, 기존 브라우저 테스트 5개, 실제 BE·AI 연결을 검증했다. [복구·통합 기록](../docs/react-migration-recovery-2026-11-15.md)을 참고한다. main과 배포 전환은 리뷰 후 수행한다.

npm run build:mock 이후 npm run test:visual로 원본/React 18쌍을 비교한다. npm run test:live로 운영 DB 복사본과 별도 포트의 실제 BE·AI를 검증한다. 결과는 artifacts/migration과 artifacts/live에 저장한다. 화면 비교는 외부 폰트·애니메이션을 끈 조건이며 live 검증에서는 외부 LLM 호출을 비활성화한다. 실제 OAuth는 검증하지 않는다. live 검증에는 BE의 기존 Python 가상환경이 필요하다.
