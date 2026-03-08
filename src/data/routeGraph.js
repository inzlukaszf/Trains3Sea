/**
 * EU-only rail graph for the 12 Three Seas Initiative capitals.
 *
 * Two capitals are "adjacent" if:
 *  1. Their countries share a land border, AND
 *  2. A direct rail connection exists entirely within EU territory.
 *
 * Non-EU countries avoided: Russia, Belarus, Ukraine, Moldova, Serbia,
 * North Macedonia, Turkey, Bosnia-Herzegovina, Montenegro.
 *
 * Key non-obvious exclusions:
 *  - HU ↔ BG: not adjacent (Serbia between them in non-EU territory → route via RO)
 *  - HR ↔ BG: same (Serbia between → route via HU + RO)
 *  - Any Baltic ↔ Central Europe: must go LT → PL (not via Belarus)
 */

// HAFAS station IDs (same as in capitals.js)
const VIENNA     = '8103000'   // Austria
const SOFIA      = '5500010'   // Bulgaria
const ZAGREB     = '7870041'   // Croatia
const PRAGUE     = '5400001'   // Czech Republic
const TALLINN    = '7700001'   // Estonia
const BUDAPEST   = '5510009'   // Hungary
const RIGA       = '7600001'   // Latvia
const VILNIUS    = '7600010'   // Lithuania
const WARSAW     = '5100067'   // Poland
const BUCHAREST  = '5310034'   // Romania
const BRATISLAVA = '5600020'   // Slovakia
const LJUBLJANA  = '7940200'   // Slovenia

/**
 * Undirected EU-only rail adjacency list.
 * Each entry lists all capitals reachable via direct EU-territory rail.
 */
export const EU_RAIL_GRAPH = {
  [VIENNA]:     [PRAGUE, BRATISLAVA, BUDAPEST, LJUBLJANA],
  [SOFIA]:      [BUCHAREST],
  [ZAGREB]:     [LJUBLJANA, BUDAPEST],
  [PRAGUE]:     [VIENNA, BRATISLAVA, WARSAW],
  [TALLINN]:    [RIGA],
  [BUDAPEST]:   [VIENNA, BRATISLAVA, BUCHAREST, ZAGREB, LJUBLJANA],
  [RIGA]:       [TALLINN, VILNIUS],
  [VILNIUS]:    [RIGA, WARSAW],
  [WARSAW]:     [PRAGUE, BRATISLAVA, VILNIUS],
  [BUCHAREST]:  [SOFIA, BUDAPEST],
  [BRATISLAVA]: [PRAGUE, VIENNA, BUDAPEST, WARSAW],
  [LJUBLJANA]:  [VIENNA, ZAGREB, BUDAPEST],
}

/**
 * BFS shortest path between two HAFAS station IDs within the EU rail graph.
 *
 * Returns an ordered array of INTERMEDIATE station IDs (excluding `fromId`
 * and `toId` themselves).  These intermediate capitals are the Three Seas
 * capitals that a route MUST pass through to stay entirely within EU
 * territory — i.e., they should be submitted as "via" stops to the API.
 *
 * Returns [] when:
 *  - fromId or toId are the same or missing
 *  - the two capitals are directly adjacent (no intermediate needed)
 *  - no path exists in the graph
 *
 * @param {string} fromId
 * @param {string} toId
 * @returns {string[]} ordered list of intermediate HAFAS IDs
 */
export function computeAutoVia(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return []
  if (!EU_RAIL_GRAPH[fromId] || !EU_RAIL_GRAPH[toId]) return []

  // Directly adjacent — a direct train may exist, skip intermediate
  if (EU_RAIL_GRAPH[fromId].includes(toId)) return []

  const visited = new Set([fromId])
  const queue = [[fromId]]   // each entry is the current path

  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]

    for (const neighbor of EU_RAIL_GRAPH[current] ?? []) {
      if (neighbor === toId) {
        // path = [fromId, ...intermediates]; return only the intermediates
        return path.slice(1)
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }

  return []  // no path (graph is connected, so this shouldn't happen)
}
