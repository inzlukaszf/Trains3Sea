import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import {
  apiClient,
  searchStations,
  findJourneys,
  formatTime,
  formatDate,
  formatDuration,
} from '../services/trainApi'
import {
  LOCATIONS_RESPONSE_WARSAW,
  JOURNEYS_RESPONSE,
  JOURNEYS_RESPONSE_EMPTY,
  STATION_WARSAW,
  STATION_VIENNA,
} from './fixtures/hafas'

// ─────────────────────────────────────────────────────────────
// Setup: attach mock adapter to the shared axios instance
// ─────────────────────────────────────────────────────────────
let mock

beforeEach(() => {
  mock = new MockAdapter(apiClient, { onNoMatch: 'throwException' })
})

afterEach(() => {
  mock.restore()
})

// ═════════════════════════════════════════════════════════════
// searchStations
// ═════════════════════════════════════════════════════════════
describe('searchStations', () => {
  it('returns filtered stop/station objects from the API', async () => {
    mock.onGet('/locations').reply(200, LOCATIONS_RESPONSE_WARSAW)

    const results = await searchStations('Warszawa')

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ id: '5100067', name: 'Warszawa Centralna' })
  })

  it('filters out non-stop types (addresses, POIs)', async () => {
    const mixed = [
      ...LOCATIONS_RESPONSE_WARSAW,
      { type: 'location', id: 'addr-1', name: 'Warszawa, Śródmieście 1' },
      { type: 'poi', id: 'poi-1', name: 'Warszawa Zoo' },
    ]
    mock.onGet('/locations').reply(200, mixed)

    const results = await searchStations('Warszawa')

    expect(results.every((r) => r.type === 'stop' || r.type === 'station')).toBe(true)
    expect(results).toHaveLength(2)
  })

  it('sends correct query parameters', async () => {
    mock.onGet('/locations').reply((config) => {
      expect(config.params.query).toBe('Praga')
      expect(config.params.results).toBe(8)
      expect(config.params.stops).toBe(true)
      expect(config.params.addresses).toBe(false)
      return [200, []]
    })

    await searchStations('Praga', { results: 8 })
  })

  it('uses default results=5 when not specified', async () => {
    mock.onGet('/locations').reply((config) => {
      expect(config.params.results).toBe(5)
      return [200, []]
    })
    await searchStations('Budapest')
  })

  it('returns empty array when API returns empty list', async () => {
    mock.onGet('/locations').reply(200, [])
    const results = await searchStations('Xyzzy')
    expect(results).toEqual([])
  })

  it('propagates network errors', async () => {
    mock.onGet('/locations').networkError()
    await expect(searchStations('Warszawa')).rejects.toThrow()
  })

  it('propagates HTTP 429 rate limit errors', async () => {
    mock.onGet('/locations').reply(429, { error: 'Too Many Requests' })
    await expect(searchStations('Ryga')).rejects.toThrow()
  })
})

