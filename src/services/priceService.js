/**
 * priceService.js
 *
 * Fetches ticket prices when the primary HAFAS API returns no price.
 *
 * Carriers covered (all Three Seas countries):
 *   1. HAFAS/DB        – re-fetch with tickets=true (pan-European, always tried first)
 *   2. RegioJet        – CZ/SK/HU/AT/PL/HR/SI (public REST API)
 *   3. FlixBus         – all Trójmorze countries, bus+FlixTrain (public internal API)
 *   4. Lux Express     – EE/LV/LT/PL corridor (public REST API)
 *
 * Country coverage by HAFAS prefix:
 *   51 = PL   54 = CZ   55 = HU   56 = SK   52 = BG   53 = RO
 *   78 = HR   79 = SI   81 = AT   24 = LT   25 = LV   26 = EE
 *
 * All HTTP calls use native fetch (works in browser via Vite proxy and in Node).
 * Every carrier function catches all errors and returns null on failure.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

const HAFAS_BASE =
  typeof window !== 'undefined'
    ? '/api'
    : 'https://v6.db.transport.rest'

const REGIOJET_BASE = 'https://brn-ybus-pubapi.sa.cz/restapi'
const FLIXBUS_BASE  = 'https://global.api.flixbus.com'
const LUXEXPRESS_BASE = 'https://api.luxexpress.eu'

// ─── Country helpers ─────────────────────────────────────────────────────────

/** Two-letter HAFAS prefix → ISO country code */
const PREFIX_COUNTRY = {
  '51': 'PL', '54': 'CZ', '55': 'HU', '56': 'SK',
  '52': 'BG', '53': 'RO', '78': 'HR', '79': 'SI',
  '81': 'AT', '24': 'LT', '25': 'LV', '26': 'EE',
}

function countryOf(hafasId) {
  return PREFIX_COUNTRY[hafasId.slice(0, 2)] || null
}

function routeCountries(fromId, toId) {
  return new Set([countryOf(fromId), countryOf(toId)].filter(Boolean))
}

// ─── 1. HAFAS / DB ──────────────────────────────────────────────────────────

/**
 * Re-fetch a journey via HAFAS /journeys?tickets=true.
 * Picks the cheapest ticket from the `tickets` array, or the top-level `price`.
 *
 * @param {string} fromId
 * @param {string} toId
 * @param {string} departureIso  ISO 8601
 * @returns {Promise<{amount:number, currency:string}|null>}
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
    const journey = (data.journeys || [])[0]
    if (!journey) return null

    if (journey.price?.amount != null) {
      return { amount: journey.price.amount, currency: journey.price.currency || 'EUR' }
    }

    const cheapest = (journey.tickets || [])
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

// ─── 2. RegioJet ────────────────────────────────────────────────────────────

/**
 * RegioJet public REST API.
 * Covers CZ, SK, HU, AT, PL, HR, SI routes.
 * Docs: https://brn-ybus-pubapi.sa.cz/restapi/
 */

const REGIOJET_STATION_MAP = {
  '5496001': 1276002,   // Praha hl.n.
  '5600207': 1276009,   // Bratislava hl.st.
  '5500003': 1276131,   // Budapest-Keleti
  '8103000': 1276206,   // Wien Hbf
  '5100065': 1276556,   // Warszawa Centralna
  '7800020': 1276303,   // Zagreb Glavni kolodvor
  '7900003': 1276418,   // Ljubljana
}

const REGIOJET_COUNTRIES = new Set(['CZ', 'SK', 'HU', 'AT', 'PL', 'HR', 'SI'])

/**
 * @param {string} fromHafasId
 * @param {string} toHafasId
 * @param {string} departureIso
 * @returns {Promise<{amount:number, currency:string}|null>}
 */
