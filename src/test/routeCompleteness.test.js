/**
 * Route completeness tests — internal graph analysis only (no API calls).
 *
 * Verifies that for every ordered pair of Three Seas capitals:
 *  1. The app's EU-safe route algorithm produces a full path.
 *  2. The path STARTS at the departure capital and ENDS at the destination capital.
 *  3. Every intermediate node is a valid Three Seas capital.
 *  4. Every consecutive pair in the path is adjacent in the EU rail graph
 *     (i.e. the route is truly connected, with no phantom jumps).
 *  5. No capital from outside the Three Seas set appears in the path.
 *
 * Additionally tests that journeyToPolylines correctly represents a route
 * from a departure capital to a destination capital (polyline completeness).
 */
import { describe, it, expect } from 'vitest'
import { THREE_SEAS_CAPITALS, CAPITAL_BY_HAFAS_ID } from '../data/capitals'
import { EU_RAIL_GRAPH, buildFullPath, computeAutoVia } from '../data/routeGraph'
import { journeyToPolylines } from '../components/TrainMap'

// ── All 12 capital HAFAS IDs ───────────────────────────────────────────────
const ALL_IDS = THREE_SEAS_CAPITALS.map((c) => c.hafasId)

// Helper: ordered pairs without self-pairs  (12 × 11 = 132 pairs)
const ALL_PAIRS = ALL_IDS.flatMap((a) => ALL_IDS.filter((b) => b !== a).map((b) => [a, b]))

// ═══════════════════════════════════════════════════════════════════════════
// buildFullPath — basic sanity
// ═══════════════════════════════════════════════════════════════════════════

