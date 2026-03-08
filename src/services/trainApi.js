import axios from 'axios'
import { format } from 'date-fns'

/**
 * Public HAFAS REST API provided by Jannis R (Derhuerst).
 * Covers DB + most of Europe via Inforansport/RIS network.
 * Docs: https://v6.db.transport.rest/
 */
const BASE_URL = 'https://v6.db.transport.rest'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Accept': 'application/json' },
})

// ─────────────────────────────────────────────────────────────
// Station search
// ─────────────────────────────────────────────────────────────

/**
 * Search for stations by name.
 * @param {string} query
 * @param {object} [options]
 * @param {number} [options.results=5]  max results
 * @returns {Promise<Station[]>}
 */
export async function searchStations(query, { results = 5 } = {}) {
  const response = await apiClient.get('/locations', {
    params: { query, results, stops: true, addresses: false, poi: false },
  })
  return response.data.filter((loc) => loc.type === 'stop' || loc.type === 'station')
}

// ─────────────────────────────────────────────────────────────
// Journey / connections
// ─────────────────────────────────────────────────────────────

/**
 * Find journeys (with possible transfers) between two stations.
 *
 * @param {string} fromId   HAFAS station ID
 * @param {string} toId     HAFAS station ID
 * @param {object} [options]
 * @param {Date}   [options.departure]   desired departure (default: now)
 * @param {number} [options.results=3]   number of journeys to return
 * @param {string[]} [options.viaIds]    list of HAFAS station IDs to route via
 * @returns {Promise<Journey[]>}
 */
export async function findJourneys(fromId, toId, { departure, results = 3, viaIds = [] } = {}) {
  const dep = departure || new Date()

  const params = {
    from: fromId,
    to: toId,
    departure: dep.toISOString(),
    results,
    stopovers: true,
    remarks: false,
    language: 'pl',
  }

  // The v6 API supports a single `via` parameter
  if (viaIds.length > 0) {
    params.via = viaIds[0]
  }

  const response = await apiClient.get('/journeys', { params })
  return parseJourneys(response.data.journeys || [])
}

// ─────────────────────────────────────────────────────────────
// Parsing helpers
// ─────────────────────────────────────────────────────────────

/**
 * Normalise raw HAFAS journey objects into a simpler shape
 * @param {object[]} rawJourneys
 * @returns {Journey[]}
 */
function parseJourneys(rawJourneys) {
  return rawJourneys.map((journey, idx) => {
    const legs = (journey.legs || []).map(parseLeg)
    const transfers = legs.length - 1

    const departureTime = legs[0]?.departure
    const arrivalTime = legs[legs.length - 1]?.arrival
    const durationMs = departureTime && arrivalTime
      ? new Date(arrivalTime) - new Date(departureTime)
      : null
    const durationMin = durationMs ? Math.round(durationMs / 60000) : null

    // Intermediate transfer stops (where passenger changes trains)
    const transferStops = legs.slice(0, -1).map((leg) => leg.destination)

    return {
      id: idx,
      legs,
      transfers,
      transferStops,
      departure: departureTime,
      arrival: arrivalTime,
      durationMin,
      price: journey.price || null,
    }
  })
}

function parseLeg(leg) {
  return {
    id: leg.tripId || null,
    lineName: leg.line?.name || leg.line?.fahrtNr || 'Nieznana',
    lineProduct: leg.line?.product || 'train',
    mode: leg.mode || 'train',
    origin: {
      id: leg.origin?.id,
      name: leg.origin?.name,
      coords: coordsFromStop(leg.origin),
    },
    destination: {
      id: leg.destination?.id,
      name: leg.destination?.name,
      coords: coordsFromStop(leg.destination),
    },
    departure: leg.departure || leg.plannedDeparture,
    arrival: leg.arrival || leg.plannedArrival,
    plannedDeparture: leg.plannedDeparture,
    plannedArrival: leg.plannedArrival,
    stopovers: (leg.stopovers || []).map((s) => ({
      id: s.stop?.id,
      name: s.stop?.name,
      coords: coordsFromStop(s.stop),
      arrival: s.arrival || s.plannedArrival,
      departure: s.departure || s.plannedDeparture,
    })),
    isWalking: leg.walking === true,
  }
}

function coordsFromStop(stop) {
  if (!stop?.location) return null
  return [stop.location.latitude, stop.location.longitude]
}

// ─────────────────────────────────────────────────────────────
// Formatting helpers (used by UI)
// ─────────────────────────────────────────────────────────────

export function formatTime(isoString) {
  if (!isoString) return '—'
  return format(new Date(isoString), 'HH:mm')
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  return format(new Date(isoString), 'dd.MM.yyyy')
}

export function formatDuration(minutes) {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} godz. ${m} min` : `${m} min`
}