export async function fetchRegioJetPrice(fromHafasId, toHafasId, departureIso) {
  const fromRj = REGIOJET_STATION_MAP[fromHafasId]
  const toRj   = REGIOJET_STATION_MAP[toHafasId]
  if (!fromRj || !toRj) return null

  try {
    const date = departureIso.slice(0, 10)
    const url = new URL(`${REGIOJET_BASE}/routes/search/simple`)
    url.searchParams.set('tariffs', 'REGULAR')
    url.searchParams.set('fromLocationId', fromRj)
    url.searchParams.set('fromLocationType', 'STATION')
    url.searchParams.set('toLocationId', toRj)
    url.searchParams.set('toLocationType', 'STATION')
    url.searchParams.set('departureDate', date)

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'X-Currency': 'EUR' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const prices = (data.routes || [])
      .flatMap((r) => (r.priceFrom != null ? [r.priceFrom] : []))
      .sort((a, b) => a - b)

    return prices.length ? { amount: prices[0], currency: 'EUR' } : null
  } catch {
    return null
  }
}

// ─── 3. FlixBus ─────────────────────────────────────────────────────────────

/**
 * FlixBus search API (public internal endpoint, used by the FlixBus web app
 * and documented in open-source projects such as github.com/juliuste/flix-rest).
 *
 * Covers all Three Seas countries via bus and FlixTrain services.
 * City IDs verified against FlixBus routing data.
 */

const FLIXBUS_CITY_MAP = {
  '8103000': 2,     // Wien Hbf        → Vienna
  '5200004': 19,    // Sofia           → Sofia
  '7800020': 1137,  // Zagreb          → Zagreb
  '5496001': 15,    // Praha hl.n.     → Prague
  '2600080': 302,   // Tallinn         → Tallinn
  '5500003': 3,     // Budapest-Keleti → Budapest
  '2500009': 168,   // Riga            → Riga
  '2400008': 217,   // Vilnius         → Vilnius
  '5100065': 40,    // Warszawa        → Warsaw
  '5300007': 47,    // Bucuresti Nord  → Bucharest
  '5600207': 26,    // Bratislava      → Bratislava
  '7900003': 1127,  // Ljubljana       → Ljubljana
}

/**
 * @param {string} fromHafasId
 * @param {string} toHafasId
 * @param {string} departureIso
 * @returns {Promise<{amount:number, currency:string}|null>}
 */
export async function fetchFlixBusPrice(fromHafasId, toHafasId, departureIso) {
  const fromCity = FLIXBUS_CITY_MAP[fromHafasId]
  const toCity   = FLIXBUS_CITY_MAP[toHafasId]
  if (!fromCity || !toCity) return null

  try {
    // FlixBus expects date in DD.MM.YYYY format
    const [yyyy, mm, dd] = departureIso.slice(0, 10).split('-')
    const date = `${dd}.${mm}.${yyyy}`

    const url = new URL(`${FLIXBUS_BASE}/search/service/v4/search`)
    url.searchParams.set('from_city_id', fromCity)
    url.searchParams.set('to_city_id', toCity)
    url.searchParams.set('departure_date', date)
    url.searchParams.set('adult', '1')
    url.searchParams.set('_locale', 'en')
    url.searchParams.set('currency', 'EUR')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null

    const data = await res.json()

    // Response: { trips: [{ results: { <id>: { available, price: { total } } } }] }
    const prices = []
    for (const trip of data.trips || []) {
      for (const result of Object.values(trip.results || {})) {
        if (result.available && result.price?.total != null) {
          prices.push(result.price.total)
        }
      }
    }

    prices.sort((a, b) => a - b)
    return prices.length ? { amount: prices[0], currency: 'EUR' } : null
  } catch {
    return null
  }
}

// ─── 4. Lux Express ─────────────────────────────────────────────────────────

/**
 * Lux Express public REST API.
 * Baltic coach operator covering Tallinn – Riga – Vilnius – Warsaw.
 * Docs: https://api.luxexpress.eu/
 */

