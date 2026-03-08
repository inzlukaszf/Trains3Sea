import '@testing-library/jest-dom'
import React from 'react'

// ── Leaflet mock ──────────────────────────────────────────────
// Leaflet relies on DOM APIs not available in jsdom.

function MockIconConstructor() {}
MockIconConstructor.Default = {
  prototype: { _getIconUrl: undefined },
  mergeOptions: vi.fn(),
}

vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    marker: vi.fn(() => ({ addTo: vi.fn(), bindPopup: vi.fn() })),
    icon: vi.fn(() => ({})),
    Icon: MockIconConstructor,
  },
}))

// ── react-leaflet mock ────────────────────────────────────────
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  Polyline: () => <div data-testid="polyline" />,
  useMap: vi.fn(() => ({ setView: vi.fn(), fitBounds: vi.fn() })),
}))
