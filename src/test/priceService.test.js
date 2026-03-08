// @vitest-environment node
/**
 * Unit tests for priceService.js
 *
 * All HTTP calls are intercepted via vi.stubGlobal('fetch', ...) so no
 * network access is needed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchHafasPrice,
  fetchRegioJetPrice,
  enrichJourneysWithPrices,
} from '../services/priceService'

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockFetch(responseMap) {
  return vi.fn(async (url) => {
    const urlStr = url.toString()
    for (const [pattern, payload] of Object.entries(responseMap)) {
      if (urlStr.includes(pattern)) {
        if (payload === null) {
          return { ok: false, status: 400, json: async () => ({}) }
        }
        return { ok: true, status: 200, json: async () => payload }
      }
    }
    // Default: network error
    throw new Error('Unexpected URL: ' + urlStr)
  })
}

const WARSAW_ID     = '5100065'
const PRAGUE_ID     = '5496001'
const BRATISLAVA_ID = '5600207'
const VIENNA_ID     = '8103000'

const ISO_DEP = '2026-06-01T08:00:00.000Z'

// ─── fetchHafasPrice ────────────────────────────────────────────────────────

describe('fetchHafasPrice', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns price from top-level price field', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/journeys': {
          journeys: [{ price: { amount: 42.5, currency: 'EUR' }, tickets: [], legs: [] }],
        },
      })
    )
    const result = await fetchHafasPrice(WARSAW_ID, VIENNA_ID, ISO_DEP)
    expect(result).toEqual({ amount: 42.5, currency: 'EUR' })
  })

  it('returns cheapest price from tickets array when top-level price is absent', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/journeys': {
          journeys: [
            {
              tickets: [
                { price: { amount: 89, currency: 'EUR' }, name: 'Flex' },
                { price: { amount: 49, currency: 'EUR' }, name: 'Super' },
                { price: { amount: 69, currency: 'EUR' }, name: 'Saver' },
              ],
              legs: [],
            },
          ],
        },
      })
    )
    const result = await fetchHafasPrice(WARSAW_ID, VIENNA_ID, ISO_DEP)
    expect(result).toEqual({ amount: 49, currency: 'EUR' })
  })

  it('returns null when journeys array is empty', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ '/journeys': { journeys: [] } })
    )
    const result = await fetchHafasPrice(WARSAW_ID, VIENNA_ID, ISO_DEP)
    expect(result).toBeNull()
  })

  it('returns null when journey has no price and no tickets', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/journeys': { journeys: [{ legs: [] }] },
      })
    )
    const result = await fetchHafasPrice(WARSAW_ID, VIENNA_ID, ISO_DEP)
    expect(result).toBeNull()
  })

  it('returns null when HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch({ '/journeys': null }))
    const result = await fetchHafasPrice(WARSAW_ID, VIENNA_ID, ISO_DEP)
    expect(result).toBeNull()
  })

  it('returns null when fetch throws (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Network error') }))
    const result = await fetchHafasPrice(WARSAW_ID, VIENNA_ID, ISO_DEP)
    expect(result).toBeNull()
  })

  it('includes tickets=true in the HAFAS request URL', async () => {
    const fetchSpy = mockFetch({ '/journeys': { journeys: [] } })
    vi.stubGlobal('fetch', fetchSpy)
    await fetchHafasPrice(WARSAW_ID, VIENNA_ID, ISO_DEP)
    const calledUrl = fetchSpy.mock.calls[0][0].toString()
    expect(calledUrl).toContain('tickets=true')
  })

  it('includes from and to IDs in the HAFAS request URL', async () => {
    const fetchSpy = mockFetch({ '/journeys': { journeys: [] } })
    vi.stubGlobal('fetch', fetchSpy)
    await fetchHafasPrice(WARSAW_ID, VIENNA_ID, ISO_DEP)
    const calledUrl = fetchSpy.mock.calls[0][0].toString()
    expect(calledUrl).toContain(WARSAW_ID)
    expect(calledUrl).toContain(VIENNA_ID)
  })

  it('defaults currency to EUR when currency is missing from price', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/journeys': {
          journeys: [{ price: { amount: 55 }, legs: [] }],
        },
      })
    )
    const result = await fetchHafasPrice(WARSAW_ID, VIENNA_ID, ISO_DEP)
    expect(result?.currency).toBe('EUR')
  })
})

// ─── fetchRegioJetPrice ─────────────────────────────────────────────────────

describe('fetchRegioJetPrice', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns price for a known route (Prague → Bratislava)', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'brn-ybus-pubapi': {
          routes: [
            { priceFrom: 9.9, departureTime: '08:00' },
            { priceFrom: 14.9, departureTime: '10:00' },
          ],
        },
      })
    )
    const result = await fetchRegioJetPrice(PRAGUE_ID, BRATISLAVA_ID, ISO_DEP)
    expect(result).toEqual({ amount: 9.9, currency: 'EUR' })
  })

  it('picks the cheapest price when multiple routes are returned', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'brn-ybus-pubapi': {
          routes: [
            { priceFrom: 19.9 },
            { priceFrom: 7.5 },
            { priceFrom: 12.0 },
          ],
        },
      })
    )
    const result = await fetchRegioJetPrice(PRAGUE_ID, BRATISLAVA_ID, ISO_DEP)
    expect(result?.amount).toBe(7.5)
  })

  it('returns null for a station not in RegioJet map', async () => {
    // Sofia hafasId not in REGIOJET_STATION_MAP
    const result = await fetchRegioJetPrice('5200004', PRAGUE_ID, ISO_DEP)
    expect(result).toBeNull()
  })

  it('returns null when routes array is empty', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ 'brn-ybus-pubapi': { routes: [] } })
    )
    const result = await fetchRegioJetPrice(PRAGUE_ID, BRATISLAVA_ID, ISO_DEP)
    expect(result).toBeNull()
  })

  it('returns null when HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'brn-ybus-pubapi': null }))
    const result = await fetchRegioJetPrice(PRAGUE_ID, BRATISLAVA_ID, ISO_DEP)
    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('fail') }))
    const result = await fetchRegioJetPrice(PRAGUE_ID, BRATISLAVA_ID, ISO_DEP)
    expect(result).toBeNull()
  })

  it('sends X-Currency: EUR header', async () => {
    const fetchSpy = mockFetch({ 'brn-ybus-pubapi': { routes: [] } })
    vi.stubGlobal('fetch', fetchSpy)
    await fetchRegioJetPrice(PRAGUE_ID, BRATISLAVA_ID, ISO_DEP)
    const headers = fetchSpy.mock.calls[0][1]?.headers || {}
    expect(headers['X-Currency']).toBe('EUR')
  })

  it('sends date portion only (YYYY-MM-DD) in departureDate param', async () => {
    const fetchSpy = mockFetch({ 'brn-ybus-pubapi': { routes: [] } })
    vi.stubGlobal('fetch', fetchSpy)
    await fetchRegioJetPrice(PRAGUE_ID, BRATISLAVA_ID, '2026-06-15T14:30:00.000Z')
    const calledUrl = fetchSpy.mock.calls[0][0].toString()
    expect(calledUrl).toContain('departureDate=2026-06-15')
  })
})

// ─── enrichJourneysWithPrices ────────────────────────────────────────────────

describe('enrichJourneysWithPrices', () => {
  afterEach(() => vi.restoreAllMocks())

  const journey = (id, price = null) => ({
    id,
    price,
    departure: ISO_DEP,
    arrival: '2026-06-01T12:00:00.000Z',
    legs: [],
    transfers: 0,
    durationMin: 240,
  })

  it('returns journeys unchanged when all already have prices', async () => {
    const journeys = [
      journey(0, { amount: 29, currency: 'EUR' }),
      journey(1, { amount: 39, currency: 'EUR' }),
    ]
    const result = await enrichJourneysWithPrices(journeys, WARSAW_ID, VIENNA_ID)
    expect(result).toEqual(journeys)
  })

  it('fills price for journeys without one using HAFAS', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/journeys': {
          journeys: [{ price: { amount: 55, currency: 'EUR' }, legs: [] }],
        },
      })
    )
    const journeys = [journey(0), journey(1)]
    const result = await enrichJourneysWithPrices(journeys, WARSAW_ID, VIENNA_ID)
    expect(result[0].price).toEqual({ amount: 55, currency: 'EUR' })
    expect(result[1].price).toEqual({ amount: 55, currency: 'EUR' })
  })

  it('does not overwrite journeys that already have a price', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/journeys': {
          journeys: [{ price: { amount: 55, currency: 'EUR' }, legs: [] }],
        },
      })
    )
    const journeys = [
      journey(0, { amount: 29, currency: 'EUR' }),
      journey(1),
    ]
    const result = await enrichJourneysWithPrices(journeys, WARSAW_ID, VIENNA_ID)
    expect(result[0].price).toEqual({ amount: 29, currency: 'EUR' })
    expect(result[1].price).toEqual({ amount: 55, currency: 'EUR' })
  })

  it('falls back to RegioJet when HAFAS returns no price on CZ/SK route', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/journeys': { journeys: [{ legs: [] }] },           // HAFAS: no price
        'brn-ybus-pubapi': { routes: [{ priceFrom: 9.9 }] }, // RegioJet: has price
      })
    )
    const journeys = [journey(0)]
    const result = await enrichJourneysWithPrices(journeys, WARSAW_ID, PRAGUE_ID)
    expect(result[0].price).toEqual({ amount: 9.9, currency: 'EUR' })
  })

  it('skips RegioJet when route is not CZ/SK', async () => {
    const fetchSpy = mockFetch({
      '/journeys': { journeys: [{ legs: [] }] },
    })
    vi.stubGlobal('fetch', fetchSpy)
    const journeys = [journey(0)]
    // Warsaw → Vienna — neither is CZ/SK, so RegioJet should not be called
    await enrichJourneysWithPrices(journeys, WARSAW_ID, VIENNA_ID)
    const calledUrls = fetchSpy.mock.calls.map((c) => c[0].toString())
    expect(calledUrls.some((u) => u.includes('brn-ybus-pubapi'))).toBe(false)
  })

  it('leaves price as null when no carrier returns a price', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ '/journeys': { journeys: [{ legs: [] }] } })
    )
    const journeys = [journey(0)]
    const result = await enrichJourneysWithPrices(journeys, WARSAW_ID, VIENNA_ID)
    expect(result[0].price).toBeNull()
  })

  it('returns original array reference when no journeys need enrichment', async () => {
    const journeys = [journey(0, { amount: 10, currency: 'EUR' })]
    const result = await enrichJourneysWithPrices(journeys, WARSAW_ID, VIENNA_ID)
    expect(result).toBe(journeys)
  })

  it('makes at most one HAFAS call regardless of how many unpriced journeys', async () => {
    const fetchSpy = mockFetch({
      '/journeys': { journeys: [{ price: { amount: 30, currency: 'EUR' }, legs: [] }] },
    })
    vi.stubGlobal('fetch', fetchSpy)
    const journeys = [journey(0), journey(1), journey(2)]
    await enrichJourneysWithPrices(journeys, WARSAW_ID, VIENNA_ID)
    expect(fetchSpy.mock.calls).toHaveLength(1)
  })

  it('does not mutate the original journey objects', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        '/journeys': {
          journeys: [{ price: { amount: 44, currency: 'EUR' }, legs: [] }],
        },
      })
    )
    const original = journey(0)
    const journeys = [original]
    const result = await enrichJourneysWithPrices(journeys, WARSAW_ID, VIENNA_ID)
    expect(result[0]).not.toBe(original)   // new object
    expect(original.price).toBeNull()      // original unchanged
  })
})