const LUXEXPRESS_STOP_MAP = {
  '2600080': 1,    // Tallinn  (Balti jaam area)
  '2500009': 2,    // Riga     (Rīgas Starptautiskā autoosta)
  '2400008': 3,    // Vilnius  (Vilniaus autobusų stotis)
  '5100065': 57,   // Warsaw   (Warszawa Zachodnia)
}

const LUXEXPRESS_COUNTRIES = new Set(['EE', 'LV', 'LT', 'PL'])

/**
 * @param {string} fromHafasId
 * @param {string} toHafasId
 * @param {string} departureIso
 * @returns {Promise<{amount:number, currency:string}|null>}
 */
export async function fetchLuxExpressPrice(fromHafasId, toHafasId, departureIso) {
  const fromStop = LUXEXPRESS_STOP_MAP[fromHafasId]
  const toStop   = LUXEXPRESS_STOP_MAP[toHafasId]
  if (!fromStop || !toStop) return null

  try {
    const date = departureIso.slice(0, 10)
    const url = new URL(`${LUXEXPRESS_BASE}/v2/trips`)
    url.searchParams.set('originId', fromStop)
    url.searchParams.set('destinationId', toStop)
    url.searchParams.set('date', date)
    url.searchParams.set('adult', '1')

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null

    const data = await res.json()
    const trips = Array.isArray(data) ? data : (data.trips || data.data || [])

    const prices = trips
      .map((t) => t.price?.adult ?? t.price?.total ?? t.lowestPrice ?? t.minPrice)
      .filter((p) => p != null && p > 0)
      .sort((a, b) => a - b)

    return prices.length ? { amount: prices[0], currency: 'EUR' } : null
  } catch {
    return null
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Determine which carrier fetchers to try for a given route,
 * based on the countries involved.
 *
 * @param {string} fromId
 * @param {string} toId
 * @returns {Array<(fromId:string, toId:string, dep:string) => Promise<{amount,currency}|null>>}
 */
export function carriersForRoute(fromId, toId) {
  const countries = routeCountries(fromId, toId)
  const carriers = [
    // HAFAS tickets=true always tried first
    fetchHafasPrice,
  ]

  // RegioJet: CZ/SK/HU/AT/PL/HR/SI corridor
  if ([...countries].some((c) => REGIOJET_COUNTRIES.has(c))) {
    carriers.push(fetchRegioJetPrice)
  }

  // Lux Express: Baltic + Warsaw
  if ([...countries].some((c) => LUXEXPRESS_COUNTRIES.has(c))) {
    carriers.push(fetchLuxExpressPrice)
  }

  // FlixBus: pan-European fallback for all Three Seas routes
  if (FLIXBUS_CITY_MAP[fromId] && FLIXBUS_CITY_MAP[toId]) {
    carriers.push(fetchFlixBusPrice)
  }

  return carriers
}

/**
 * Enrich journeys that have no price by querying carrier APIs.
 *
 * Tries carriers in sequence for the route, stops at first successful price.
 * Applies the found price to all unpriced journeys.
 *
 * @param {object[]} journeys   Parsed journey objects from trainApi.js
 * @param {string}   fromId     Origin HAFAS station ID
 * @param {string}   toId       Destination HAFAS station ID
 * @returns {Promise<object[]>}
 */
export async function enrichJourneysWithPrices(journeys, fromId, toId) {
  const unpricedIndices = journeys
    .map((j, i) => (j.price == null ? i : -1))
    .filter((i) => i !== -1)

  if (unpricedIndices.length === 0) return journeys

  const departureIso = journeys[unpricedIndices[0]].departure

  let fetchedPrice = null
  for (const fetch of carriersForRoute(fromId, toId)) {
    fetchedPrice = await fetch(fromId, toId, departureIso)
    if (fetchedPrice) break
  }

  if (!fetchedPrice) return journeys

  return journeys.map((j, i) =>
    unpricedIndices.includes(i) ? { ...j, price: fetchedPrice } : j
  )
}
