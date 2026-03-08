import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConnectionList from '../components/ConnectionList'
import SearchPanel from '../components/SearchPanel'
import TrainMap from '../components/TrainMap'
import { THREE_SEAS_CAPITALS } from '../data/capitals'

// ─────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────
const JOURNEY_DIRECT = {
  id: 0,
  departure: '2025-06-15T08:20:00+02:00',
  arrival: '2025-06-15T16:45:00+02:00',
  durationMin: 505,
  transfers: 0,
  transferStops: [],
  price: { amount: 89, currency: 'EUR' },
  legs: [
    {
      lineName: 'EC 144',
      lineProduct: 'national',
      mode: 'train',
      origin: { id: '5100067', name: 'Warszawa Centralna', coords: [52.23, 21.01] },
      destination: { id: '8103000', name: 'Wien Hbf', coords: [48.19, 16.38] },
      departure: '2025-06-15T08:20:00+02:00',
      arrival: '2025-06-15T16:45:00+02:00',
      plannedDeparture: '2025-06-15T08:20:00+02:00',
      plannedArrival: '2025-06-15T16:45:00+02:00',
      stopovers: [],
      isWalking: false,
    },
  ],
}

const JOURNEY_TRANSFER = {
  id: 1,
  departure: '2025-06-15T07:00:00+02:00',
  arrival: '2025-06-15T17:30:00+02:00',
  durationMin: 630,
  transfers: 1,
  transferStops: [{ id: '8011160', name: 'Berlin Hbf', coords: [52.53, 13.37] }],
  price: null,
  legs: [
    {
      lineName: 'ICE 43',
      lineProduct: 'nationalExpress',
      mode: 'train',
      origin: { id: '5100067', name: 'Warszawa Centralna', coords: [52.23, 21.01] },
      destination: { id: '8011160', name: 'Berlin Hbf', coords: [52.53, 13.37] },
      departure: '2025-06-15T07:00:00+02:00',
      arrival: '2025-06-15T10:15:00+02:00',
      plannedDeparture: '2025-06-15T07:00:00+02:00',
      plannedArrival: '2025-06-15T10:15:00+02:00',
      stopovers: [],
      isWalking: false,
    },
    {
      lineName: 'RJX 761',
      lineProduct: 'nationalExpress',
      mode: 'train',
      origin: { id: '8011160', name: 'Berlin Hbf', coords: [52.53, 13.37] },
      destination: { id: '8103000', name: 'Wien Hbf', coords: [48.19, 16.38] },
      departure: '2025-06-15T11:00:00+02:00',
      arrival: '2025-06-15T17:30:00+02:00',
      plannedDeparture: '2025-06-15T11:00:00+02:00',
      plannedArrival: '2025-06-15T17:30:00+02:00',
      stopovers: [],
      isWalking: false,
    },
  ],
}

