/**
 * Three Seas Initiative (Trójmorze / Intermarium) member state capitals.
 * Coordinates: [latitude, longitude]
 * hafasId: station ID used by db.transport.rest HAFAS API
 */
export const THREE_SEAS_CAPITALS = [
  {
    country: 'Austria',
    capital: 'Wiedeń',
    name: 'Wien',
    coords: [48.2082, 16.3738],
    hafasId: '8103000',
    flag: '🇦🇹',
  },
  {
    country: 'Bułgaria',
    capital: 'Sofia',
    name: 'Sofia',
    coords: [42.6977, 23.3219],
    hafasId: '5500010',
    flag: '🇧🇬',
  },
  {
    country: 'Chorwacja',
    capital: 'Zagrzeb',
    name: 'Zagreb',
    coords: [45.815, 15.9819],
    hafasId: '7870041',
    flag: '🇭🇷',
  },
  {
    country: 'Czechy',
    capital: 'Praga',
    name: 'Praha',
    coords: [50.0755, 14.4378],
    hafasId: '5400001',
    flag: '🇨🇿',
  },
  {
    country: 'Estonia',
    capital: 'Tallinn',
    name: 'Tallinn',
    coords: [59.437, 24.7536],
    hafasId: '7700001',
    flag: '🇪🇪',
  },
  {
    country: 'Węgry',
    capital: 'Budapeszt',
    name: 'Budapest',
    coords: [47.4979, 19.0402],
    hafasId: '5510009',
    flag: '🇭🇺',
  },
  {
    country: 'Łotwa',
    capital: 'Ryga',
    name: 'Riga',
    coords: [56.9496, 24.1052],
    hafasId: '7600001',
    flag: '🇱🇻',
  },
  {
    country: 'Litwa',
    capital: 'Wilno',
    name: 'Vilnius',
    coords: [54.6872, 25.2797],
    hafasId: '7600010',
    flag: '🇱🇹',
  },
  {
    country: 'Polska',
    capital: 'Warszawa',
    name: 'Warszawa Centralna',
    coords: [52.2297, 21.0122],
    hafasId: '5100067',
    flag: '🇵🇱',
  },
  {
    country: 'Rumunia',
    capital: 'Bukareszt',
    name: 'Bucuresti Nord',
    coords: [44.4268, 26.1025],
    hafasId: '5310034',
    flag: '🇷🇴',
  },
  {
    country: 'Słowacja',
    capital: 'Bratysława',
    name: 'Bratislava hl.st.',
    coords: [48.1486, 17.1077],
    hafasId: '5600020',
    flag: '🇸🇰',
  },
  {
    country: 'Słowenia',
    capital: 'Lublana',
    name: 'Ljubljana',
    coords: [46.0569, 14.5058],
    hafasId: '7940200',
    flag: '🇸🇮',
  },
]

export const CAPITAL_BY_NAME = Object.fromEntries(
  THREE_SEAS_CAPITALS.map((c) => [c.name, c])
)

export const CAPITAL_BY_HAFAS_ID = Object.fromEntries(
  THREE_SEAS_CAPITALS.map((c) => [c.hafasId, c])
)

/** Geographic center of Three Seas region */
export const MAP_CENTER = [50.5, 19.5]
export const MAP_ZOOM = 5
