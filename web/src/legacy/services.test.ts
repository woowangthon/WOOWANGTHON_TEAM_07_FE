import { describe, expect, it } from 'vitest'
import { missingServices, ES, isApiMode } from './services'

describe('legacy services bridge', () => {
  it('loads every Prototype-v2 service global', () => {
    expect(missingServices()).toEqual([])
  })
  it('runs in mock mode under tests and reads mock stations', () => {
    expect(isApiMode()).toBe(false)
    expect(ES().getAllStations().length).toBe(238)
    expect(ES().getStation('gangnam')?.name).toBe('강남')
  })
  it('subscribe returns an unsubscribe function', () => {
    const off = ES().subscribe(() => {})
    expect(typeof off).toBe('function')
    off()
  })
})
