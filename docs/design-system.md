# 디자인 시스템

전역 디자인 기준입니다. 모든 화면은 이 값을 따릅니다.
값의 정의 위치: `Prototype/css/style.css`의 `:root` (11~56행)

> 아래 표는 2026-11-04 기준 프로토타입의 현재 값입니다.
> 기준을 바꾸는 지적은 맨 아래 `## 요구사항`에 `REQ-DS-xxx`로 기록하고, 반영되면 표를 갱신합니다.

## 색상

| 용도 | 토큰 | 값 |
|---|---|---|
| 배경 | `--bg` | `#F3F5F9` |
| 표면 | `--surface` / `--surface-2` | `#FFFFFF` / `#F9FAFB` |
| 본문 텍스트 | `--text` / `--text-2` | `#111827` / `#374151` |
| 보조 텍스트 | `--muted` / `--muted-2` | `#6B7280` / `#9CA3AF` |
| 테두리 | `--border` / `--border-strong` | `#E5E7EB` / `#D1D5DB` |
| 주 색상 | `--primary` / `--primary-press` / `--primary-tint` | `#2563EB` / `#1D4ED8` / `#EFF6FF` |
| 보조 틴트 | `--indigo-tint` | `#EEF2FF` |
| 정상 (운행) | `--ok` / `--ok-text` / `--ok-tint` | `#16A34A` / `#15803D` / `#DCFCE7` |
| 주의 | `--warn` / `--warn-text` / `--warn-tint` | `#F59E0B` / `#B45309` / `#FEF3C7` |
| 오류 (고장) | `--bad` / `--bad-text` / `--bad-tint` | `#DC2626` / `#B91C1C` / `#FEE2E2` |
| 정보 없음 | `--unknown-tint` | `#F3F4F6` |
| 한강 (노선도, v2) | `--river` / `--river-edge` / `--river-label` | `#DBEAFE` / `#BFDBFE` / `#93C5FD` |

## 타이포그래피

| 용도 | 토큰 | 값 |
|---|---|---|
| 기본 폰트 | `--font` | Pretendard, 시스템 폰트 대체 |
| 고정폭 | `--mono` | ui-monospace, SF Mono, Menlo, Consolas |

글자 크기 단계: (미정. 지적이 들어오면 정의)

## 모서리, 그림자

| 토큰 | 값 |
|---|---|
| `--radius-sm` / `--radius` / `--radius-lg` | `12px` / `16px` / `24px` |
| `--shadow-sm` | `0 1px 2px rgba(17,24,39,.06)` |
| `--shadow` | `0 1px 2px rgba(17,24,39,.04), 0 4px 16px rgba(17,24,39,.06)` |
| `--shadow-lg` | `0 10px 40px rgba(17,24,39,.14), 0 2px 8px rgba(17,24,39,.06)` |
| 유리 효과 | `--glass` `rgba(255,255,255,.78)`, `--blur` `saturate(180%) blur(18px)` |

## 레이아웃, 모션

| 토큰 | 값 |
|---|---|
| `--statusbar-h` | `44px` |
| `--tabbar-h` | `64px` (+ safe-area 하단) |
| `--ease` | `cubic-bezier(.2, .8, .2, 1)` |
| `--ease-sheet` | `cubic-bezier(.32, .72, 0, 1)` |

간격 단계: (미정. 지적이 들어오면 정의)

## 규칙

- 색상, 모서리, 그림자는 하드코딩하지 않고 토큰을 쓴다.
- 새 값이 필요하면 토큰을 먼저 추가하고 이 문서에 기록한다.

## 요구사항

(아직 없음)
