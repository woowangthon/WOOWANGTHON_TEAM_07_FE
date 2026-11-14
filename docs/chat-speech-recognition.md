# AI 챗봇 한국어 음성 입력

REQ-CHAT-004의 React 구현이다. 텍스트 질문 입력은 그대로 두고 지원 브라우저에서 마이크 버튼을 추가한다. 실제 음성이나 외부 인식 서버를 사용하지 않은 Fake SpeechRecognition 테스트로 검증했다. 실제 마이크 정확도·브라우저 권한창·실서비스 음성 전송은 검증하지 않았다.

## 통합 API

```tsx
import { VoiceInput } from './voice/recognition/VoiceInput'

<VoiceInput
  disabled={busy}
  onTranscript={text => sendVoiceQuestion(text)}
  onListeningChange={listening => setListening(listening)}
  onInterimText={text => setInputText(text)}
/>
```

`disabled`와 `onTranscript`는 필수다. 나머지 콜백은 선택이다. 부모는 `onTranscript`에서 음성 질문 표시를 붙이고 기존 전송 경로를 호출한다. `onListeningChange(true)`는 인식 시작 요청 직전에 호출하므로 진행 중인 TTS를 중지할 수 있다. `onInterimText`는 현재 받아쓰기 전체를 전달하며 시작·종료·취소 시 빈 문자열로 정리한다. 부모는 듣는 동안 입력창의 안내를 `듣고 있어요…`로 바꿀 수 있다. disabled 전환은 진행 중인 인식을 취소하며 부분 질문은 전송하지 않는다.

버튼은 기존 Material Symbols `mic` / `stop`을 사용한다. 통합 시 `web/index.html`의 글꼴 `icon_names` 목록에 두 이름이 필요하다. 크기·색·글자·간격은 공통 디자인 토큰을 참조한다. 버튼은 `--tap-min` 이상이며 듣는 중 모양과 접근성 이름이 바뀐다. 반복 애니메이션은 없다.

## 동작과 개인정보

- 첫 마이크 버튼 클릭은 안내만 연다. 브라우저 제공업체 서버에 음성이 전송될 수 있으며 인식 종료 후 질문이 자동 전송된다는 설명을 읽고 **음성 입력 시작**을 눌러야 인식을 시작한다. 취소/Escape는 시작하지 않는다. 확인 상태는 해당 컴포넌트가 유지되는 동안만 기억하며 영구 저장하지 않는다.
- 한국어 `ko-KR`, 단일 발화 `continuous=false`, 중간 결과 `interimResults=true`를 요청한다. 브라우저 권한은 별도로 허용해야 한다.
- 브라우저가 종료하면 확정 결과를 한 번 전송한다. 중간 결과는 확정 결과와 구분하며 동일 결과 목록의 갱신을 이어 붙이지 않아 중복 전송을 막는다.
- 수동 멈춤은 `stop()`으로 확정을 요청하고 종료 이벤트를 기다린다. 수동 중지 때 최종 확정이 없으면 마지막 중간 결과도 보존해 보낸다. 마지막 중간 결과는 아직 교정될 수 있어 오인식 가능성이 있다. 사용자 말풍선에서 확인할 수 있어야 한다.
- 무음·권한 거부·마이크 미연결·네트워크 오류·시작 실패를 한국어로 안내한다. 실패 시 부분 결과는 보내지 않는다. 일반 텍스트 입력은 부모가 계속 제공한다.
- 빠른 연속 클릭은 활성 세션과 중지 요청을 중복 생성하지 않는다. disabled 전환, 탭 숨김, 언마운트는 `abort()`와 이벤트 해제로 세션을 폐기한다. 폐기한 세션의 지연 이벤트는 무시한다. 브라우저가 보내는 `end` 이벤트에 의존하므로 브라우저 엔진 자체가 멈추면 새로고침이 필요할 수 있다.
- 오디오를 앱 서버에 업로드하거나 파일로 저장하는 코드는 없다. 브라우저 제공업체가 처리하는 데이터의 저장·처리 정책까지 앱이 통제하지 못한다. 역 이름·소음·발음에 따른 실제 인식 정확도는 별도 사용자 검증이 필요하다.

## 지원 환경과 한계

생성자 `SpeechRecognition` 또는 `webkitSpeechRecognition`의 유무를 감지한다. 미지원 브라우저에서는 마이크 버튼 자체를 숨긴다. 생성자가 있어도 운영체제, 권한, 서비스 제공 지역, 네트워크에 따라 실행은 실패할 수 있다. MDN은 이 API를 제한적 지원 기능으로 분류하며 일부 Chrome 구현은 서버 기반으로 동작해 오프라인에서 사용할 수 없다고 설명한다. 따라서 오프라인 인식과 모든 Chromium 브라우저 지원을 보장하지 않는다. [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)

배포 환경은 HTTPS를 사용하고 로컬 개발은 localhost 같은 신뢰 가능한 출처에서 확인한다. 최신 Web Speech 초안의 인터페이스는 SecureContext로 선언되어 있다. 브라우저별 과거 구현 차이가 있으므로 HTTPS만으로 지원을 보장하지 않는다. 표준도 명시적이고 충분한 설명을 받은 동의, 인식 상태 표시를 요구한다. [Web Speech API 보안·개인정보](https://webaudio.github.io/web-speech-api/#security-and-privacy-considerations), [인터페이스 선언](https://webaudio.github.io/web-speech-api/#speechreco-section)

수동 중지는 수집된 음성에서 결과를 반환하도록 시도하고, 취소는 결과를 반환하지 않고 멈추는 기능이다. 이 차이에 따라 사용자 멈춤은 전송하고 화면 이탈은 취소한다. [MDN stop](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/stop), [MDN abort](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/abort)

## 검증

`FE/web`에서 실행:

```powershell
npm.cmd test -- src/views/chat/voice/recognition/VoiceInput.test.tsx
npx.cmd tsc -b
npx.cmd eslint src/views/chat/voice/recognition
```

2026-11-15: Fake 기반 13개 테스트, TypeScript 검사, 해당 디렉터리 ESLint 통과. 테스트는 고지 확인/취소, 미지원/접두사 감지, 한국어 설정, 중간 결과 교체, 확정 결과 1회 전송, 수동 중지/연속 클릭, 무음, 권한/서비스/네트워크/마이크 오류, disabled 경합, 탭 숨김, 언마운트를 검증한다. 테스트에서 실제 마이크를 켜거나 외부 음성 데이터를 전송하지 않았다. 실제 브라우저의 음성 품질과 모바일 화면 배치·화면 읽기 프로그램은 통합 후 별도 확인 대상이다.
