import type { ComponentType } from 'react'
import type { SheetContentProps, SheetMode } from '../app/context'
import { StationSheet } from './StationSheet'
import { DemoSheet } from './DemoSheet'
import { FilterSheet } from './FilterSheet'
import { FavDetailSheet } from './FavDetailSheet'
export const sheetRegistry: Partial<Record<SheetMode, ComponentType<SheetContentProps>>> = { station: StationSheet, demo: DemoSheet, filter: FilterSheet, favDetail: FavDetailSheet }
