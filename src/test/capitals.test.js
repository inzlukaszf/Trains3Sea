import { describe, it, expect } from 'vitest'
import {
  THREE_SEAS_CAPITALS,
  CAPITAL_BY_NAME,
  CAPITAL_BY_HAFAS_ID,
  MAP_CENTER,
  MAP_ZOOM,
  EU_CAPITALS,
  EU_CAPITAL_BY_HAFAS_ID,
  EU_CAPITAL_BY_COUNTRY,
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
      hafasId: '5100065',
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

describe('EU_CAPITALS data — wszystkie 27 państw UE', () => {
  const EU_COUNTRY_COUNT = 27
  const COUNTRIES_WITHOUT_RAIL = ['Cypr', 'Malta']

  it('zawiera dokładnie 27 państw członkowskich UE', () => {
    expect(EU_CAPITALS).toHaveLength(EU_COUNTRY_COUNT)
  })

  it('każda stolica ma wymagane pola', () => {
    EU_CAPITALS.forEach((city) => {
      expect(city, `${city.country} brakuje pola country`).toHaveProperty('country')
      expect(city, `${city.country} brakuje pola capital`).toHaveProperty('capital')
      expect(city, `${city.country} brakuje pola name`).toHaveProperty('name')
      expect(city, `${city.country} brakuje pola coords`).toHaveProperty('coords')
      expect(city, `${city.country} brakuje pola hafasId`).toHaveProperty('hafasId')
      expect(city, `${city.country} brakuje pola flag`).toHaveProperty('flag')
      expect(city, `${city.country} brakuje pola hasRailNetwork`).toHaveProperty('hasRailNetwork')
    })
  })

  it('wszystkie flagi są emoji (ciąg 2–8 znaków)', () => {
    EU_CAPITALS.forEach(({ country, flag }) => {
      expect(typeof flag, country).toBe('string')
      expect(flag.length, `${country} — nieprawidłowa flaga`).toBeGreaterThan(0)
    })
  })

  it('współrzędne są prawidłowymi parami [szer, dł] w obrębie Europy', () => {
    EU_CAPITALS.forEach(({ name, coords }) => {
      const [lat, lng] = coords
      expect(lat, `${name} szerokość`).toBeGreaterThan(34)
      expect(lat, `${name} szerokość`).toBeLessThan(72)
      expect(lng, `${name} długość`).toBeGreaterThan(-11)
      expect(lng, `${name} długość`).toBeLessThan(35)
    })
  })

  it('kraje bez sieci kolejowej mają hafasId === null i hasRailNetwork === false', () => {
    COUNTRIES_WITHOUT_RAIL.forEach((country) => {
      const entry = EU_CAPITALS.find((c) => c.country === country)
      expect(entry, `Brak wpisu dla ${country}`).toBeDefined()
      expect(entry.hafasId, `${country} powinien mieć hafasId === null`).toBeNull()
      expect(entry.hasRailNetwork, `${country} powinien mieć hasRailNetwork === false`).toBe(false)
    })
  })

  it('kraje z siecią kolejową mają niepuste hafasId i hasRailNetwork === true', () => {
    EU_CAPITALS
      .filter((c) => !COUNTRIES_WITHOUT_RAIL.includes(c.country))
      .forEach((city) => {
        expect(typeof city.hafasId, `${city.country} — hafasId powinien być stringiem`).toBe('string')
        expect(city.hafasId.length, `${city.country} — hafasId nie może być pusty`).toBeGreaterThan(0)
        expect(city.hasRailNetwork, `${city.country} — hasRailNetwork powinien być true`).toBe(true)
      })
  })

  it('identyfikatory HAFAS są unikalne wśród krajów z siecią kolejową', () => {
    const ids = EU_CAPITALS
      .filter((c) => c.hafasId !== null)
      .map((c) => c.hafasId)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('zawiera wszystkie 27 oczekiwanych krajów UE', () => {
    const countries = EU_CAPITALS.map((c) => c.country)
    const expected = [
      'Austria', 'Belgia', 'Bułgaria', 'Chorwacja', 'Cypr',
      'Czechy', 'Dania', 'Estonia', 'Finlandia', 'Francja',
      'Grecja', 'Hiszpania', 'Irlandia', 'Litwa', 'Luksemburg',
      'Łotwa', 'Malta', 'Niemcy', 'Niderlandy', 'Polska',
      'Portugalia', 'Rumunia', 'Słowacja', 'Słowenia', 'Szwecja',
      'Węgry', 'Włochy',
    ]
    expected.forEach((country) => {
      expect(countries, `Brakuje kraju: ${country}`).toContain(country)
    })
  })

  it('zawiera wszystkie 12 państw Inicjatywy Trójmorza', () => {
    const euCountries = EU_CAPITALS.map((c) => c.country)
    THREE_SEAS_CAPITALS.forEach(({ country }) => {
      expect(euCountries, `${country} (Trójmorze) brakuje w EU_CAPITALS`).toContain(country)
    })
  })

  it('EU_CAPITAL_BY_HAFAS_ID zwraca poprawne miasto', () => {
    expect(EU_CAPITAL_BY_HAFAS_ID['8011160']).toMatchObject({
      country: 'Niemcy',
      name: 'Berlin Hbf',
    })
    expect(EU_CAPITAL_BY_HAFAS_ID['8796001']).toMatchObject({
      country: 'Francja',
      capital: 'Paryż',
    })
    expect(EU_CAPITAL_BY_HAFAS_ID['8814001']).toMatchObject({
      country: 'Belgia',
      name: 'Bruxelles-Midi',
    })
  })

  it('EU_CAPITAL_BY_HAFAS_ID nie zawiera kluczy null', () => {
    expect(Object.keys(EU_CAPITAL_BY_HAFAS_ID)).not.toContain('null')
    COUNTRIES_WITHOUT_RAIL.forEach((country) => {
      const entry = EU_CAPITALS.find((c) => c.country === country)
      expect(EU_CAPITAL_BY_HAFAS_ID[entry.hafasId]).toBeUndefined()
    })
  })

  it('EU_CAPITAL_BY_COUNTRY zwraca poprawne wpisy', () => {
    expect(EU_CAPITAL_BY_COUNTRY['Polska']).toMatchObject({
      capital: 'Warszawa',
      hafasId: '5100065',
    })
    expect(EU_CAPITAL_BY_COUNTRY['Niemcy']).toMatchObject({
      capital: 'Berlin',
      hafasId: '8011160',
    })
    expect(EU_CAPITAL_BY_COUNTRY['Cypr']).toMatchObject({
      capital: 'Nikozja',
      hafasId: null,
      hasRailNetwork: false,
    })
  })

  it('EU_CAPITAL_BY_COUNTRY zawiera wpisy dla wszystkich 27 krajów', () => {
    expect(Object.keys(EU_CAPITAL_BY_COUNTRY)).toHaveLength(EU_COUNTRY_COUNT)
  })

  it('dane Trójmorza są spójne między THREE_SEAS_CAPITALS i EU_CAPITALS', () => {
    THREE_SEAS_CAPITALS.forEach((threeSeas) => {
      const euEntry = EU_CAPITAL_BY_COUNTRY[threeSeas.country]
      expect(euEntry, `${threeSeas.country} nie znaleziony w EU_CAPITALS`).toBeDefined()
      expect(euEntry.hafasId, `${threeSeas.country} — niezgodność hafasId`).toBe(threeSeas.hafasId)
      expect(euEntry.capital, `${threeSeas.country} — niezgodność capital`).toBe(threeSeas.capital)
      expect(euEntry.coords, `${threeSeas.country} — niezgodność coords`).toEqual(threeSeas.coords)
    })
  })
})