// ═════════════════════════════════════════════════════════════
// findJourneys
// ═════════════════════════════════════════════════════════════
describe('findJourneys', () => {
  it('returns parsed journey objects', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE)

    const journeys = await findJourneys('5100067', '8103000')

    expect(journeys).toHaveLength(2)
    expect(journeys[0]).toHaveProperty('id', 0)
    expect(journeys[0]).toHaveProperty('transfers', 0)
    expect(journeys[1]).toHaveProperty('transfers', 1)
  })

  it('parses departure and arrival times correctly', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE)

    const [j] = await findJourneys('5100067', '8103000')

    expect(j.departure).toBe('2025-06-15T08:20:00+02:00')
    expect(j.arrival).toBe('2025-06-15T16:45:00+02:00')
  })

  it('computes duration in minutes', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE)

    const [j] = await findJourneys('5100067', '8103000')
    // 08:20 → 16:45 = 8h25min = 505 min
    expect(j.durationMin).toBe(505)
  })

  it('identifies transfer stops for multi-leg journey', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE)

    const journeys = await findJourneys('5100067', '8103000')
    const twoLeg = journeys[1]

    expect(twoLeg.transferStops).toHaveLength(1)
    expect(twoLeg.transferStops[0].name).toBe('Berlin Hbf')
  })

  it('parses stopovers inside a leg', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE)

    const [direct] = await findJourneys('5100067', '8103000')
    const leg = direct.legs[0]

    expect(leg.stopovers).toHaveLength(1)
    expect(leg.stopovers[0].name).toBe('Praha hl.n.')
  })

  it('parses leg line name and product', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE)

    const [direct] = await findJourneys('5100067', '8103000')
    expect(direct.legs[0].lineName).toBe('EC 144')
    expect(direct.legs[0].lineProduct).toBe('national')
  })

  it('includes price when present', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE)

    const [j] = await findJourneys('5100067', '8103000')
    expect(j.price).toEqual({ amount: 89, currency: 'EUR' })
  })

  it('sets price to null when absent', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE)

    const journeys = await findJourneys('5100067', '8103000')
    expect(journeys[1].price).toBeNull()
  })

  it('sends via parameter when viaIds provided', async () => {
    mock.onGet('/journeys').reply((config) => {
      expect(config.params.via).toBe('8011160')
      return [200, JOURNEYS_RESPONSE]
    })

    await findJourneys('5100067', '8103000', { viaIds: ['8011160'] })
  })

  it('does not send via parameter when viaIds is empty', async () => {
    mock.onGet('/journeys').reply((config) => {
      expect(config.params.via).toBeUndefined()
      return [200, JOURNEYS_RESPONSE]
    })

    await findJourneys('5100067', '8103000', { viaIds: [] })
  })

  it('sends departure ISO string parameter', async () => {
    const dep = new Date('2025-07-01T10:00:00Z')

    mock.onGet('/journeys').reply((config) => {
      expect(config.params.departure).toBe(dep.toISOString())
      return [200, JOURNEYS_RESPONSE_EMPTY]
    })

    await findJourneys('5100067', '8103000', { departure: dep })
  })

  it('returns empty array when no journeys found', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE_EMPTY)

    const journeys = await findJourneys('5100067', '8103000')
    expect(journeys).toEqual([])
  })

  it('sets origin/destination coords from location data', async () => {
    mock.onGet('/journeys').reply(200, JOURNEYS_RESPONSE)

    const [j] = await findJourneys('5100067', '8103000')
    expect(j.legs[0].origin.coords).toEqual([52.2297, 21.0122])
    expect(j.legs[0].destination.coords).toEqual([48.1851, 16.376])
  })

  it('propagates HTTP 503 service unavailable', async () => {
    mock.onGet('/journeys').reply(503)
    await expect(findJourneys('5100067', '8103000')).rejects.toThrow()
  })

  it('propagates timeout errors', async () => {
    mock.onGet('/journeys').timeout()
    await expect(findJourneys('5100067', '8103000')).rejects.toThrow()
  })

  it('uses results param in request', async () => {
    mock.onGet('/journeys').reply((config) => {
      expect(config.params.results).toBe(10)
      return [200, JOURNEYS_RESPONSE_EMPTY]
    })

    await findJourneys('5100067', '8103000', { results: 10 })
  })
})

// ═════════════════════════════════════════════════════════════
// Formatting helpers
// ═════════════════════════════════════════════════════════════
describe('formatTime', () => {
  it('formats ISO string to HH:mm (timezone-safe)', () => {
    // date-fns format() uses local time, so derive expected value the same way
    const isoStr = '2025-06-15T08:20:00+02:00'
    const d = new Date(isoStr)
    const expected =
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
    expect(formatTime(isoStr)).toBe(expected)
  })

  it('returns — for null input', () => {
    expect(formatTime(null)).toBe('—')
  })

  it('returns — for undefined input', () => {
    expect(formatTime(undefined)).toBe('—')
  })
})

describe('formatDate', () => {
  it('formats ISO string to dd.MM.yyyy', () => {
    expect(formatDate('2025-06-15T08:20:00+00:00')).toBe('15.06.2025')
  })

  it('returns — for null', () => {
    expect(formatDate(null)).toBe('—')
  })
})

describe('formatDuration', () => {
  it('formats minutes under 60 correctly', () => {
    expect(formatDuration(45)).toBe('45 min')
  })

  it('formats hours and minutes correctly', () => {
    expect(formatDuration(505)).toBe('8 godz. 25 min')
  })

  it('formats exact hours', () => {
    expect(formatDuration(120)).toBe('2 godz. 0 min')
  })

  it('returns — for null', () => {
    expect(formatDuration(null)).toBe('—')
  })
})

// ═════════════════════════════════════════════════════════════
// apiClient configuration
// ═════════════════════════════════════════════════════════════
describe('apiClient configuration', () => {
  it('has correct base URL', () => {
    expect(apiClient.defaults.baseURL).toBe('https://v6.db.transport.rest')
  })

  it('has Accept: application/json header', () => {
    expect(apiClient.defaults.headers['Accept']).toBe('application/json')
  })

  it('has a reasonable timeout set', () => {
    expect(apiClient.defaults.timeout).toBeGreaterThan(0)
    expect(apiClient.defaults.timeout).toBeLessThanOrEqual(30000)
  })
})
