/**
 * priceService.js
 *
 * Fetches ticket prices when the primary HAFAS API returns no price.
 *
 * Strategy (in order):
 *   1. Re-fetch the journey via HAFAS /journeys with tickets=true to get DB pricing.
 *   2. If the journey passes through Czech/Slovak corridor, try RegioJet public API.
 *   3. Return null if no carrier returns pricing.
 *
 * All HTTP calls use native fetch so this works both in Node (tests/SSR) and
 * the browser (via the Vite proxy for same-origin requests).
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const HAFAS_BASE =
  typeof window !== 'undefined'
    ? '/api'
    : 'https://v6.db.transport.rest'

const REGIOJET_BASE = 'https://brn-ybus-pubapi.sa.cz/restapi'

// Country prefix ranges for HAFAS station IDs (first digit of 7-digit ID)
// Used to decide which carrier APIs to try.
const COUNTRY_PREFIX = {
  '5': ['CZ', 'SK', 'PL', 'RO', 'BG', 'HU'],  // Central/Eastern European HAFAS bloc
  '7': ['HR', 'SI'],                             // ex-Yugoslav bloc
  '2': ['EE', 'LV', 'LT'],                       // Baltic bloc
  '8': ['AT', 'DE'],                             // DACH bloc
}

/**
 * Determine if a route passes through the Czech/Slovak corridor.
 * RegioJet covers CZ + SK stations (hafasId prefix '54' or '56').
 * @param {string} fromId
 * @param {string} toId
 */
function isRegioJetRoute(fromId, toId) {
  const CZ_SK = (id) => id.startsWith('54') || id.startsWith('56')
  return CZ_SK(fromId) || CZ_SK(toId)
}

// ─── HAFAS ticket re-fetch ───────────────────────────────────────────────────

/**
 * Re-fetch a journey via HAFAS /journeys with tickets=true.
 * Returns the lowest-priced ticket found, or null.
 *
 * @param {string} fromId
 * @param {string} toId
 * @param {string} departureIso  ISO 8601 departure timestamp
 * @returns {Promise<{amount: number, currency: string}|null>}
 */
export async function fetchHafasPrice(fromId, toId, departureIso) {
  try {
    const url = new URL(`${HAFAS_BASE}/journeys`)
    url.searchParams.set('from', fromId)
    url.searchParams.set('to', toId)
    url.searchParams.set('departure', departureIso)
    url.searchParams.set('results', '1')
    url.searchParams.set('tickets', 'true')
    url.searchParams.set('stopovers', 'false')
    url.searchParams.set('remarks', 'false')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const journeys = data.journeys || []
    if (journeys.length === 0) return null

    const journey = journeys[0]

    // Try top-level price field first
    if (journey.price?.amount != null) {
      return { amount: journey.price.amount, currency: journey.price.currency || 'EUR' }
    }

    // Then try the tickets array — pick the cheapest
    const tickets = journey.tickets || []
    const cheapest = tickets
      .filter((t) => t.price?.amount != null)
      .sort((a, b) => a.price.amount - b.price.amount)[0]

    if (cheapest) {
      return { amount: cheapest.price.amount, currency: cheapest.price.currency || 'EUR' }
    }

    return null
  } catch {
    return null
  }
}

// ─── RegioJet API ───────────────────────────────────────────────────────────

/**
 * Search RegioJet for prices on Czech/Slovak routes.
 *
 * RegioJet public REST API:
 *   GET /routes/search/simple?tariffs=REGULAR&fromLocationId=<id>&fromLocationType=STATION
 *                             &toLocationId=<id>&toLocationType=STATION&departureDate=YYYY-MM-DD
 *
 * RegioJet uses its own station ID system; we map the few Three-Seas capitals
 * that it serves (Prague, Bratislava).
 *
 * @param {string} fromHafasId
 * @param {string} toHafasId
 * @param {string} departureIso
 * @returns {Promise<{amount: number, currency: string}|null>}
 */

// Mapping from HAFAS IDs to RegioJet station IDs for Three-Seas capitals
const REGIOJET_STATION_MAP = {
  '5496001': 1276002,   // Praha hl.n.
  '5600207': 1276009,   // Bratislava hl.st.
  '5500003': 1276131,   // Budapest-Keleti
  '8103000': 1276206,   // Wien Hbf
  '5100065': 1276556,   // Warszawa Centralna
}

export async function fetchRegioJetPrice(fromHafasId, toHafasId, departureIso) {
  const fromRj = REGIOJET_STATION_MAP[fromHafasId]
  const toRj = REGIOJET_STATION_MAP[toHafasId]
  if (!fromRj || !toRj) return null

  try {
    const date = departureIso.slice(0, 10) // YYYY-MM-DD
    const url = new URL(`${REGIOJET_BASE}/routes/search/simple`)
    url.searchParams.set('tariffs', 'REGULAR')
    url.searchParams.set('fromLocationId', fromRj)
    url.searchParams.set('fromLocationType', 'STATION')
    url.searchParams.set('toLocationId', toRj)
    url.searchParams.set('toLocationType', 'STATION')
    url.searchParams.set('departureDate', date)

    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'X-Currency': 'EUR',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const routes = data.routes || []
    if (routes.length === 0) return null

    // Pick the cheapest price from the first available departure
    const prices = routes
      .flatMap((r) => r.priceFrom != null ? [r.priceFrom] : [])
      .sort((a, b) => a - b)

    if (prices.length === 0) return null
    return { amount: prices[0], currency: 'EUR' }
  } catch {
    return null
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Enrich journeys that have no price by fetching from carrier APIs.
 *
 * @param {object[]} journeys   Parsed journey objects from trainApi.js
 * @param {string}   fromId     Origin HAFAS station ID
 * @param {string}   toId       Destination HAFAS station ID
 * @returns {Promise<object[]>} Same journeys array, prices filled where possible
 */
export async function enrichJourneysWithPrices(journeys, fromId, toId) {
  const unpricedIndices = journeys
    .map((j, i) => (j.price == null ? i : -1))
    .filter((i) => i !== -1)

  if (unpricedIndices.length === 0) return journeys

  // Use the departure time of the first unpriced journey for the API query
  const firstUnpriced = journeys[unpricedIndices[0]]
  const departureIso = firstUnpriced.departure

  // Try carriers in sequence; stop as soon as one returns a price
  let fetchedPrice = null

  // 1. HAFAS tickets=true
  fetchedPrice = await fetchHafasPrice(fromId, toId, departureIso)

  // 2. RegioJet (CZ/SK corridor)
  if (!fetchedPrice && isRegioJetRoute(fromId, toId)) {
    fetchedPrice = await fetchRegioJetPrice(fromId, toId, departureIso)
  }

  if (!fetchedPrice) return journeys

  // Apply the fetched price to all journeys that had no price
  return journeys.map((j, i) =>
    unpricedIndices.includes(i) ? { ...j, price: fetchedPrice } : j
  )
}
