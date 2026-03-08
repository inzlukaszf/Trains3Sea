import { formatTime, formatDate, formatDuration } from '../services/trainApi'

const PRODUCT_LABELS = {
  nationalExpress: 'ICE/EC',
  national: 'IC/EN',
  regionalExp: 'RE',
  regional: 'RB',
  suburban: 'S',
  bus: 'BUS',
  ferry: 'PROM',
  subway: 'METRO',
  tram: 'TRAM',
  taxi: 'TAXI',
}

function LegBadge({ leg }) {
  const label = PRODUCT_LABELS[leg.lineProduct] || leg.lineProduct?.toUpperCase() || 'POCIĄG'
  return (
    <span
      className={`leg-badge leg-badge--${leg.lineProduct || 'train'}`}
      title={leg.lineName}
    >
      {label}
    </span>
  )
}

function TransferArrow({ stop }) {
  return (
    <div className="transfer-arrow">
      <span className="transfer-icon">⇄</span>
      <span className="transfer-station">{stop.name}</span>
    </div>
  )
}

function JourneyCard({ journey, isSelected, onClick }) {
  const dep = formatTime(journey.departure)
  const arr = formatTime(journey.arrival)
  const date = formatDate(journey.departure)
  const duration = formatDuration(journey.durationMin)

  return (
    <div
      className={`journey-card ${isSelected ? 'journey-card--selected' : ''}`}
      onClick={onClick}
      data-testid="journey-card"
    >
      <div className="journey-card__header">
        <span className="journey-time">{dep} → {arr}</span>
        <span className="journey-date">{date}</span>
        <span className="journey-duration">{duration}</span>
      </div>

      <div className="journey-card__transfers">
        {journey.transfers === 0 ? (
          <span className="badge-direct">Bezpośredni</span>
        ) : (
          <span className="badge-transfers">
            {journey.transfers} {journey.transfers === 1 ? 'przesiadka' : 'przesiadki'}
          </span>
        )}
      </div>

      {/* Leg summary */}
      <div className="journey-legs">
        {journey.legs.map((leg, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <TransferArrow stop={journey.legs[i - 1].destination} />}
            <LegBadge leg={leg} />
          </span>
        ))}
      </div>

      {journey.price && (
        <div className="journey-price">
          od {journey.price.amount} {journey.price.currency}
        </div>
      )}
    </div>
  )
}

function LegDetail({ leg, index }) {
  return (
    <div className="leg-detail">
      <div className="leg-detail__header">
        <LegBadge leg={leg} />
        <span className="leg-name">{leg.lineName}</span>
      </div>
      <div className="leg-detail__row">
        <span className="leg-station leg-station--origin">
          {formatTime(leg.departure)} &nbsp; {leg.origin.name}
        </span>
      </div>
      {leg.stopovers.length > 0 && (
        <details className="stopovers">
          <summary>{leg.stopovers.length} pośrednich stacji</summary>
          <ul>
            {leg.stopovers.map((s, i) => (
              <li key={i}>
                {formatTime(s.arrival)} &nbsp; {s.name}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="leg-detail__row">
        <span className="leg-station leg-station--dest">
          {formatTime(leg.arrival)} &nbsp; {leg.destination.name}
        </span>
      </div>
    </div>
  )
}

export default function ConnectionList({
  journeys,
  loading,
  error,
  selectedJourney,
  onSelectJourney,
}) {
  if (loading) {
    return (
      <div className="connection-list connection-list--loading" data-testid="loading">
        <div className="spinner" />
        <p>Wyszukiwanie połączeń...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="connection-list connection-list--error" data-testid="error">
        <p>Błąd: {error}</p>
      </div>
    )
  }

  if (!journeys) {
    return (
      <div className="connection-list connection-list--empty" data-testid="empty">
        <p>Wybierz stację startową i docelową, aby zobaczyć połączenia.</p>
      </div>
    )
  }

  if (journeys.length === 0) {
    return (
      <div className="connection-list connection-list--empty">
        <p>Brak połączeń dla podanych parametrów.</p>
      </div>
    )
  }

  return (
    <div className="connection-list" data-testid="connection-list">
      <div className="journeys-summary">
        <h3>Znaleziono {journeys.length} połączeń</h3>
      </div>

      <div className="journeys-grid">
        {/* Journey list */}
        <div className="journeys-cards">
          {journeys.map((j) => (
            <JourneyCard
              key={j.id}
              journey={j}
              isSelected={selectedJourney?.id === j.id}
              onClick={() => onSelectJourney(j)}
            />
          ))}
        </div>

        {/* Detailed legs for selected journey */}
        {selectedJourney && (
          <div className="journey-detail" data-testid="journey-detail">
            <h4>Szczegóły trasy</h4>
            {selectedJourney.legs.map((leg, i) => (
              <LegDetail key={i} leg={leg} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
