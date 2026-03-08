/**
 * Realistic fixtures mirroring the v6.db.transport.rest API shape.
 */

export const STATION_WARSAW = {
  type: 'stop',
  id: '5100067',
  name: 'Warszawa Centralna',
  location: { type: 'location', latitude: 52.2297, longitude: 21.0122 },
}

export const STATION_BERLIN = {
  type: 'stop',
  id: '8011160',
  name: 'Berlin Hbf',
  location: { type: 'location', latitude: 52.525, longitude: 13.3694 },
}

export const STATION_VIENNA = {
  type: 'stop',
  id: '8103000',
  name: 'Wien Hbf',
  location: { type: 'location', latitude: 48.1851, longitude: 16.3760 },
}

export const LOCATIONS_RESPONSE_WARSAW = [
  STATION_WARSAW,
  {
    type: 'stop',
    id: '5100065',
    name: 'Warszawa Wschodnia',
    location: { type: 'location', latitude: 52.2523, longitude: 21.0449 },
  },
]

/** Single direct leg Warsaw → Vienna */
const directLeg = {
  origin: STATION_WARSAW,
  destination: STATION_VIENNA,
  departure: '2025-06-15T08:20:00+02:00',
  plannedDeparture: '2025-06-15T08:20:00+02:00',
  arrival: '2025-06-15T16:45:00+02:00',
  plannedArrival: '2025-06-15T16:45:00+02:00',
  mode: 'train',
  line: { name: 'EC 144', fahrtNr: '144', product: 'national' },
  tripId: 'trip-ec-144',
  stopovers: [
    {
      stop: {
        id: '5400001', name: 'Praha hl.n.',
        location: { type: 'location', latitude: 50.0831, longitude: 14.4349 },
      },
      arrival: '2025-06-15T11:30:00+02:00',
      departure: '2025-06-15T11:35:00+02:00',
      plannedArrival: '2025-06-15T11:30:00+02:00',
      plannedDeparture: '2025-06-15T11:35:00+02:00',
    },
  ],
  walking: false,
}

/** Two-leg journey Warsaw → Berlin + Berlin → Vienna */
const legWarsawBerlin = {
  origin: STATION_WARSAW,
  destination: STATION_BERLIN,
  departure: '2025-06-15T07:00:00+02:00',
  plannedDeparture: '2025-06-15T07:00:00+02:00',
  arrival: '2025-06-15T10:15:00+02:00',
  plannedArrival: '2025-06-15T10:15:00+02:00',
  mode: 'train',
  line: { name: 'ICE 43', fahrtNr: '43', product: 'nationalExpress' },
  tripId: 'trip-ice-43',
  stopovers: [],
  walking: false,
}

const legBerlinVienna = {
  origin: STATION_BERLIN,
  destination: STATION_VIENNA,
  departure: '2025-06-15T11:00:00+02:00',
  plannedDeparture: '2025-06-15T11:00:00+02:00',
  arrival: '2025-06-15T17:30:00+02:00',
  plannedArrival: '2025-06-15T17:30:00+02:00',
  mode: 'train',
  line: { name: 'RJX 761', fahrtNr: '761', product: 'nationalExpress' },
  tripId: 'trip-rjx-761',
  stopovers: [],
  walking: false,
}

export const JOURNEYS_RESPONSE = {
  journeys: [
    { legs: [directLeg], price: { amount: 89, currency: 'EUR' } },
    { legs: [legWarsawBerlin, legBerlinVienna], price: null },
  ],
}

export const JOURNEYS_RESPONSE_EMPTY = { journeys: [] }
