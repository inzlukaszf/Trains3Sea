import { useState, useCallback } from 'react'
import TrainMap from './components/TrainMap'
import SearchPanel from './components/SearchPanel'
import ConnectionList from './components/ConnectionList'
import { findJourneys } from './services/trainApi'
import { enrichJourneysWithPrices } from './services/priceService'
import { THREE_SEAS_CAPITALS } from './data/capitals'
import './App.css'

function localDatetimeNow() {
  const now = new Date()
  now.setSeconds(0, 0)
  return now.toISOString().slice(0, 16)
}

/** Build a viaStation entry from a capital object */
function capitalToVia(city) {
  return { id: city.hafasId, name: city.name, coords: city.coords }
}

export default function App() {
  const [selectedFrom, setSelectedFrom] = useState(null)
  const [selectedTo, setSelectedTo] = useState(null)

  // viaStations entries: { id, name, coords }
  const [viaStations, setViaStations] = useState([])
  const [departure, setDeparture] = useState(localDatetimeNow)

  const [journeys, setJourneys] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedJourney, setSelectedJourney] = useState(null)

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
      return [...prev, capitalToVia(city)]
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
      let results = await findJourneys(selectedFrom.hafasId, selectedTo.hafasId, {
        departure: dep,
        results: 5,
        viaIds,
      })
      results = await enrichJourneysWithPrices(results, selectedFrom.hafasId, selectedTo.hafasId)
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
