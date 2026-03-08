import { useState, useCallback, useEffect } from 'react'
import TrainMap from './components/TrainMap'
import SearchPanel from './components/SearchPanel'
import ConnectionList from './components/ConnectionList'
import { findJourneys } from './services/trainApi'
import { THREE_SEAS_CAPITALS, CAPITAL_BY_HAFAS_ID } from './data/capitals'
import { computeAutoVia } from './data/routeGraph'
import './App.css'

function localDatetimeNow() {
  const now = new Date()
  now.setSeconds(0, 0)
  return now.toISOString().slice(0, 16)
}

/** Build a viaStation entry from a capital object */
function capitalToVia(city, auto = false) {
  return { id: city.hafasId, name: city.name, coords: city.coords, auto }
}

export default function App() {
  const [selectedFrom, setSelectedFrom] = useState(null)
  const [selectedTo, setSelectedTo] = useState(null)

  // viaStations entries: { id, name, coords, auto }
  // auto=true  → added by the geographic EU-route algorithm
  // auto=false → added manually by the user
  const [viaStations, setViaStations] = useState([])
  const [departure, setDeparture] = useState(localDatetimeNow)

  const [journeys, setJourneys] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedJourney, setSelectedJourney] = useState(null)

  // ── Auto-via: recompute whenever from/to changes ───────────────────────
  useEffect(() => {
    if (!selectedFrom || !selectedTo) {
      setViaStations((prev) => prev.filter((v) => !v.auto))
      return
    }

    const autoIds = computeAutoVia(selectedFrom.hafasId, selectedTo.hafasId)

    setViaStations((prev) => {
      const manual = prev.filter(
        (v) =>
          !v.auto &&
          v.id !== selectedFrom.hafasId &&
          v.id !== selectedTo.hafasId
      )
      const manualIds = new Set(manual.map((v) => v.id))
      const autoVia = autoIds
        .filter((id) => !manualIds.has(id))
        .map((id) => capitalToVia(CAPITAL_BY_HAFAS_ID[id], true))
        .filter(Boolean)

      return [...autoVia, ...manual]
    })
  }, [selectedFrom, selectedTo])

  // ── Capital click on map — cycle: from → to ────────────────────────────
  const handleCapitalClick = useCallback((city) => {
    if (!selectedFrom) {
      setSelectedFrom(city)
    } else if (!selectedTo && city.hafasId !== selectedFrom.hafasId) {
      setSelectedTo(city)
    }
  }, [selectedFrom, selectedTo])

  // ── Via toggle (manual) ────────────────────────────────────────────────
  const handleViaToggle = useCallback((city) => {
    setViaStations((prev) => {
      const existing = prev.find((v) => v.id === city.hafasId)
      if (existing) {
        return prev.filter((v) => v.id !== city.hafasId)
      }
      return [...prev, capitalToVia(city, false)]
    })
  }, [])

  // ── Search ─────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!selectedFrom || !selectedTo) return
    setLoading(true)
    setError(null)
    setJourneys(null)
    setSelectedJourney(null)

    try {
      const dep = departure ? new Date(departure) : new Date()
      const viaIds = viaStations.map((v) => v.id)
      const results = await findJourneys(selectedFrom.hafasId, selectedTo.hafasId, {
        departure: dep,
        results: 5,
        viaIds,
      })
      setJourneys(results)
      if (results.length > 0) setSelectedJourney(results[0])
    } catch (err) {
      setError(err.message || 'Nieznany błąd')
    } finally {
      setLoading(false)
    }
  }, [selectedFrom, selectedTo, departure, viaStations])

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <SearchPanel
          selectedFrom={selectedFrom}
          selectedTo={selectedTo}
          onFromChange={setSelectedFrom}
          onToChange={setSelectedTo}
          viaStations={viaStations}
          onViaToggle={handleViaToggle}
          departure={departure}
          onDepartureChange={setDeparture}
          onSearch={handleSearch}
          loading={loading}
        />
        <ConnectionList
          journeys={journeys}
          loading={loading}
          error={error}
          selectedJourney={selectedJourney}
          onSelectJourney={setSelectedJourney}
        />
      </aside>

      <main className="map-area">
        <TrainMap
          capitals={THREE_SEAS_CAPITALS}
          selectedFrom={selectedFrom}
          selectedTo={selectedTo}
          onCapitalClick={handleCapitalClick}
          viaStations={viaStations}
          onViaToggle={handleViaToggle}
          activeJourney={selectedJourney}
        />
      </main>
    </div>
  )
}
