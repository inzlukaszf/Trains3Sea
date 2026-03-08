/**
 * Three Seas Initiative (Trójmorze / Intermarium) member state capitals.
 * Coordinates: [latitude, longitude] — actual TRAIN STATION locations.
 * hafasId: station ID used by db.transport.rest HAFAS API.
 */
export const THREE_SEAS_CAPITALS = [
  {
    country: 'Austria',
    capital: 'Wiedeń',
    name: 'Wien Hbf',
    coords: [48.1851, 16.3761],   // Wien Hauptbahnhof
    hafasId: '8103000',
    flag: '🇦🇹',
  },
  {
    country: 'Bułgaria',
    capital: 'Sofia',
    name: 'Sofia',
    coords: [42.7055, 23.3195],   // Sofia Centralna
    hafasId: '5500010',
    flag: '🇧🇬',
  },
  {
    country: 'Chorwacja',
    capital: 'Zagrzeb',
    name: 'Zagreb',
    coords: [45.8044, 15.9787],   // Zagreb Glavni kolodvor
    hafasId: '7870041',
    flag: '🇭🇷',
  },
  {
    country: 'Czechy',
    capital: 'Praga',
    name: 'Praha hl.n.',
    coords: [50.0831, 14.4349],   // Praha hlavní nádraží
    hafasId: '5400001',
    flag: '🇨🇿',
  },
  {
    country: 'Estonia',
    capital: 'Tallinn',
    name: 'Tallinn',
    coords: [59.4406, 24.7374],   // Tallinn Balti jaam
    hafasId: '7700001',
    flag: '🇪🇪',
  },
  {
    country: 'Węgry',
    capital: 'Budapeszt',
    name: 'Budapest-Keleti',
    coords: [47.5002, 19.0739],   // Budapest Keleti pályaudvar
    hafasId: '5510009',
    flag: '🇭🇺',
  },
  {
    country: 'Łotwa',
    capital: 'Ryga',
    name: 'Riga',
    coords: [56.9418, 24.1131],   // Rīgas Centrālā stacija
    hafasId: '7600001',
    flag: '🇱🇻',
  },
  {
    country: 'Litwa',
    capital: 'Wilno',
    name: 'Vilnius',
    coords: [54.6697, 25.2791],   // Vilniaus geležinkelio stotis
    hafasId: '7600010',
    flag: '🇱🇹',
  },
  {
    country: 'Polska',
    capital: 'Warszawa',
    name: 'Warszawa Centralna',
    coords: [52.2297, 21.0122],   // Warszawa Centralna
    hafasId: '5100067',
    flag: '🇵🇱',
  },
  {
    country: 'Rumunia',
    capital: 'Bukareszt',
    name: 'Bucuresti Nord',
    coords: [44.4520, 26.0845],   // Gara de Nord
    hafasId: '5310034',
    flag: '🇷🇴',
  },
  {
    country: 'Słowacja',
    capital: 'Bratysława',
    name: 'Bratislava hl.st.',
    coords: [48.1572, 17.1069],   // Bratislava hlavná stanica
    hafasId: '5600020',
    flag: '🇸🇰',
  },
  {
    country: 'Słowenia',
    capital: 'Lublana',
    name: 'Ljubljana',
    coords: [46.0562, 14.5057],   // Ljubljana Potniški center
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
