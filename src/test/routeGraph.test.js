import { describe, it, expect } from 'vitest'
import { EU_RAIL_GRAPH, computeAutoVia } from '../data/routeGraph'

// HAFAS IDs for convenience
const VIENNA     = '8103000'
const SOFIA      = '5500010'
const ZAGREB     = '7870041'
const PRAGUE     = '5400001'
const TALLINN    = '7700001'
const BUDAPEST   = '5510009'
const RIGA       = '7600001'
const VILNIUS    = '7600010'
const WARSAW     = '5100067'
const BUCHAREST  = '5310034'
const BRATISLAVA = '5600020'
const LJUBLJANA  = '7940200'

// ═══════════════════════════════════════════════════════════════════════════
// EU_RAIL_GRAPH structure
// ═══════════════════════════════════════════════════════════════════════════

describe('EU_RAIL_GRAPH structure', () => {
  it('covers all 12 Three Seas capitals', () => {
    const ids = [VIENNA, SOFIA, ZAGREB, PRAGUE, TALLINN, BUDAPEST,
                 RIGA, VILNIUS, WARSAW, BUCHAREST, BRATISLAVA, LJUBLJANA]
    ids.forEach((id) => {
      expect(EU_RAIL_GRAPH).toHaveProperty(id)
    })
  })

  it('is undirected: if A→B then B→A', () => {
    for (const [node, neighbors] of Object.entries(EU_RAIL_GRAPH)) {
      for (const nb of neighbors) {
        expect(EU_RAIL_GRAPH[nb]).toContain(node)
      }
    }
  })

  it('no self-loops', () => {
    for (const [node, neighbors] of Object.entries(EU_RAIL_GRAPH)) {
      expect(neighbors).not.toContain(node)
    }
  })

  // EU-only routing: routes that would pass through non-EU territory
  // must NOT be direct edges in the graph.

  it('HU and BG are NOT adjacent (Serbia between them)', () => {
    expect(EU_RAIL_GRAPH[BUDAPEST]).not.toContain(SOFIA)
    expect(EU_RAIL_GRAPH[SOFIA]).not.toContain(BUDAPEST)
  })

  it('HR and BG are NOT adjacent (Serbia between them)', () => {
    expect(EU_RAIL_GRAPH[ZAGREB]).not.toContain(SOFIA)
    expect(EU_RAIL_GRAPH[SOFIA]).not.toContain(ZAGREB)
  })

  it('PL and HU are NOT adjacent (SK between them in graph)', () => {
    expect(EU_RAIL_GRAPH[WARSAW]).not.toContain(BUDAPEST)
    expect(EU_RAIL_GRAPH[BUDAPEST]).not.toContain(WARSAW)
  })

  it('EE and LT are NOT adjacent (LV between them)', () => {
    expect(EU_RAIL_GRAPH[TALLINN]).not.toContain(VILNIUS)
    expect(EU_RAIL_GRAPH[VILNIUS]).not.toContain(TALLINN)
  })

  it('EE and PL are NOT adjacent (LV + LT between them)', () => {
    expect(EU_RAIL_GRAPH[TALLINN]).not.toContain(WARSAW)
    expect(EU_RAIL_GRAPH[WARSAW]).not.toContain(TALLINN)
  })

  // Confirmed direct EU connections
  it('PL and CZ are adjacent (share border, direct EU rail)', () => {
    expect(EU_RAIL_GRAPH[WARSAW]).toContain(PRAGUE)
    expect(EU_RAIL_GRAPH[PRAGUE]).toContain(WARSAW)
  })

  it('AT and HU are adjacent', () => {
    expect(EU_RAIL_GRAPH[VIENNA]).toContain(BUDAPEST)
    expect(EU_RAIL_GRAPH[BUDAPEST]).toContain(VIENNA)
  })

  it('LV and LT are adjacent', () => {
    expect(EU_RAIL_GRAPH[RIGA]).toContain(VILNIUS)
    expect(EU_RAIL_GRAPH[VILNIUS]).toContain(RIGA)
  })

  it('RO and BG are adjacent (Danube bridge, EU territory)', () => {
    expect(EU_RAIL_GRAPH[BUCHAREST]).toContain(SOFIA)
    expect(EU_RAIL_GRAPH[SOFIA]).toContain(BUCHAREST)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// computeAutoVia – edge cases
// ═══════════════════════════════════════════════════════════════════════════

describe('computeAutoVia – edge cases', () => {
  it('returns [] for same from and to', () => {
    expect(computeAutoVia(WARSAW, WARSAW)).toEqual([])
  })

  it('returns [] when fromId is null', () => {
    expect(computeAutoVia(null, WARSAW)).toEqual([])
  })

  it('returns [] when toId is null', () => {
    expect(computeAutoVia(WARSAW, null)).toEqual([])
  })

  it('returns [] when fromId is not in the graph', () => {
    expect(computeAutoVia('unknown-id', WARSAW)).toEqual([])
  })

  it('returns [] when toId is not in the graph', () => {
    expect(computeAutoVia(WARSAW, 'unknown-id')).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// computeAutoVia – directly adjacent capitals (no via needed)
// ═══════════════════════════════════════════════════════════════════════════

describe('computeAutoVia – directly adjacent (no intermediate)', () => {
  it('Warsaw ↔ Prague: no via (direct EU connection)', () => {
    expect(computeAutoVia(WARSAW, PRAGUE)).toEqual([])
    expect(computeAutoVia(PRAGUE, WARSAW)).toEqual([])
  })

  it('Vienna ↔ Budapest: no via', () => {
    expect(computeAutoVia(VIENNA, BUDAPEST)).toEqual([])
  })

  it('Vienna ↔ Bratislava: no via', () => {
    expect(computeAutoVia(VIENNA, BRATISLAVA)).toEqual([])
  })

  it('Vienna ↔ Ljubljana: no via', () => {
    expect(computeAutoVia(VIENNA, LJUBLJANA)).toEqual([])
  })

  it('Tallinn ↔ Riga: no via', () => {
    expect(computeAutoVia(TALLINN, RIGA)).toEqual([])
  })

  it('Riga ↔ Vilnius: no via', () => {
    expect(computeAutoVia(RIGA, VILNIUS)).toEqual([])
  })

  it('Vilnius ↔ Warsaw: no via', () => {
    expect(computeAutoVia(VILNIUS, WARSAW)).toEqual([])
  })

  it('Bucharest ↔ Sofia: no via', () => {
    expect(computeAutoVia(BUCHAREST, SOFIA)).toEqual([])
  })

  it('Budapest ↔ Bucharest: no via', () => {
    expect(computeAutoVia(BUDAPEST, BUCHAREST)).toEqual([])
  })

  it('Zagreb ↔ Ljubljana: no via', () => {
    expect(computeAutoVia(ZAGREB, LJUBLJANA)).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// computeAutoVia – routes requiring EU-safe intermediates
// ═══════════════════════════════════════════════════════════════════════════

describe('computeAutoVia – routes requiring intermediates', () => {
  // Baltic → Central Europe

  it('Warsaw → Tallinn: goes via Vilnius and Riga (avoids Russia/Belarus)', () => {
    const via = computeAutoVia(WARSAW, TALLINN)
    expect(via).toEqual([VILNIUS, RIGA])
  })

  it('Tallinn → Warsaw: reverse is symmetric', () => {
    const via = computeAutoVia(TALLINN, WARSAW)
    expect(via).toEqual([RIGA, VILNIUS])
  })

  it('Warsaw → Riga: goes via Vilnius', () => {
    const via = computeAutoVia(WARSAW, RIGA)
    expect(via).toEqual([VILNIUS])
  })

  it('Tallinn → Vilnius: goes via Riga', () => {
    const via = computeAutoVia(TALLINN, VILNIUS)
    expect(via).toEqual([RIGA])
  })

  // Bulgaria connectivity (EU-safe via Romania)

  it('Warsaw → Sofia: passes through Bratislava, Budapest, Bucharest', () => {
    const via = computeAutoVia(WARSAW, SOFIA)
    expect(via).toContain(BUDAPEST)
    expect(via).toContain(BUCHAREST)
    // Must NOT route through non-EU Serbia
    expect(via).not.toContain(ZAGREB)   // Zagreb→Sofia would need Serbia
  })

  it('Vienna → Sofia: goes via Budapest and Bucharest (not via Serbia)', () => {
    const via = computeAutoVia(VIENNA, SOFIA)
    expect(via).toContain(BUDAPEST)
    expect(via).toContain(BUCHAREST)
  })

  it('Zagreb → Sofia: goes via Budapest and Bucharest (not via Serbia)', () => {
    const via = computeAutoVia(ZAGREB, SOFIA)
    expect(via).toContain(BUDAPEST)
    expect(via).toContain(BUCHAREST)
  })

  it('Tallinn → Sofia: path goes through EU-only countries', () => {
    const via = computeAutoVia(TALLINN, SOFIA)
    // Must contain the Baltic corridor + Balkan bridge
    expect(via).toContain(RIGA)
    expect(via).toContain(VILNIUS)
    expect(via).toContain(BUCHAREST)
  })

  // Cross-region routes

  it('Warsaw → Budapest: needs Bratislava or Prague as intermediate', () => {
    const via = computeAutoVia(WARSAW, BUDAPEST)
    expect(via.length).toBeGreaterThan(0)
    // Must be Bratislava (shorter path) or Prague
    const validIntermediate = via.some(
      (id) => id === BRATISLAVA || id === PRAGUE
    )
    expect(validIntermediate).toBe(true)
  })

  it('Tallinn → Vienna: multi-hop, all EU', () => {
    const via = computeAutoVia(TALLINN, VIENNA)
    expect(via.length).toBeGreaterThan(0)
    // Baltic corridor required
    expect(via).toContain(RIGA)
    expect(via).toContain(VILNIUS)
  })

  it('Ljubljana → Warsaw: returns intermediate(s)', () => {
    const via = computeAutoVia(LJUBLJANA, WARSAW)
    expect(via.length).toBeGreaterThan(0)
  })

  // Returned IDs must all be valid graph nodes
  it('all returned IDs are valid Three Seas capitals', () => {
    const pairs = [
      [WARSAW, SOFIA],
      [TALLINN, BUDAPEST],
      [ZAGREB, BUCHAREST],
      [SOFIA, WARSAW],
    ]
    for (const [from, to] of pairs) {
      const via = computeAutoVia(from, to)
      for (const id of via) {
        expect(EU_RAIL_GRAPH).toHaveProperty(id)
      }
    }
  })

  // from and to must not appear in the returned path
  it('fromId and toId are never included in the via result', () => {
    const pairs = [
      [WARSAW, SOFIA],
      [TALLINN, BUDAPEST],
      [PRAGUE, BUCHAREST],
    ]
    for (const [from, to] of pairs) {
      const via = computeAutoVia(from, to)
      expect(via).not.toContain(from)
      expect(via).not.toContain(to)
    }
  })
})
