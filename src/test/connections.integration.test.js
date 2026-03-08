// @vitest-environment node
/**
 * Integration tests — real API calls to v6.db.transport.rest
 *
 * Verifies that the HAFAS API returns at least one journey for every
 * directly-adjacent capital pair in the EU rail graph.
 *
 * These tests hit the live API (no mocks) and may take ~30–120 s total.
 * They skip gracefully when there is no network access (CI / offline).
 *
 * Run with:   npx vitest run src/test/connections.integration.test.js
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { EU_RAIL_GRAPH } from '../data/routeGraph'
import { CAPITAL_BY_HAFAS_ID } from '../data/capitals'

const HAFAS_BASE = 'https://v6.db.transport.rest'
// Use a date 2 days from now to avoid same-day schedule edge cases
const DEPARTURE = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
})()

/** Set to true once we confirm network connectivity to HAFAS. */
let networkAvailable = false

beforeAll(async () => {
  try {
    const res = await fetch(`${HAFAS_BASE}/locations?query=Wien&results=1`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    networkAvailable = res.ok
  } catch {
    networkAvailable = false
  }
})

/**
 * Call the HAFAS API using native fetch and return the first journey's
 * origin → destination station names, or null if none found.
 */
async function fetchJourney(fromId, toId) {
  const url = new URL(`${HAFAS_BASE}/journeys`)
  url.searchParams.set('from', fromId)
  url.searchParams.set('to', toId)
  url.searchParams.set('departure', DEPARTURE)
  url.searchParams.set('results', '1')
  url.searchParams.set('stopovers', 'false')
  url.searchParams.set('remarks', 'false')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fromId}→${toId}`)
  const data = await res.json()
  const journeys = data?.journeys ?? []
  if (journeys.length === 0) return null
  const legs = journeys[0].legs ?? []
  if (legs.length === 0) return null
  return {
    from: legs[0].origin?.name,
    to: legs[legs.length - 1].destination?.name,
    legs: legs.length,
  }
}

// Build the set of unique undirected edges from EU_RAIL_GRAPH
const ADJACENT_PAIRS = []
const seen = new Set()
for (const [fromId, neighbors] of Object.entries(EU_RAIL_GRAPH)) {
  for (const toId of neighbors) {
    const key = [fromId, toId].sort().join('-')
    if (!seen.has(key)) {
      seen.add(key)
      ADJACENT_PAIRS.push([fromId, toId])
    }
  }
}

// Human-readable label for each pair
function pairLabel(fromId, toId) {
  const from = CAPITAL_BY_HAFAS_ID[fromId]?.capital ?? fromId
  const to   = CAPITAL_BY_HAFAS_ID[toId]?.capital   ?? toId
  return `${from} → ${to}`
}

// ═══════════════════════════════════════════════════════════════════════════
// Adjacent pairs: should always yield at least one journey
// ═══════════════════════════════════════════════════════════════════════════

describe('Adjacent capital pairs — HAFAS API returns connections', () => {
  it.each(ADJACENT_PAIRS)(
    '%s ↔ %s: both directions find a journey',
    async (fromId, toId) => {
      if (!networkAvailable) {
        console.warn('  [SKIP] No network access to HAFAS API')
        return
      }

      const label = pairLabel(fromId, toId)
      const labelRev = pairLabel(toId, fromId)

      // Forward
      const fwd = await fetchJourney(fromId, toId)
      expect(fwd, `No journey found: ${label}`).not.toBeNull()
      expect(fwd.to, `Journey does not reach destination for ${label}`)
        .toBeTruthy()

      // Reverse
      const rev = await fetchJourney(toId, fromId)
      expect(rev, `No journey found: ${labelRev}`).not.toBeNull()
      expect(rev.to, `Journey does not reach destination for ${labelRev}`)
        .toBeTruthy()
    },
    45000
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// Key non-adjacent routes (multi-hop, EU-safe)
// ═══════════════════════════════════════════════════════════════════════════

describe('Selected multi-hop capital routes — HAFAS API returns connections', () => {
  const MULTI_HOP_PAIRS = [
    // Baltic ↔ Central Europe
    ['2600080', '5100065'],  // Tallinn → Warsaw
    ['2600080', '5496001'],  // Tallinn → Prague (via Riga, Vilnius, Warsaw)
    ['2500009', '5100065'],  // Riga → Warsaw (via Vilnius)

    // Central Europe cross-routes
    ['5100065', '5500003'],  // Warsaw → Budapest (via Bratislava or Prague)
    ['5100065', '5200004'],  // Warsaw → Sofia (via Bratislava, Budapest, Bucharest)
    ['5496001', '5500003'],  // Prague → Budapest (via Vienna or Bratislava)
    ['5496001', '5300007'],  // Prague → Bucharest
    ['8103000', '5300007'],  // Vienna → Bucharest (via Budapest)
    ['8103000', '5200004'],  // Vienna → Sofia (via Budapest, Bucharest)

    // Balkan routes
    ['7800020', '5200004'],  // Zagreb → Sofia (via Budapest, Bucharest)
    ['7900003', '5500003'],  // Ljubljana → Budapest
    ['7900003', '5200004'],  // Ljubljana → Sofia
  ]

  it.each(MULTI_HOP_PAIRS)(
    '%s → %s: HAFAS finds a journey',
    async (fromId, toId) => {
      if (!networkAvailable) {
        console.warn('  [SKIP] No network access to HAFAS API')
        return
      }

      const label = pairLabel(fromId, toId)
      const result = await fetchJourney(fromId, toId)
      expect(result, `No journey found: ${label}`).not.toBeNull()
      expect(result.legs, `Journey has no legs: ${label}`).toBeGreaterThan(0)
    },
    30000
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// Key fix: Warsaw → Bratislava must end in Bratislava (not Zilina)
// ═══════════════════════════════════════════════════════════════════════════

describe('Warsaw → Bratysława: destination is Bratislava, not Zilina', () => {
  it('journey ends at Bratislava hl.st. (HAFAS ID 5600207)', async () => {
    if (!networkAvailable) {
      console.warn('  [SKIP] No network access to HAFAS API')
      return
    }

    const WARSAW     = '5100065'
    const BRATISLAVA = '5600207'

    const result = await fetchJourney(WARSAW, BRATISLAVA)
    expect(result, 'No journey found from Warsaw to Bratislava').not.toBeNull()
    expect(result.to, 'Journey must end at Bratislava')
      .toMatch(/bratislava/i)
    expect(result.to, 'Journey must NOT end at Zilina')
      .not.toMatch(/zilina/i)
  }, 30000)

  it('reverse: Bratislava → Warsaw ends in Warsaw', async () => {
    if (!networkAvailable) {
      console.warn('  [SKIP] No network access to HAFAS API')
      return
    }

    const WARSAW     = '5100065'
    const BRATISLAVA = '5600207'

    const result = await fetchJourney(BRATISLAVA, WARSAW)
    expect(result, 'No journey found from Bratislava to Warsaw').not.toBeNull()
    expect(result.to, 'Journey must end in Warsaw')
      .toMatch(/warszawa/i)
  }, 30000)
})

// ═══════════════════════════════════════════════════════════════════════════
// Station ID correctness: IDs in the app must map to the right stations
// ═══════════════════════════════════════════════════════════════════════════

describe('Station IDs — HAFAS API resolves to correct stations', () => {
  const EXPECTED_STATIONS = [
    // [hafasId, expectedNameFragment]
    ['8103000', /Wien Hbf/i],
    ['5200004', /Sofia/i],
    ['7800020', /Zagreb/i],
    ['5496001', /Praha|PRAHA/i],
    ['2600080', /Tallinn/i],
    ['5500003', /Budapest/i],
    ['2500009', /Riga/i],
    ['2400008', /Vilnius/i],
    ['5100065', /Warszawa Centralna/i],
    ['5300007', /Bucuresti/i],
    ['5600207', /Bratislava/i],
    ['7900003', /Ljubljana/i],
  ]

  it.each(EXPECTED_STATIONS)(
    'ID %s resolves to correct station name',
    async (hafasId, expectedPattern) => {
      if (!networkAvailable) {
        console.warn('  [SKIP] No network access to HAFAS API')
        return
      }

      const res = await fetch(`${HAFAS_BASE}/stops/${hafasId}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      expect(res.ok, `Failed to fetch station ${hafasId}`).toBe(true)
      const data = await res.json()
      expect(data.name, `Station ${hafasId} name mismatch`).toMatch(expectedPattern)
      // Critical: Bratislava ID must NOT resolve to Zilina
      if (hafasId === '5600207') {
        expect(data.name, 'Bratislava ID must not resolve to Zilina').not.toMatch(/Zilina/i)
      }
    },
    15000
  )
})