describe('buildFullPath – basic', () => {
  it('returns [] for null inputs', () => {
    expect(buildFullPath(null, '8103000')).toEqual([])
    expect(buildFullPath('8103000', null)).toEqual([])
  })

  it('returns [from, to] for adjacent capitals (length 2)', () => {
    // Vienna ↔ Budapest are adjacent
    const path = buildFullPath('8103000', '5510009')
    expect(path).toEqual(['8103000', '5510009'])
  })

  it('path length ≥ 2 for every pair', () => {
    for (const [from, to] of ALL_PAIRS) {
      const path = buildFullPath(from, to)
      expect(path.length).toBeGreaterThanOrEqual(2)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Route start-point: always the departure capital
// ═══════════════════════════════════════════════════════════════════════════

describe('Route START POINT — always the departure capital', () => {
  it.each(ALL_PAIRS)('path from %s starts at %s', (from, to) => {
    const path = buildFullPath(from, to)
    expect(path[0]).toBe(from)

    // The start node must be a known Three Seas capital
    const capital = CAPITAL_BY_HAFAS_ID[path[0]]
    expect(capital).toBeDefined()
    expect(capital.hafasId).toBe(from)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Route end-point: always the destination capital
// ═══════════════════════════════════════════════════════════════════════════

describe('Route END POINT — always the destination capital', () => {
  it.each(ALL_PAIRS)('path to %s ends at %s', (from, to) => {
    const path = buildFullPath(from, to)
    expect(path[path.length - 1]).toBe(to)

    // The end node must be a known Three Seas capital
    const capital = CAPITAL_BY_HAFAS_ID[path[path.length - 1]]
    expect(capital).toBeDefined()
    expect(capital.hafasId).toBe(to)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Route completeness: every node is a valid Three Seas capital
// ═══════════════════════════════════════════════════════════════════════════

describe('Route completeness — all stops are Three Seas capitals', () => {
  it.each(ALL_PAIRS)('%s → %s: every node is a Three Seas capital', (from, to) => {
    const path = buildFullPath(from, to)
    for (const id of path) {
      const capital = CAPITAL_BY_HAFAS_ID[id]
      expect(capital, `Unknown capital ID: ${id} in path ${path.join(' → ')}`).toBeDefined()
      expect(ALL_IDS).toContain(id)
    }
  })

  it.each(ALL_PAIRS)('%s → %s: no non-Three-Seas station appears', (from, to) => {
    const path = buildFullPath(from, to)
    const unknownNodes = path.filter((id) => !CAPITAL_BY_HAFAS_ID[id])
    expect(unknownNodes).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Route connectivity: every consecutive pair is adjacent in EU_RAIL_GRAPH
// ═══════════════════════════════════════════════════════════════════════════

describe('Route connectivity — consecutive stops are adjacent (EU graph)', () => {
  it.each(ALL_PAIRS)('%s → %s: no phantom jumps between stops', (from, to) => {
    const path = buildFullPath(from, to)

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]
      const b = path[i + 1]
      const neighbors = EU_RAIL_GRAPH[a] ?? []
      expect(
        neighbors,
        `${a} (${CAPITAL_BY_HAFAS_ID[a]?.capital}) is NOT adjacent to ${b} (${CAPITAL_BY_HAFAS_ID[b]?.capital}) in EU graph`
      ).toContain(b)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// EU-only routing: non-EU country capitals must NOT appear
// ═══════════════════════════════════════════════════════════════════════════

describe('EU-only routing — non-EU countries never appear in path', () => {
  // Known non-EU capital station IDs that the HAFAS API knows about
  const NON_EU_IDS = [
    '8010255',  // Belgrade (Serbia)
    '5200081',  // Kyiv (Ukraine)
    '2000058',  // Minsk (Belarus)
    '2100100',  // Moscow (Russia)
    '5500081',  // Skopje (North Macedonia)
  ]

  it.each(ALL_PAIRS)('%s → %s: no non-EU station in computed path', (from, to) => {
    const path = buildFullPath(from, to)
    for (const nonEuId of NON_EU_IDS) {
      expect(path).not.toContain(nonEuId)
    }
  })

  it('HU → BG path goes via RO, never via Serbia (non-EU)', () => {
    const BUDAPEST  = '5510009'
    const SOFIA     = '5500010'
    const BUCHAREST = '5310034'
    const ZAGREB    = '7870041'

    const path = buildFullPath(BUDAPEST, SOFIA)
    // Must pass through Bucharest (Romania, EU)
    expect(path).toContain(BUCHAREST)
    // Must NOT jump directly Budapest → Sofia (Serbia between them)
    const consecutive = path.slice(0, -1).map((id, i) => [id, path[i + 1]])
    const hasSerbiaShortcut = consecutive.some(([a, b]) => a === BUDAPEST && b === SOFIA)
    expect(hasSerbiaShortcut).toBe(false)
  })

  it('Tallinn → Warsaw path avoids Russia/Belarus (goes via Riga+Vilnius)', () => {
    const TALLINN = '7700001'
    const RIGA    = '7600001'
    const VILNIUS = '7600010'
    const WARSAW  = '5100067'

    const path = buildFullPath(TALLINN, WARSAW)
    expect(path).toContain(RIGA)
    expect(path).toContain(VILNIUS)
    // Path must be strictly: Tallinn → Riga → Vilnius → Warsaw
    expect(path).toEqual([TALLINN, RIGA, VILNIUS, WARSAW])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// No duplicate stops in any path
// ═══════════════════════════════════════════════════════════════════════════

describe('Route validity — no repeated capitals', () => {
  it.each(ALL_PAIRS)('%s → %s: each capital appears at most once', (from, to) => {
    const path = buildFullPath(from, to)
    const unique = new Set(path)
    expect(unique.size).toBe(path.length)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Symmetry: reverse route has same length
// ═══════════════════════════════════════════════════════════════════════════

describe('Route symmetry', () => {
  it.each(ALL_IDS.flatMap((a, i) => ALL_IDS.slice(i + 1).map((b) => [a, b])))(
    '%s ↔ %s: forward and reverse paths have the same length',
    (a, b) => {
      const forward = buildFullPath(a, b)
      const reverse = buildFullPath(b, a)
      expect(forward.length).toBe(reverse.length)
    }
  )

  it.each(ALL_IDS.flatMap((a, i) => ALL_IDS.slice(i + 1).map((b) => [a, b])))(
    '%s ↔ %s: reverse path starts/ends at the correct capitals',
    (a, b) => {
      const forward = buildFullPath(a, b)
      const reverse = buildFullPath(b, a)
      // Reverse must start where forward ended and vice versa
      expect(reverse[0]).toBe(forward[forward.length - 1])
      expect(reverse[reverse.length - 1]).toBe(forward[0])
    }
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// journeyToPolylines — polyline start/end match journey capitals
// ═══════════════════════════════════════════════════════════════════════════

describe('journeyToPolylines — route completeness (polyline start/end)', () => {
  // Helper: find a capital by HAFAS ID
  const cap = (id) => CAPITAL_BY_HAFAS_ID[id]

  /** Build a minimal mock journey from fromId to toId (direct, no stopovers) */
  function makeMockJourney(fromId, toId, withStopover = null) {
    const from = cap(fromId)
    const to   = cap(toId)
    const legs = withStopover
      ? [
          {
            lineName: 'EC 100',
            lineProduct: 'national',
            mode: 'train',
            isWalking: false,
            origin:      { id: fromId, name: from.name, coords: from.coords },
            destination: { id: withStopover.hafasId, name: withStopover.name, coords: withStopover.coords },
            stopovers: [],
            departure: '2025-06-15T08:00:00+02:00',
            arrival:   '2025-06-15T12:00:00+02:00',
          },
          {
            lineName: 'EC 200',
            lineProduct: 'national',
            mode: 'train',
            isWalking: false,
            origin:      { id: withStopover.hafasId, name: withStopover.name, coords: withStopover.coords },
            destination: { id: toId, name: to.name, coords: to.coords },
            stopovers: [],
            departure: '2025-06-15T13:00:00+02:00',
            arrival:   '2025-06-15T17:00:00+02:00',
          },
        ]
      : [
          {
            lineName: 'EC 100',
            lineProduct: 'national',
            mode: 'train',
            isWalking: false,
            origin:      { id: fromId, name: from.name, coords: from.coords },
            destination: { id: toId,   name: to.name,   coords: to.coords },
            stopovers: [],
            departure: '2025-06-15T08:00:00+02:00',
            arrival:   '2025-06-15T16:00:00+02:00',
          },
        ]
    return { legs, transfers: legs.length - 1, transferStops: [], departure: legs[0].departure, arrival: legs[legs.length - 1].arrival }
  }

  it('returns [] for null journey', () => {
    expect(journeyToPolylines(null)).toEqual([])
  })

  it('direct journey: polyline starts at departure capital', () => {
    const WARSAW = '5100067'
    const PRAGUE = '5400001'
    const journey = makeMockJourney(WARSAW, PRAGUE)
    const polylines = journeyToPolylines(journey)
    expect(polylines.length).toBeGreaterThan(0)
    const firstPoint = polylines[0].points[0]
    expect(firstPoint).toEqual(cap(WARSAW).coords)
  })

  it('direct journey: polyline ends at destination capital', () => {
    const WARSAW = '5100067'
    const PRAGUE = '5400001'
    const journey = makeMockJourney(WARSAW, PRAGUE)
    const polylines = journeyToPolylines(journey)
    const lastSeg = polylines[polylines.length - 1]
    const lastPoint = lastSeg.points[lastSeg.points.length - 1]
    expect(lastPoint).toEqual(cap(PRAGUE).coords)
  })

  it('multi-leg journey: first point is departure capital', () => {
    const WARSAW  = '5100067'
    const VIENNA  = '8103000'
    const BRATISLAVA = cap('5600020')
    const journey = makeMockJourney(WARSAW, VIENNA, BRATISLAVA)
    const polylines = journeyToPolylines(journey)
    const firstPoint = polylines[0].points[0]
    expect(firstPoint).toEqual(cap(WARSAW).coords)
  })

  it('multi-leg journey: last point is destination capital', () => {
    const WARSAW  = '5100067'
    const VIENNA  = '8103000'
    const BRATISLAVA = cap('5600020')
    const journey = makeMockJourney(WARSAW, VIENNA, BRATISLAVA)
    const polylines = journeyToPolylines(journey)
    const lastSeg = polylines[polylines.length - 1]
    const lastPoint = lastSeg.points[lastSeg.points.length - 1]
    expect(lastPoint).toEqual(cap(VIENNA).coords)
  })

  it('intermediate capital is the last point of first leg', () => {
    const WARSAW  = '5100067'
    const VIENNA  = '8103000'
    const BRATISLAVA = cap('5600020')
    const journey = makeMockJourney(WARSAW, VIENNA, BRATISLAVA)
    const polylines = journeyToPolylines(journey)
    const firstLegLastPoint = polylines[0].points[polylines[0].points.length - 1]
    expect(firstLegLastPoint).toEqual(BRATISLAVA.coords)
  })

  it('walking legs are excluded from polylines', () => {
    const WARSAW = '5100067'
    const PRAGUE = '5400001'
    const journey = makeMockJourney(WARSAW, PRAGUE)
    // Inject a walking leg in the middle
    journey.legs[0].isWalking = true
    const polylines = journeyToPolylines(journey)
    expect(polylines).toHaveLength(0)
  })

  it('polylines cover all Three Seas capital pairs — each produces valid segments', () => {
    // Test a representative set of capital pairs
    const testPairs = [
      ['5100067', '8103000'],  // Warsaw → Vienna
      ['7700001', '5100067'],  // Tallinn → Warsaw
      ['5500010', '8103000'],  // Sofia → Vienna
      ['7870041', '5500010'],  // Zagreb → Sofia
    ]
    for (const [fromId, toId] of testPairs) {
      const journey = makeMockJourney(fromId, toId)
      const polylines = journeyToPolylines(journey)
      expect(polylines.length).toBeGreaterThan(0)
      // First point = from capital coords
      expect(polylines[0].points[0]).toEqual(cap(fromId).coords)
      // Last point = to capital coords
      const lastSeg = polylines[polylines.length - 1]
      expect(lastSeg.points[lastSeg.points.length - 1]).toEqual(cap(toId).coords)
    }
  })
})
