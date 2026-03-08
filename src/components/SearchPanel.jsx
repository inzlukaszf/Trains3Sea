import { useState } from 'react'
import { THREE_SEAS_CAPITALS } from '../data/capitals'

export default function SearchPanel({
  selectedFrom,
  selectedTo,
  onFromChange,
  onToChange,
  viaStations,
  onViaToggle,
  departure,
  onDepartureChange,
  onSearch,
  loading,
}) {
  const [swapping, setSwapping] = useState(false)

  function swap() {
    setSwapping(true)
    onFromChange(selectedTo)
    onToChange(selectedFrom)
    setTimeout(() => setSwapping(false), 300)
  }

  const availableVia = THREE_SEAS_CAPITALS.filter(
    (c) =>
      c.hafasId !== selectedFrom?.hafasId &&
      c.hafasId !== selectedTo?.hafasId
  )

  const canSearch = selectedFrom && selectedTo && selectedFrom.hafasId !== selectedTo.hafasId

  return (
    <div className="search-panel" data-testid="search-panel">
      <h2 className="search-panel__title">Połączenia kolejowe Trójmorza</h2>

      <div className="search-row">
        {/* FROM */}
        <div className="search-field">
          <label htmlFor="from-select">Skąd</label>
          <select
            id="from-select"
            value={selectedFrom?.hafasId || ''}
            onChange={(e) => {
              const city = THREE_SEAS_CAPITALS.find((c) => c.hafasId === e.target.value)
              onFromChange(city || null)
            }}
          >
            <option value="">— wybierz stolicę —</option>
            {THREE_SEAS_CAPITALS.map((c) => (
              <option key={c.hafasId} value={c.hafasId}>
                {c.flag} {c.capital} ({c.country})
              </option>
            ))}
          </select>
        </div>

        <button
          className="swap-btn"
          onClick={swap}
          title="Zamień kierunek"
          disabled={!selectedFrom && !selectedTo}
        >
          ⇄
        </button>

        {/* TO */}
        <div className="search-field">
          <label htmlFor="to-select">Dokąd</label>
          <select
            id="to-select"
            value={selectedTo?.hafasId || ''}
            onChange={(e) => {
              const city = THREE_SEAS_CAPITALS.find((c) => c.hafasId === e.target.value)
              onToChange(city || null)
            }}
          >
            <option value="">— wybierz stolicę —</option>
            {THREE_SEAS_CAPITALS.map((c) => (
              <option key={c.hafasId} value={c.hafasId}>
                {c.flag} {c.capital} ({c.country})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date/time */}
      <div className="search-row">
        <div className="search-field">
          <label htmlFor="departure-input">Data wyjazdu</label>
          <input
            id="departure-input"
            type="datetime-local"
            value={departure}
            onChange={(e) => onDepartureChange(e.target.value)}
          />
        </div>
      </div>

      {/* Via stations */}
      <div className="via-section">
        <h4>Przesiadki przez stolice (opcjonalne)</h4>
        <p className="via-hint">
          Zaznacz stolice pośrednie lub kliknij znacznik na mapie.
        </p>
        <div className="via-chips">
          {availableVia.map((city) => {
            const active = viaStations.some((v) => v.id === city.hafasId)
            return (
              <button
                key={city.hafasId}
                className={`via-chip ${active ? 'via-chip--active' : ''}`}
                onClick={() => onViaToggle(city)}
                data-testid={`via-chip-${city.hafasId}`}
              >
                {city.flag} {city.capital}
                {active && ' ✓'}
              </button>
            )
          })}
        </div>

        {viaStations.length > 0 && (
          <div className="via-selected">
            <strong>Przez:</strong>{' '}
            {viaStations.map((v) => v.name).join(' → ')}
          </div>
        )}
      </div>

      <button
        className="search-btn"
        onClick={onSearch}
        disabled={!canSearch || loading}
        data-testid="search-btn"
      >
        {loading ? 'Szukam...' : 'Szukaj połączeń'}
      </button>
    </div>
  )
}
