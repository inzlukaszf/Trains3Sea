import { describe, it, expect } from 'vitest'
import {
  THREE_SEAS_CAPITALS,
  CAPITAL_BY_NAME,
  CAPITAL_BY_HAFAS_ID,
  MAP_CENTER,
  MAP_ZOOM,
} from '../data/capitals'

describe('Three Seas capitals data', () => {
  it('contains exactly 12 member states', () => {
    expect(THREE_SEAS_CAPITALS).toHaveLength(12)
  })

  it('every capital has required fields', () => {
    THREE_SEAS_CAPITALS.forEach((city) => {
      expect(city).toHaveProperty('country')
      expect(city).toHaveProperty('capital')
      expect(city).toHaveProperty('name')
      expect(city).toHaveProperty('coords')
      expect(city).toHaveProperty('hafasId')
      expect(city).toHaveProperty('flag')
    })
  })

  it('all coords are valid [lat, lng] pairs within Europe', () => {
    THREE_SEAS_CAPITALS.forEach(({ name, coords }) => {
      const [lat, lng] = coords
      expect(lat, `${name} lat`).toBeGreaterThan(40)
      expect(lat, `${name} lat`).toBeLessThan(65)
      expect(lng, `${name} lng`).toBeGreaterThan(10)
      expect(lng, `${name} lng`).toBeLessThan(32)
    })
  })

  it('all HAFAS IDs are non-empty strings', () => {
    THREE_SEAS_CAPITALS.forEach(({ name, hafasId }) => {
      expect(typeof hafasId, name).toBe('string')
      expect(hafasId.length, name).toBeGreaterThan(0)
    })
  })

  it('HAFAS IDs are unique', () => {
    const ids = THREE_SEAS_CAPITALS.map((c) => c.hafasId)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('CAPITAL_BY_NAME lookup returns correct city', () => {
    expect(CAPITAL_BY_NAME['Warszawa Centralna']).toMatchObject({
      country: 'Polska',
      hafasId: '5100067',
    })
  })

  it('CAPITAL_BY_HAFAS_ID lookup returns correct city', () => {
    expect(CAPITAL_BY_HAFAS_ID['8103000']).toMatchObject({
      country: 'Austria',
      name: 'Wien Hbf',
    })
  })

  it('MAP_CENTER is within the Three Seas region', () => {
    const [lat, lng] = MAP_CENTER
    expect(lat).toBeGreaterThan(42)
    expect(lat).toBeLessThan(62)
    expect(lng).toBeGreaterThan(10)
    expect(lng).toBeLessThan(30)
  })

  it('MAP_ZOOM is a reasonable value', () => {
    expect(MAP_ZOOM).toBeGreaterThanOrEqual(4)
    expect(MAP_ZOOM).toBeLessThanOrEqual(8)
  })

  it('includes Poland (Warszawa)', () => {
    const poland = THREE_SEAS_CAPITALS.find((c) => c.country === 'Polska')
    expect(poland).toBeDefined()
    expect(poland?.capital).toBe('Warszawa')
  })

  it('includes all 12 expected countries', () => {
    const countries = THREE_SEAS_CAPITALS.map((c) => c.country)
    const expected = [
      'Austria', 'Bułgaria', 'Chorwacja', 'Czechy',
      'Estonia', 'Węgry', 'Łotwa', 'Litwa',
      'Polska', 'Rumunia', 'Słowacja', 'Słowenia',
    ]
    expected.forEach((country) => {
      expect(countries, `Missing: ${country}`).toContain(country)
    })
  })
})