// ═════════════════════════════════════════════════════════════
// ConnectionList
// ═════════════════════════════════════════════════════════════
describe('ConnectionList', () => {
  it('shows loading spinner when loading=true', () => {
    render(<ConnectionList loading={true} />)
    expect(screen.getByTestId('loading')).toBeInTheDocument()
    expect(screen.getByText(/wyszukiwanie połączeń/i)).toBeInTheDocument()
  })

  it('shows error message when error is provided', () => {
    render(<ConnectionList loading={false} error="Brak połączenia z siecią" />)
    const errEl = screen.getByTestId('error')
    expect(errEl).toBeInTheDocument()
    expect(errEl).toHaveTextContent('Brak połączenia z siecią')
  })

  it('shows empty state when journeys is null (initial state)', () => {
    render(<ConnectionList loading={false} />)
    expect(screen.getByTestId('empty')).toBeInTheDocument()
  })

  it('shows empty message when journeys array is empty', () => {
    render(<ConnectionList loading={false} journeys={[]} />)
    expect(screen.getByText(/brak połączeń/i)).toBeInTheDocument()
  })

  it('renders journey cards for each journey', () => {
    render(
      <ConnectionList
        loading={false}
        journeys={[JOURNEY_DIRECT, JOURNEY_TRANSFER]}
        onSelectJourney={vi.fn()}
      />
    )
    const cards = screen.getAllByTestId('journey-card')
    expect(cards).toHaveLength(2)
  })

  it('shows "Bezpośredni" badge for direct journey', () => {
    render(
      <ConnectionList loading={false} journeys={[JOURNEY_DIRECT]} onSelectJourney={vi.fn()} />
    )
    expect(screen.getByText('Bezpośredni')).toBeInTheDocument()
  })

  it('shows transfer count badge for multi-leg journey', () => {
    render(
      <ConnectionList loading={false} journeys={[JOURNEY_TRANSFER]} onSelectJourney={vi.fn()} />
    )
    expect(screen.getByText(/1 przesiadka/i)).toBeInTheDocument()
  })

  it('calls onSelectJourney when a card is clicked', async () => {
    const handler = vi.fn()
    render(
      <ConnectionList loading={false} journeys={[JOURNEY_DIRECT]} onSelectJourney={handler} />
    )
    await userEvent.click(screen.getByTestId('journey-card'))
    expect(handler).toHaveBeenCalledWith(JOURNEY_DIRECT)
  })

  it('shows journey detail panel for selected journey', () => {
    render(
      <ConnectionList
        loading={false}
        journeys={[JOURNEY_DIRECT]}
        selectedJourney={JOURNEY_DIRECT}
        onSelectJourney={vi.fn()}
      />
    )
    expect(screen.getByTestId('journey-detail')).toBeInTheDocument()
    expect(screen.getByText('Szczegóły trasy')).toBeInTheDocument()
    expect(screen.getByText('EC 144')).toBeInTheDocument()
  })

  it('shows price when available', () => {
    render(
      <ConnectionList loading={false} journeys={[JOURNEY_DIRECT]} onSelectJourney={vi.fn()} />
    )
    expect(screen.getByText(/89/)).toBeInTheDocument()
    expect(screen.getByText(/EUR/)).toBeInTheDocument()
  })

  it('highlights selected journey card', () => {
    render(
      <ConnectionList
        loading={false}
        journeys={[JOURNEY_DIRECT, JOURNEY_TRANSFER]}
        selectedJourney={JOURNEY_TRANSFER}
        onSelectJourney={vi.fn()}
      />
    )
    const cards = screen.getAllByTestId('journey-card')
    expect(cards[1]).toHaveClass('journey-card--selected')
    expect(cards[0]).not.toHaveClass('journey-card--selected')
  })
})

