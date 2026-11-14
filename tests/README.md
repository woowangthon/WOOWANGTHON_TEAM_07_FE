# Prototype-v2 검증

외부 의존성 없는 순수 모듈 테스트:

```sh
node --test tests/*.test.cjs
```

실제 브라우저 검증은 별도로 설치된 Puppeteer와 Chromium이 필요하다. 프로젝트 루트에서 실행한다. 설치 위치가 모듈 탐색 경로 밖이면 `PUPPETEER_MODULE`에 절대 경로를 지정한다.

```sh
PUPPETEER_MODULE=/absolute/path/to/puppeteer node tests/browser-departure.cjs
PUPPETEER_MODULE=/absolute/path/to/puppeteer node tests/browser-accessible-routes.cjs
```

`APP_FILE=file:///.../Prototype-v2/index.html`로 다른 체크아웃을 지정할 수 있다. `SCREENSHOT=/absolute/path/image.png`는 선택 사항이다. 출발 검증은 그래픽만, 접근성 검증은 기본 데이터의 확인 필요 화면을 저장한다.

`accessible-route-fixtures.cjs`는 가상 증거다. 제품 데이터에 넣거나 실제 안전 경로로 사용하지 않는다. 브라우저 테스트가 공급자를 잠시 대체해 검증/미확인/실패와 UI 만료를 확인한 후 null 기본 상태로 되돌린다. 실제 API·방향별 열차·현장 접근성·물리적 이동은 검증하지 않는다.

디자인·계정/필터 통합 검증:

```sh
PUPPETEER_MODULE=/absolute/path/to/puppeteer node tests/browser-design-integration.cjs
PUPPETEER_MODULE=/absolute/path/to/puppeteer node tests/browser-account-filters.cjs
```

디자인 검증은 외부 폰트를 차단한 경우의 대체 표시도 확인한다. 계정 검증의 비동기 복구는 가상 인증 응답만 쓰며 실제 백엔드/OAuth에 요청하지 않는다. 직접 실행 결과는 [#43 재통합 기록](../docs/design-reintegration-2026-11-15.md)에 있다.
