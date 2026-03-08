/**
 * Three Seas Initiative (Trójmorze / Intermarium) member state capitals.
 * Coordinates: [latitude, longitude] — actual TRAIN STATION locations.
 * hafasId: station ID used by db.transport.rest HAFAS API.
 *
 * IDs verified against https://v6.db.transport.rest/stops/<id>
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
    coords: [42.7122, 23.3225],   // Sofia Centralna
    hafasId: '5200004',
    flag: '🇧🇬',
  },
  {
    country: 'Chorwacja',
    capital: 'Zagrzeb',
    name: 'Zagreb Glavni kolodvor',
    coords: [45.8044, 15.9787],   // Zagreb Glavni kolodvor
    hafasId: '7800020',
    flag: '🇭🇷',
  },
  {
    country: 'Czechy',
    capital: 'Praga',
    name: 'Praha hl.n.',
    coords: [50.0831, 14.4349],   // Praha hlavní nádraží
    hafasId: '5496001',
    flag: '🇨🇿',
  },
  {
    country: 'Estonia',
    capital: 'Tallinn',
    name: 'Tallinn Balti jaam',
    coords: [59.4406, 24.7374],   // Tallinn Balti jaam
    hafasId: '2600080',
    flag: '🇪🇪',
  },
  {
    country: 'Węgry',
    capital: 'Budapeszt',
    name: 'Budapest-Keleti',
    coords: [47.5002, 19.0739],   // Budapest Keleti pályaudvar
    hafasId: '5500003',
    flag: '🇭🇺',
  },
  {
    country: 'Łotwa',
    capital: 'Ryga',
    name: 'Riga',
    coords: [56.9418, 24.1131],   // Rīgas Pasažieru stacija
    hafasId: '2500009',
    flag: '🇱🇻',
  },
  {
    country: 'Litwa',
    capital: 'Wilno',
    name: 'Vilnius',
    coords: [54.6697, 25.2791],   // Vilniaus geležinkelio stotis
    hafasId: '2400008',
    flag: '🇱🇹',
  },
  {
    country: 'Polska',
    capital: 'Warszawa',
    name: 'Warszawa Centralna',
    coords: [52.2289, 21.0036],   // Warszawa Centralna
    hafasId: '5100065',
    flag: '🇵🇱',
  },
  {
    country: 'Rumunia',
    capital: 'Bukareszt',
    name: 'Bucuresti Nord',
    coords: [44.4520, 26.0845],   // Gara de Nord
    hafasId: '5300007',
    flag: '🇷🇴',
  },
  {
    country: 'Słowacja',
    capital: 'Bratysława',
    name: 'Bratislava hl.st.',
    coords: [48.1572, 17.1069],   // Bratislava hlavná stanica
    hafasId: '5600207',
    flag: '🇸🇰',
  },
  {
    country: 'Słowenia',
    capital: 'Lublana',
    name: 'Ljubljana',
    coords: [46.0562, 14.5057],   // Ljubljana Potniški center
    hafasId: '7900003',
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