// ═════════════════════════════════════════════════════════════
// SearchPanel
// ═════════════════════════════════════════════════════════════
describe('SearchPanel', () => {
  const defaultProps = {
    selectedFrom: null,
    selectedTo: null,
    onFromChange: vi.fn(),
    onToChange: vi.fn(),
    viaStations: [],
    onViaToggle: vi.fn(),
    departure: '2025-06-15T08:00',
    onDepartureChange: vi.fn(),
    onSearch: vi.fn(),
    loading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders from/to selects and search button', () => {
    render(<SearchPanel {...defaultProps} />)
    expect(screen.getByLabelText(/skąd/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/dokąd/i)).toBeInTheDocument()
    expect(screen.getByTestId('search-btn')).toBeInTheDocument()
  })

  it('search button is disabled when no from/to selected', () => {
    render(<SearchPanel {...defaultProps} />)
    expect(screen.getByTestId('search-btn')).toBeDisabled()
  })

  it('search button is enabled when both from and to are selected', () => {
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[3]}
      />
    )
    expect(screen.getByTestId('search-btn')).not.toBeDisabled()
  })

  it('calls onFromChange when from select changes', async () => {
    const handler = vi.fn()
    render(<SearchPanel {...defaultProps} onFromChange={handler} />)
    await userEvent.selectOptions(
      screen.getByLabelText(/skąd/i),
      THREE_SEAS_CAPITALS[0].hafasId
    )
    expect(handler).toHaveBeenCalledWith(THREE_SEAS_CAPITALS[0])
  })

  it('calls onToChange when to select changes', async () => {
    const handler = vi.fn()
    render(<SearchPanel {...defaultProps} onToChange={handler} />)
    await userEvent.selectOptions(
      screen.getByLabelText(/dokąd/i),
      THREE_SEAS_CAPITALS[3].hafasId
    )
    expect(handler).toHaveBeenCalledWith(THREE_SEAS_CAPITALS[3])
  })

  it('renders via chips for all capitals not selected as from/to', () => {
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[1]}
      />
    )
    // 12 capitals total, minus 2 (from+to) = 10 via chips
    const allChips = document.querySelectorAll('.via-chip')
    expect(allChips.length).toBe(10)
  })

  it('calls onViaToggle when a via chip is clicked', async () => {
    const handler = vi.fn()
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[1]}
        onViaToggle={handler}
      />
    )
    const chips = document.querySelectorAll('.via-chip')
    await userEvent.click(chips[0])
    expect(handler).toHaveBeenCalled()
  })

  it('marks active via chip with --active class', () => {
    const viaCity = THREE_SEAS_CAPITALS[3]
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[1]}
        viaStations={[{ id: viaCity.hafasId, name: viaCity.name }]}
      />
    )
    const chip = document.querySelector(`[data-testid="via-chip-${viaCity.hafasId}"]`)
    expect(chip).toHaveClass('via-chip--active')
  })

  it('shows loading text on search button when loading=true', () => {
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[3]}
        loading={true}
      />
    )
    expect(screen.getByTestId('search-btn')).toHaveTextContent('Szukam...')
    expect(screen.getByTestId('search-btn')).toBeDisabled()
  })

  it('calls onSearch when search button clicked', async () => {
    const handler = vi.fn()
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[3]}
        onSearch={handler}
      />
    )
    await userEvent.click(screen.getByTestId('search-btn'))
    expect(handler).toHaveBeenCalled()
  })

  it('shows via selected summary when via stations exist', () => {
    const via = THREE_SEAS_CAPITALS[3]
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[1]}
        viaStations={[{ id: via.hafasId, name: via.name }]}
      />
    )
    expect(screen.getByText(new RegExp(via.name))).toBeInTheDocument()
  })

  it('auto-via chip has via-chip--auto and via-chip--active classes', () => {
    const autoCity = THREE_SEAS_CAPITALS[3]
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[1]}
        viaStations={[{ id: autoCity.hafasId, name: autoCity.name, auto: true }]}
      />
    )
    const chip = document.querySelector(`[data-testid="via-chip-${autoCity.hafasId}"]`)
    expect(chip).toHaveClass('via-chip--auto')
    expect(chip).toHaveClass('via-chip--active')
  })

  it('manual via chip does not have via-chip--auto class', () => {
    const manualCity = THREE_SEAS_CAPITALS[3]
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[1]}
        viaStations={[{ id: manualCity.hafasId, name: manualCity.name, auto: false }]}
      />
    )
    const chip = document.querySelector(`[data-testid="via-chip-${manualCity.hafasId}"]`)
    expect(chip).not.toHaveClass('via-chip--auto')
    expect(chip).toHaveClass('via-chip--active')
  })

  it('shows EU-routing hint when auto-via stations are present', () => {
    const autoCity = THREE_SEAS_CAPITALS[3]
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[1]}
        viaStations={[{ id: autoCity.hafasId, name: autoCity.name, auto: true }]}
      />
    )
    expect(screen.getByTestId('auto-via-hint')).toBeInTheDocument()
  })

  it('shows EU badge inside auto-via chip', () => {
    const autoCity = THREE_SEAS_CAPITALS[3]
    render(
      <SearchPanel
        {...defaultProps}
        selectedFrom={THREE_SEAS_CAPITALS[0]}
        selectedTo={THREE_SEAS_CAPITALS[1]}
        viaStations={[{ id: autoCity.hafasId, name: autoCity.name, auto: true }]}
      />
    )
    const chip = document.querySelector(`[data-testid="via-chip-${autoCity.hafasId}"]`)
    expect(chip.querySelector('.via-chip__badge')).not.toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════
// TrainMap (mocked via setup.js)
// ═════════════════════════════════════════════════════════════
describe('TrainMap', () => {
  const defaultProps = {
    capitals: THREE_SEAS_CAPITALS,
    selectedFrom: null,
    selectedTo: null,
    onCapitalClick: vi.fn(),
    viaStations: [],
    onViaToggle: vi.fn(),
    activeJourney: null,
  }

  it('renders map container', () => {
    render(<TrainMap {...defaultProps} />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('renders a marker for each capital', () => {
    render(<TrainMap {...defaultProps} />)
    const markers = screen.getAllByTestId('marker')
    expect(markers.length).toBe(THREE_SEAS_CAPITALS.length)
  })

  it('renders country name in each popup', () => {
    render(<TrainMap {...defaultProps} />)
    // Each capital's country should appear in a popup
    expect(screen.getByText('Austria')).toBeInTheDocument()
    expect(screen.getByText('Polska')).toBeInTheDocument()
  })
})
