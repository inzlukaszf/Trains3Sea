// @vitest-environment node
/**
 * Unit tests for priceService.js — all HTTP mocked, no network access.
 *
 * Carriers under test:
 *   1. fetchHafasPrice        (DB HAFAS, tickets=true)
 *   2. fetchRegioJetPrice     (CZ/SK/HU/AT/PL/HR/SI)
 *   3. fetchFlixBusPrice      (pan-European FlixBus/FlixTrain)
 *   4. fetchLuxExpressPrice   (Baltic: EE/LV/LT + Warsaw)
 *   5. carriersForRoute       (routing selection logic)
 *   6. enrichJourneysWithPrices (end-to-end enrichment)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  fetchHafasPrice,
  fetchRegioJetPrice,
  fetchFlixBusPrice,
  fetchLuxExpressPrice,
  carriersForRoute,
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
    throw new Error('Unexpected URL: ' + urlStr)
  })
}

// HAFAS station IDs for Three Seas capitals
const WARSAW      = '5100065'
const PRAGUE      = '5496001'
const BRATISLAVA  = '5600207'
const VIENNA      = '8103000'
const BUDAPEST    = '5500003'
const ZAGREB      = '7800020'
const LJUBLJANA   = '7900003'
const BUCHAREST   = '5300007'
const SOFIA       = '5200004'
const RIGA        = '2500009'
const VILNIUS     = '2400008'
const TALLINN     = '2600080'

const ISO_DEP = '2026-06-01T08:00:00.000Z'

// ─── 1. fetchHafasPrice ─────────────────────────────────────────────────────

describe('fetchHafasPrice', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns price from top-level price field', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys': { journeys: [{ price: { amount: 42.5, currency: 'EUR' }, tickets: [] }] },
    }))
    expect(await fetchHafasPrice(WARSAW, VIENNA, ISO_DEP)).toEqual({ amount: 42.5, currency: 'EUR' })
  })

  it('returns cheapest ticket from tickets array when top-level price absent', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys': {
        journeys: [{
          tickets: [
            { price: { amount: 89, currency: 'EUR' } },
            { price: { amount: 49, currency: 'EUR' } },
            { price: { amount: 69, currency: 'EUR' } },
          ],
        }],
      },
    }))
    expect(await fetchHafasPrice(WARSAW, VIENNA, ISO_DEP)).toEqual({ amount: 49, currency: 'EUR' })
  })

  it('returns null when journeys array is empty', async () => {
    vi.stubGlobal('fetch', mockFetch({ '/journeys': { journeys: [] } }))
    expect(await fetchHafasPrice(WARSAW, VIENNA, ISO_DEP)).toBeNull()
  })

  it('returns null when journey has no price and no tickets', async () => {
    vi.stubGlobal('fetch', mockFetch({ '/journeys': { journeys: [{}] } }))
    expect(await fetchHafasPrice(WARSAW, VIENNA, ISO_DEP)).toBeNull()
  })

  it('returns null when HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch({ '/journeys': null }))
    expect(await fetchHafasPrice(WARSAW, VIENNA, ISO_DEP)).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('Network error') }))
    expect(await fetchHafasPrice(WARSAW, VIENNA, ISO_DEP)).toBeNull()
  })

  it('includes tickets=true in the request URL', async () => {
    const spy = mockFetch({ '/journeys': { journeys: [] } })
    vi.stubGlobal('fetch', spy)
    await fetchHafasPrice(WARSAW, VIENNA, ISO_DEP)
    expect(spy.mock.calls[0][0].toString()).toContain('tickets=true')
  })

  it('defaults currency to EUR when missing', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys': { journeys: [{ price: { amount: 55 } }] },
    }))
    expect((await fetchHafasPrice(WARSAW, VIENNA, ISO_DEP))?.currency).toBe('EUR')
  })
})

// ─── 2. fetchRegioJetPrice ──────────────────────────────────────────────────

describe('fetchRegioJetPrice', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns cheapest price for Prague → Bratislava', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'brn-ybus-pubapi': { routes: [{ priceFrom: 9.9 }, { priceFrom: 14.9 }] },
    }))
    expect(await fetchRegioJetPrice(PRAGUE, BRATISLAVA, ISO_DEP)).toEqual({ amount: 9.9, currency: 'EUR' })
  })

  it('returns price for Zagreb route (HR coverage)', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'brn-ybus-pubapi': { routes: [{ priceFrom: 29 }] },
    }))
    expect(await fetchRegioJetPrice(ZAGREB, VIENNA, ISO_DEP)).toEqual({ amount: 29, currency: 'EUR' })
  })

  it('returns price for Ljubljana route (SI coverage)', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'brn-ybus-pubapi': { routes: [{ priceFrom: 19 }] },
    }))
    expect(await fetchRegioJetPrice(LJUBLJANA, VIENNA, ISO_DEP)).toEqual({ amount: 19, currency: 'EUR' })
  })

  it('returns null for station not in RegioJet map (Tallinn)', async () => {
    expect(await fetchRegioJetPrice(TALLINN, RIGA, ISO_DEP)).toBeNull()
  })

  it('returns null for station not in RegioJet map (Sofia)', async () => {
    expect(await fetchRegioJetPrice(SOFIA, BUCHAREST, ISO_DEP)).toBeNull()
  })

  it('returns null when routes array is empty', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'brn-ybus-pubapi': { routes: [] } }))
    expect(await fetchRegioJetPrice(PRAGUE, BRATISLAVA, ISO_DEP)).toBeNull()
  })

  it('returns null when HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'brn-ybus-pubapi': null }))
    expect(await fetchRegioJetPrice(PRAGUE, BRATISLAVA, ISO_DEP)).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('fail') }))
    expect(await fetchRegioJetPrice(PRAGUE, BRATISLAVA, ISO_DEP)).toBeNull()
  })

  it('sends X-Currency: EUR header', async () => {
    const spy = mockFetch({ 'brn-ybus-pubapi': { routes: [] } })
    vi.stubGlobal('fetch', spy)
    await fetchRegioJetPrice(PRAGUE, BRATISLAVA, ISO_DEP)
    expect(spy.mock.calls[0][1]?.headers?.['X-Currency']).toBe('EUR')
  })

  it('sends date in YYYY-MM-DD format in departureDate param', async () => {
    const spy = mockFetch({ 'brn-ybus-pubapi': { routes: [] } })
    vi.stubGlobal('fetch', spy)
    await fetchRegioJetPrice(PRAGUE, BRATISLAVA, '2026-07-15T10:00:00.000Z')
    expect(spy.mock.calls[0][0].toString()).toContain('departureDate=2026-07-15')
  })
})

// ─── 3. fetchFlixBusPrice ───────────────────────────────────────────────────

describe('fetchFlixBusPrice', () => {
  afterEach(() => vi.restoreAllMocks())

  const flixResponse = (price) => ({
    trips: [{
      results: {
        'trip-1': { available: true,  price: { total: price } },
        'trip-2': { available: false, price: { total: 5.0 } }, // unavailable — excluded
      },
    }],
  })

  it('returns cheapest available price (Warsaw → Vienna)', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'global.api.flixbus.com': flixResponse(29.99) }))
    expect(await fetchFlixBusPrice(WARSAW, VIENNA, ISO_DEP)).toEqual({ amount: 29.99, currency: 'EUR' })
  })

  it('returns cheapest price across multiple trips', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'global.api.flixbus.com': {
        trips: [
          { results: { 'a': { available: true, price: { total: 39.9 } } } },
          { results: { 'b': { available: true, price: { total: 19.9 } } } },
          { results: { 'c': { available: true, price: { total: 29.9 } } } },
        ],
      },
    }))
    expect((await fetchFlixBusPrice(WARSAW, VIENNA, ISO_DEP))?.amount).toBe(19.9)
  })

  it('returns null for station without FlixBus city mapping', async () => {
    // If fromId or toId not in FLIXBUS_CITY_MAP — returns null without HTTP call
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    // Use a made-up HAFAS ID that is not in the map
    const result = await fetchFlixBusPrice('9999999', VIENNA, ISO_DEP)
    expect(result).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('returns null when trips array is empty', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'global.api.flixbus.com': { trips: [] } }))
    expect(await fetchFlixBusPrice(WARSAW, VIENNA, ISO_DEP)).toBeNull()
  })

  it('returns null when no available trips have prices', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'global.api.flixbus.com': {
        trips: [{ results: { 'x': { available: false, price: { total: 10 } } } }],
      },
    }))
    expect(await fetchFlixBusPrice(WARSAW, VIENNA, ISO_DEP)).toBeNull()
  })

  it('returns null when HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'global.api.flixbus.com': null }))
    expect(await fetchFlixBusPrice(WARSAW, VIENNA, ISO_DEP)).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net') }))
    expect(await fetchFlixBusPrice(WARSAW, VIENNA, ISO_DEP)).toBeNull()
  })

  it('sends departure date in DD.MM.YYYY format', async () => {
    const spy = mockFetch({ 'global.api.flixbus.com': { trips: [] } })
    vi.stubGlobal('fetch', spy)
    await fetchFlixBusPrice(WARSAW, VIENNA, '2026-07-04T08:00:00.000Z')
    expect(spy.mock.calls[0][0].toString()).toContain('04.07.2026')
  })

  it('has city mappings for all 12 Three Seas capitals', async () => {
    // Every capital in the map — call returns null only because response has no trips,
    // not because the mapping is missing.
    const spy = mockFetch({ 'global.api.flixbus.com': { trips: [] } })
    vi.stubGlobal('fetch', spy)
    const capitals = [
      WARSAW, VIENNA, PRAGUE, BUDAPEST, BRATISLAVA, ZAGREB,
      LJUBLJANA, BUCHAREST, SOFIA, RIGA, VILNIUS, TALLINN,
    ]
    for (const from of capitals) {
      for (const to of capitals.filter((c) => c !== from)) {
        spy.mockClear()
        await fetchFlixBusPrice(from, to, ISO_DEP)
        // If both are in the map, fetch should be called
        expect(spy).toHaveBeenCalled()
      }
    }
  })
})

// ─── 4. fetchLuxExpressPrice ─────────────────────────────────────────────────

describe('fetchLuxExpressPrice', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns price for Tallinn → Riga', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'api.luxexpress.eu': [
        { price: { adult: 9.9 }, departure: '2026-06-01T08:00:00' },
        { price: { adult: 14.9 }, departure: '2026-06-01T14:00:00' },
      ],
    }))
    expect(await fetchLuxExpressPrice(TALLINN, RIGA, ISO_DEP)).toEqual({ amount: 9.9, currency: 'EUR' })
  })

  it('returns price for Riga → Vilnius', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'api.luxexpress.eu': [{ price: { adult: 7.5 } }],
    }))
    expect(await fetchLuxExpressPrice(RIGA, VILNIUS, ISO_DEP)).toEqual({ amount: 7.5, currency: 'EUR' })
  })

  it('returns price for Vilnius → Warsaw', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'api.luxexpress.eu': [{ price: { adult: 19 } }],
    }))
    expect(await fetchLuxExpressPrice(VILNIUS, WARSAW, ISO_DEP)).toEqual({ amount: 19, currency: 'EUR' })
  })

  it('handles `price.total` field as fallback', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'api.luxexpress.eu': [{ price: { total: 12.5 } }],
    }))
    expect((await fetchLuxExpressPrice(TALLINN, VILNIUS, ISO_DEP))?.amount).toBe(12.5)
  })

  it('handles `lowestPrice` field as fallback', async () => {
    vi.stubGlobal('fetch', mockFetch({
      'api.luxexpress.eu': [{ lowestPrice: 8.0 }],
    }))
    expect((await fetchLuxExpressPrice(TALLINN, RIGA, ISO_DEP))?.amount).toBe(8.0)
  })

  it('returns null for station not in Lux Express map (Vienna)', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    expect(await fetchLuxExpressPrice(VIENNA, WARSAW, ISO_DEP)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('returns null when response array is empty', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'api.luxexpress.eu': [] }))
    expect(await fetchLuxExpressPrice(TALLINN, RIGA, ISO_DEP)).toBeNull()
  })

  it('returns null when HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', mockFetch({ 'api.luxexpress.eu': null }))
    expect(await fetchLuxExpressPrice(TALLINN, RIGA, ISO_DEP)).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('fail') }))
    expect(await fetchLuxExpressPrice(TALLINN, RIGA, ISO_DEP)).toBeNull()
  })

  it('sends date in YYYY-MM-DD format', async () => {
    const spy = mockFetch({ 'api.luxexpress.eu': [] })
    vi.stubGlobal('fetch', spy)
    await fetchLuxExpressPrice(TALLINN, RIGA, '2026-08-20T06:00:00.000Z')
    expect(spy.mock.calls[0][0].toString()).toContain('date=2026-08-20')
  })
})

// ─── 5. carriersForRoute ─────────────────────────────────────────────────────

describe('carriersForRoute — carrier selection', () => {
  it('always includes HAFAS as first carrier', () => {
    const carriers = carriersForRoute(WARSAW, VIENNA)
    expect(carriers[0].name).toBe('fetchHafasPrice')
  })

  it('includes RegioJet for CZ/SK routes', () => {
    const names = carriersForRoute(PRAGUE, BRATISLAVA).map((f) => f.name)
    expect(names).toContain('fetchRegioJetPrice')
  })

  it('includes RegioJet for HU/AT routes', () => {
    const names = carriersForRoute(BUDAPEST, VIENNA).map((f) => f.name)
    expect(names).toContain('fetchRegioJetPrice')
  })

  it('includes RegioJet for HR/SI routes', () => {
    const names = carriersForRoute(ZAGREB, LJUBLJANA).map((f) => f.name)
    expect(names).toContain('fetchRegioJetPrice')
  })

  it('includes RegioJet for PL route (Warsaw → Prague)', () => {
    const names = carriersForRoute(WARSAW, PRAGUE).map((f) => f.name)
    expect(names).toContain('fetchRegioJetPrice')
  })

  it('does NOT include RegioJet for Baltic routes', () => {
    const names = carriersForRoute(TALLINN, RIGA).map((f) => f.name)
    expect(names).not.toContain('fetchRegioJetPrice')
  })

  it('includes Lux Express for Baltic routes', () => {
    const names = carriersForRoute(TALLINN, RIGA).map((f) => f.name)
    expect(names).toContain('fetchLuxExpressPrice')
  })

  it('includes Lux Express for Vilnius → Warsaw', () => {
    const names = carriersForRoute(VILNIUS, WARSAW).map((f) => f.name)
    expect(names).toContain('fetchLuxExpressPrice')
  })

  it('does NOT include Lux Express for non-Baltic routes', () => {
    const names = carriersForRoute(VIENNA, BRATISLAVA).map((f) => f.name)
    expect(names).not.toContain('fetchLuxExpressPrice')
  })

  it('includes FlixBus for all 12 Three Seas capital pairs', () => {
    const capitals = [
      WARSAW, VIENNA, PRAGUE, BUDAPEST, BRATISLAVA, ZAGREB,
      LJUBLJANA, BUCHAREST, SOFIA, RIGA, VILNIUS, TALLINN,
    ]
    for (const from of capitals) {
      for (const to of capitals.filter((c) => c !== from)) {
        const names = carriersForRoute(from, to).map((f) => f.name)
        expect(names, `${from} → ${to}`).toContain('fetchFlixBusPrice')
      }
    }
  })

  it('FlixBus comes after HAFAS and carrier-specific options', () => {
    const carriers = carriersForRoute(WARSAW, VIENNA)
    const names = carriers.map((f) => f.name)
    const hafasIdx = names.indexOf('fetchHafasPrice')
    const flixIdx  = names.indexOf('fetchFlixBusPrice')
    expect(hafasIdx).toBeLessThan(flixIdx)
  })
})

// ─── 6. enrichJourneysWithPrices ─────────────────────────────────────────────

describe('enrichJourneysWithPrices', () => {
  afterEach(() => vi.restoreAllMocks())

  const journey = (id, price = null) => ({
    id,
    price,
    departure: ISO_DEP,
    arrival:   '2026-06-01T12:00:00.000Z',
    legs: [],
    transfers: 0,
    durationMin: 240,
  })

  it('returns journeys unchanged when all have prices', async () => {
    const journeys = [journey(0, { amount: 29, currency: 'EUR' })]
    expect(await enrichJourneysWithPrices(journeys, WARSAW, VIENNA)).toBe(journeys)
  })

  it('fills price for unpriced journeys using HAFAS', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys': { journeys: [{ price: { amount: 55, currency: 'EUR' } }] },
    }))
    const result = await enrichJourneysWithPrices([journey(0), journey(1)], WARSAW, VIENNA)
    expect(result[0].price).toEqual({ amount: 55, currency: 'EUR' })
    expect(result[1].price).toEqual({ amount: 55, currency: 'EUR' })
  })

  it('does not overwrite journeys that already have a price', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys': { journeys: [{ price: { amount: 55, currency: 'EUR' } }] },
    }))
    const result = await enrichJourneysWithPrices(
      [journey(0, { amount: 29, currency: 'EUR' }), journey(1)],
      WARSAW, VIENNA
    )
    expect(result[0].price).toEqual({ amount: 29, currency: 'EUR' })
    expect(result[1].price).toEqual({ amount: 55, currency: 'EUR' })
  })

  it('falls back to RegioJet when HAFAS returns no price (CZ route)', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys':    { journeys: [{}] },            // HAFAS: no price
      'brn-ybus-pubapi': { routes: [{ priceFrom: 9.9 }] },  // RegioJet: hit
    }))
    const result = await enrichJourneysWithPrices([journey(0)], WARSAW, PRAGUE)
    expect(result[0].price).toEqual({ amount: 9.9, currency: 'EUR' })
  })

  it('falls back to Lux Express when HAFAS returns no price (Baltic route)', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys': { journeys: [{}] },
      'api.luxexpress.eu': [{ price: { adult: 7.5 } }],
    }))
    const result = await enrichJourneysWithPrices([journey(0)], TALLINN, RIGA)
    expect(result[0].price).toEqual({ amount: 7.5, currency: 'EUR' })
  })

  it('falls back to FlixBus when HAFAS and RegioJet return no price', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys':         { journeys: [{}] },            // HAFAS: no price
      'brn-ybus-pubapi':   { routes: [] },                 // RegioJet: no routes
      'global.api.flixbus': {
        trips: [{ results: { 'x': { available: true, price: { total: 19.9 } } } }],
      },
    }))
    const result = await enrichJourneysWithPrices([journey(0)], WARSAW, PRAGUE)
    expect(result[0].price?.amount).toBe(19.9)
  })

  it('leaves price null when no carrier returns a price', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys': { journeys: [{}] },
      'global.api.flixbus': { trips: [] },
    }))
    const result = await enrichJourneysWithPrices([journey(0)], WARSAW, VIENNA)
    expect(result[0].price).toBeNull()
  })

  it('does not mutate the original journey objects', async () => {
    vi.stubGlobal('fetch', mockFetch({
      '/journeys': { journeys: [{ price: { amount: 44, currency: 'EUR' } }] },
    }))
    const original = journey(0)
    const result = await enrichJourneysWithPrices([original], WARSAW, VIENNA)
    expect(result[0]).not.toBe(original)
    expect(original.price).toBeNull()
  })

  it('makes at most one HAFAS call regardless of number of unpriced journeys', async () => {
    const spy = mockFetch({
      '/journeys': { journeys: [{ price: { amount: 30, currency: 'EUR' } }] },
    })
    vi.stubGlobal('fetch', spy)
    await enrichJourneysWithPrices([journey(0), journey(1), journey(2)], WARSAW, VIENNA)
    expect(spy.mock.calls).toHaveLength(1)
  })

  it('stops at HAFAS when it returns a price (does not call other carriers)', async () => {
    const spy = mockFetch({
      '/journeys': { journeys: [{ price: { amount: 30, currency: 'EUR' } }] },
    })
    vi.stubGlobal('fetch', spy)
    await enrichJourneysWithPrices([journey(0)], PRAGUE, BRATISLAVA)
    // Should only be one call (HAFAS), not RegioJet/FlixBus
    expect(spy.mock.calls).toHaveLength(1)
    expect(spy.mock.calls[0][0].toString()).toContain('/journeys')
  })
})
