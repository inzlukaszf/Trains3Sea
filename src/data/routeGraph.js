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
 *
 * HAFAS IDs verified against https://v6.db.transport.rest/stops/<id>
 */

// HAFAS station IDs (same as in capitals.js)
const VIENNA     = '8103000'   // Austria      — Wien Hbf
const SOFIA      = '5200004'   // Bulgaria     — Sofia
const ZAGREB     = '7800020'   // Croatia      — Zagreb Glavni kolodvor
const PRAGUE     = '5496001'   // Czech Rep.   — Praha (HAFAS group station → Praha hl.n.)
const TALLINN    = '2600080'   // Estonia      — Tallinn Balti jaam
const BUDAPEST   = '5500003'   // Hungary      — Budapest-Keleti
const RIGA       = '2500009'   // Latvia       — Riga Pass (Rīgas Pasažieru stacija)
const VILNIUS    = '2400008'   // Lithuania    — Vilnius(LT)
const WARSAW     = '5100065'   // Poland       — Warszawa Centralna
const BUCHAREST  = '5300007'   // Romania      — Bucuresti Nord Gara A
const BRATISLAVA = '5600207'   // Slovakia     — Bratislava hl.st.
const LJUBLJANA  = '7900003'   // Slovenia     — Ljubljana

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

/**
 * Build the complete ordered route from `fromId` to `toId`, including both
 * endpoints and all EU-safe intermediate capitals.
 *
 * @param {string} fromId  HAFAS station ID of the departure capital
 * @param {string} toId    HAFAS station ID of the destination capital
 * @returns {string[]}  [fromId, ...intermediate IDs, toId]
 *                      (length 2 when directly adjacent, ≥3 otherwise)
 */
export function buildFullPath(fromId, toId) {
  if (!fromId || !toId) return []
  return [fromId, ...computeAutoVia(fromId, toId), toId]
}
