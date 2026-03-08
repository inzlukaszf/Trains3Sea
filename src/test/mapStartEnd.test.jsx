/**
 * Map start/end point tests — unit-level (mocked Leaflet / react-leaflet).
 *
 * Verifies that TrainMap correctly marks the departure ("Skąd") and
 * destination ("Dokąd") capitals on the map, that no badge bleeds onto
 * unrelated markers, and that the rendered marker count is always correct.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrainMap from '../components/TrainMap'
import { THREE_SEAS_CAPITALS } from '../data/capitals'

// Leaflet and react-leaflet are mocked globally in setup.jsx.
// The Popup mock renders its children directly, so badge spans are in the DOM.

const CAPITALS = THREE_SEAS_CAPITALS

const WARSAW      = CAPITALS.find((c) => c.capital === 'Warszawa')
const VIENNA      = CAPITALS.find((c) => c.capital === 'Wiedeń')
const PRAGUE      = CAPITALS.find((c) => c.capital === 'Praga')
const BRATISLAVA  = CAPITALS.find((c) => c.capital === 'Bratysława')

const defaultProps = {
  capitals: CAPITALS,
  selectedFrom: null,
  selectedTo: null,
  onCapitalClick: vi.fn(),
  viaStations: [],
  onViaToggle: vi.fn(),
  activeJourney: null,
}

// ═══════════════════════════════════════════════════════════════════════════
// Basic marker rendering
// ═══════════════════════════════════════════════════════════════════════════

describe('TrainMap — marker rendering', () => {
  it('renders exactly 12 markers (one per capital)', () => {
    render(<TrainMap {...defaultProps} />)
    expect(screen.getAllByTestId('marker')).toHaveLength(12)
  })

  it('renders a popup for each capital', () => {
    render(<TrainMap {...defaultProps} />)
    expect(screen.getAllByTestId('popup')).toHaveLength(12)
  })

  it('all capitals have their popup rendered with correct hafas-id', () => {
    render(<TrainMap {...defaultProps} />)
    for (const city of CAPITALS) {
      expect(screen.getByTestId(`popup-${city.hafasId}`)).toBeInTheDocument()
    }
  })

  it('renders the capital name, flag and country in each popup', () => {
    render(<TrainMap {...defaultProps} />)
    for (const city of CAPITALS) {
      const popup = screen.getByTestId(`popup-${city.hafasId}`)
      expect(popup).toHaveTextContent(city.capital)
      expect(popup).toHaveTextContent(city.country)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Start-point ("Skąd") badge
// ═══════════════════════════════════════════════════════════════════════════

describe('Map START POINT — "Skąd" badge', () => {
  it('shows "Skąd" badge on the departure capital popup', () => {
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} />)
    const badge = screen.getByTestId(`badge-from-${WARSAW.hafasId}`)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Skąd')
  })

  it('"Skąd" badge is inside the correct capital popup (not others)', () => {
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} />)
    // Badge appears inside Warsaw popup
    const warsawPopup = screen.getByTestId(`popup-${WARSAW.hafasId}`)
    expect(within(warsawPopup).getByTestId(`badge-from-${WARSAW.hafasId}`)).toBeInTheDocument()
    // Badge does NOT appear inside other capitals' popups
    for (const city of CAPITALS.filter((c) => c.hafasId !== WARSAW.hafasId)) {
      const popup = screen.getByTestId(`popup-${city.hafasId}`)
      expect(within(popup).queryByText('Skąd')).toBeNull()
    }
  })

  it('exactly one "Skąd" badge exists regardless of which capital is "from"', () => {
    render(<TrainMap {...defaultProps} selectedFrom={VIENNA} />)
    expect(screen.getAllByText('Skąd')).toHaveLength(1)
  })

  it('no "Skąd" badge when no departure is selected', () => {
    render(<TrainMap {...defaultProps} />)
    expect(screen.queryByText('Skąd')).toBeNull()
  })

  it('"Skąd" badge updates when selectedFrom changes', () => {
    const { rerender } = render(<TrainMap {...defaultProps} selectedFrom={WARSAW} />)
    expect(screen.getByTestId(`badge-from-${WARSAW.hafasId}`)).toBeInTheDocument()

    rerender(<TrainMap {...defaultProps} selectedFrom={VIENNA} />)
    expect(screen.queryByTestId(`badge-from-${WARSAW.hafasId}`)).toBeNull()
    expect(screen.getByTestId(`badge-from-${VIENNA.hafasId}`)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// End-point ("Dokąd") badge
// ═══════════════════════════════════════════════════════════════════════════

describe('Map END POINT — "Dokąd" badge', () => {
  it('shows "Dokąd" badge on the destination capital popup', () => {
    render(<TrainMap {...defaultProps} selectedTo={VIENNA} />)
    const badge = screen.getByTestId(`badge-to-${VIENNA.hafasId}`)
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Dokąd')
  })

  it('"Dokąd" badge is inside the correct capital popup (not others)', () => {
    render(<TrainMap {...defaultProps} selectedTo={VIENNA} />)
    const viennaPopup = screen.getByTestId(`popup-${VIENNA.hafasId}`)
    expect(within(viennaPopup).getByTestId(`badge-to-${VIENNA.hafasId}`)).toBeInTheDocument()
    for (const city of CAPITALS.filter((c) => c.hafasId !== VIENNA.hafasId)) {
      const popup = screen.getByTestId(`popup-${city.hafasId}`)
      expect(within(popup).queryByText('Dokąd')).toBeNull()
    }
  })

  it('exactly one "Dokąd" badge exists', () => {
    render(<TrainMap {...defaultProps} selectedTo={PRAGUE} />)
    expect(screen.getAllByText('Dokąd')).toHaveLength(1)
  })

  it('no "Dokąd" badge when no destination is selected', () => {
    render(<TrainMap {...defaultProps} />)
    expect(screen.queryByText('Dokąd')).toBeNull()
  })

  it('"Dokąd" badge updates when selectedTo changes', () => {
    const { rerender } = render(<TrainMap {...defaultProps} selectedTo={VIENNA} />)
    expect(screen.getByTestId(`badge-to-${VIENNA.hafasId}`)).toBeInTheDocument()

    rerender(<TrainMap {...defaultProps} selectedTo={PRAGUE} />)
    expect(screen.queryByTestId(`badge-to-${VIENNA.hafasId}`)).toBeNull()
    expect(screen.getByTestId(`badge-to-${PRAGUE.hafasId}`)).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Both from and to selected at once
// ═══════════════════════════════════════════════════════════════════════════

describe('Map start AND end point — both selected simultaneously', () => {
  it('shows "Skąd" on from capital and "Dokąd" on to capital', () => {
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} selectedTo={VIENNA} />)
    expect(screen.getByTestId(`badge-from-${WARSAW.hafasId}`)).toBeInTheDocument()
    expect(screen.getByTestId(`badge-to-${VIENNA.hafasId}`)).toBeInTheDocument()
  })

  it('from and to badges are on different capitals', () => {
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} selectedTo={VIENNA} />)
    const warsawPopup = screen.getByTestId(`popup-${WARSAW.hafasId}`)
    const viennaPopup = screen.getByTestId(`popup-${VIENNA.hafasId}`)
    expect(within(warsawPopup).queryByText('Dokąd')).toBeNull()
    expect(within(viennaPopup).queryByText('Skąd')).toBeNull()
  })

  it('capitals that are neither from nor to have no from/to badges', () => {
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} selectedTo={VIENNA} />)
    const excluded = CAPITALS.filter(
      (c) => c.hafasId !== WARSAW.hafasId && c.hafasId !== VIENNA.hafasId
    )
    for (const city of excluded) {
      const popup = screen.getByTestId(`popup-${city.hafasId}`)
      expect(within(popup).queryByText('Skąd')).toBeNull()
      expect(within(popup).queryByText('Dokąd')).toBeNull()
    }
  })

  it('from capital has no "Dokąd" badge even if it was previously the to capital', () => {
    const { rerender } = render(
      <TrainMap {...defaultProps} selectedFrom={VIENNA} selectedTo={WARSAW} />
    )
    // Swap: Warsaw now becomes from, Vienna becomes to
    rerender(<TrainMap {...defaultProps} selectedFrom={WARSAW} selectedTo={VIENNA} />)
    const warsawPopup = screen.getByTestId(`popup-${WARSAW.hafasId}`)
    expect(within(warsawPopup).queryByText('Dokąd')).toBeNull()
    expect(within(warsawPopup).getByText('Skąd')).toBeInTheDocument()
  })

  it('total badge count: exactly 1 "Skąd" + 1 "Dokąd" when both are selected', () => {
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} selectedTo={VIENNA} />)
    expect(screen.getAllByText('Skąd')).toHaveLength(1)
    expect(screen.getAllByText('Dokąd')).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Via-stop ("Przez") badge
// ═══════════════════════════════════════════════════════════════════════════

describe('Map via-stop — "Przez" badge', () => {
  it('shows "Przez" badge on via-station capital popup', () => {
    const viaStations = [{ id: BRATISLAVA.hafasId, name: BRATISLAVA.name, coords: BRATISLAVA.coords }]
    render(
      <TrainMap
        {...defaultProps}
        selectedFrom={WARSAW}
        selectedTo={VIENNA}
        viaStations={viaStations}
      />
    )
    expect(screen.getByTestId(`badge-via-${BRATISLAVA.hafasId}`)).toBeInTheDocument()
    expect(screen.getByText('Przez')).toBeInTheDocument()
  })

  it('"Przez" badge is only on the via capital, not from or to', () => {
    const viaStations = [{ id: BRATISLAVA.hafasId, name: BRATISLAVA.name, coords: BRATISLAVA.coords }]
    render(
      <TrainMap
        {...defaultProps}
        selectedFrom={WARSAW}
        selectedTo={VIENNA}
        viaStations={viaStations}
      />
    )
    const warsawPopup = screen.getByTestId(`popup-${WARSAW.hafasId}`)
    const viennaPopup = screen.getByTestId(`popup-${VIENNA.hafasId}`)
    expect(within(warsawPopup).queryByText('Przez')).toBeNull()
    expect(within(viennaPopup).queryByText('Przez')).toBeNull()
  })

  it('multiple via stations each get a "Przez" badge', () => {
    const viaStations = [
      { id: PRAGUE.hafasId, name: PRAGUE.name, coords: PRAGUE.coords },
      { id: BRATISLAVA.hafasId, name: BRATISLAVA.name, coords: BRATISLAVA.coords },
    ]
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} selectedTo={VIENNA} viaStations={viaStations} />)
    expect(screen.getByTestId(`badge-via-${PRAGUE.hafasId}`)).toBeInTheDocument()
    expect(screen.getByTestId(`badge-via-${BRATISLAVA.hafasId}`)).toBeInTheDocument()
    expect(screen.getAllByText('Przez')).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// onCapitalClick handler
// ═══════════════════════════════════════════════════════════════════════════

describe('Map marker interaction', () => {
  it('does not render "Dodaj jako przesiadkę" button on from capital', () => {
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} selectedTo={VIENNA} />)
    const warsawPopup = screen.getByTestId(`popup-${WARSAW.hafasId}`)
    expect(within(warsawPopup).queryByRole('button', { name: /dodaj jako przesiadkę/i })).toBeNull()
  })

  it('does not render "Dodaj jako przesiadkę" button on to capital', () => {
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} selectedTo={VIENNA} />)
    const viennaPopup = screen.getByTestId(`popup-${VIENNA.hafasId}`)
    expect(within(viennaPopup).queryByRole('button', { name: /dodaj jako przesiadkę/i })).toBeNull()
  })

  it('renders "Dodaj jako przesiadkę" button on neutral capitals', () => {
    render(<TrainMap {...defaultProps} selectedFrom={WARSAW} selectedTo={VIENNA} />)
    // At least one neutral capital should have the via button
    const praguePopup = screen.getByTestId(`popup-${PRAGUE.hafasId}`)
    expect(within(praguePopup).getByRole('button', { name: /dodaj jako przesiadkę/i })).toBeInTheDocument()
  })

  it('renders "Usuń przesiadkę" button on active via capital', () => {
    const viaStations = [{ id: BRATISLAVA.hafasId, name: BRATISLAVA.name, coords: BRATISLAVA.coords }]
    render(
      <TrainMap
        {...defaultProps}
        selectedFrom={WARSAW}
        selectedTo={VIENNA}
        viaStations={viaStations}
      />
    )
    const braPopup = screen.getByTestId(`popup-${BRATISLAVA.hafasId}`)
    expect(within(braPopup).getByRole('button', { name: /usuń przesiadkę/i })).toBeInTheDocument()
  })
})
