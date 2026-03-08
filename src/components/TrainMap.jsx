import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_CENTER, MAP_ZOOM } from '../data/capitals'

// Fix default Leaflet icon paths broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CAPITAL_ICON = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'capital-marker',
})

const VIA_ICON = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33],
  className: 'via-marker',
})

/** Adjusts map view to fit all journey leg coords */
function MapFitter({ coords }) {
  const map = useMap()
  useEffect(() => {
    if (coords && coords.length > 1) {
      map.fitBounds(coords, { padding: [40, 40] })
    }
  }, [coords, map])
  return null
}

/**
 * Collect all lat/lng points from a journey to draw route polylines.
 * Exported for unit testing.
 *
 * @param {object|null} journey  - parsed journey object (from trainApi)
 * @returns {{ points: number[][], lineName: string }[]}
 */
export function journeyToPolylines(journey) {
  if (!journey) return []
  return journey.legs
    .filter((leg) => !leg.isWalking)
    .map((leg) => {
      const points = []
      if (leg.origin.coords) points.push(leg.origin.coords)
      leg.stopovers.forEach((s) => { if (s.coords) points.push(s.coords) })
      if (leg.destination.coords) points.push(leg.destination.coords)
      return { points, lineName: leg.lineName }
    })
    .filter((seg) => seg.points.length >= 2)
}

const LINE_COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261']

export default function TrainMap({
  capitals,
  selectedFrom,
  selectedTo,
  onCapitalClick,
  viaStations,
  onViaToggle,
  activeJourney,
}) {
  const polylines = journeyToPolylines(activeJourney)

  // All points along the active journey for auto-fit
  const allJourneyCoords = polylines.flatMap((s) => s.points)

  // Transfer stop coords from API journey
  const transferCoords = activeJourney
    ? activeJourney.transferStops.map((s) => s.coords).filter(Boolean)
    : []

  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      style={{ height: '100%', width: '100%' }}
      data-testid="train-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {allJourneyCoords.length > 1 && (
        <MapFitter coords={allJourneyCoords} />
      )}

      {/* Journey route polylines */}
      {polylines.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.points}
          pathOptions={{ color: LINE_COLORS[i % LINE_COLORS.length], weight: 4, opacity: 0.8 }}
        />
      ))}

      {/* Capital markers */}
      {capitals.map((city) => {
        const isFrom = selectedFrom?.hafasId === city.hafasId
        const isTo = selectedTo?.hafasId === city.hafasId
        const isVia = viaStations.some((v) => v.id === city.hafasId)

        return (
          <Marker
            key={city.hafasId}
            position={city.coords}
            icon={CAPITAL_ICON}
            eventHandlers={{ click: () => onCapitalClick(city) }}
          >
            <Popup>
              <div
                style={{ minWidth: 160 }}
                data-testid={`popup-${city.hafasId}`}
                data-hafas-id={city.hafasId}
              >
                <strong>{city.flag} {city.capital}</strong>
                <div style={{ fontSize: 12, color: '#666' }}>{city.country}</div>
                <div style={{ fontSize: 12 }}>{city.name}</div>
                <div
                  style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}
                  data-testid={`badges-${city.hafasId}`}
                >
                  {isFrom && (
                    <span
                      className="badge badge-from"
                      data-testid={`badge-from-${city.hafasId}`}
                    >
                      Skąd
                    </span>
                  )}
                  {isTo && (
                    <span
                      className="badge badge-to"
                      data-testid={`badge-to-${city.hafasId}`}
                    >
                      Dokąd
                    </span>
                  )}
                  {isVia && (
                    <span
                      className="badge badge-via"
                      data-testid={`badge-via-${city.hafasId}`}
                    >
                      Przez
                    </span>
                  )}
                </div>
                {!isFrom && !isTo && (
                  <button
                    className="btn-via"
                    onClick={(e) => { e.stopPropagation(); onViaToggle(city) }}
                  >
                    {isVia ? 'Usuń przesiadkę' : 'Dodaj jako przesiadkę'}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}

      {/* Transfer stop markers from API response */}
      {transferCoords.map((coord, i) => (
        <Marker key={`transfer-${i}`} position={coord} icon={VIA_ICON}>
          <Popup>
            <strong>Przesiadka:</strong>{' '}
            {activeJourney.transferStops[i]?.name}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
