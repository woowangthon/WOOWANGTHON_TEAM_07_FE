// 시트 종류 → 내용 컴포넌트. 새 시트는 컴포넌트 파일을 만들고 여기 한 줄만 더한다.
// 컴포넌트는 #sheetContent 안에 그려진다. 역 시트처럼 요약이 있는 시트는 맨 위에 .sheet-summary를 둬야
// BottomSheet가 요약 높이(peek)를 잴 수 있다. 데이터가 바뀌어 높이가 달라져도 BottomSheet가 다시 잰다.
import type { ComponentType } from 'react'
import type { SheetContentProps, SheetMode } from '../app/context'
import { StationSheet } from './StationSheet'

export const sheetRegistry: Partial<Record<SheetMode, ComponentType<SheetContentProps>>> = {
  station: StationSheet,
  // demo: DemoSheet,        // 2단계: 시연 제어판 시트
  // filter: FilterSheet,    // 2단계: 엘리베이터 탭 호선 거르기
  // favDetail: FavDetailSheet, // 2단계: 즐겨찾기 상세
}
