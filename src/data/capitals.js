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

/**
 * All 27 European Union member state capitals.
 * Coordinates: [latitude, longitude] — actual TRAIN STATION locations where available.
 * hafasId: station ID used by db.transport.rest HAFAS API (null if country has no rail network).
 * hasRailNetwork: false for Cyprus and Malta which have no national rail network.
 */
export const EU_CAPITALS = [
  // --- Three Seas Initiative members (already in THREE_SEAS_CAPITALS) ---
  {
    country: 'Austria',
    capital: 'Wiedeń',
    name: 'Wien Hbf',
    coords: [48.1851, 16.3761],
    hafasId: '8103000',
    flag: '🇦🇹',
    hasRailNetwork: true,
  },
  {
    country: 'Bułgaria',
    capital: 'Sofia',
    name: 'Sofia',
    coords: [42.7122, 23.3225],
    hafasId: '5200004',
    flag: '🇧🇬',
    hasRailNetwork: true,
  },
  {
    country: 'Chorwacja',
    capital: 'Zagrzeb',
    name: 'Zagreb Glavni kolodvor',
    coords: [45.8044, 15.9787],
    hafasId: '7800020',
    flag: '🇭🇷',
    hasRailNetwork: true,
  },
  {
    country: 'Czechy',
    capital: 'Praga',
    name: 'Praha hl.n.',
    coords: [50.0831, 14.4349],
    hafasId: '5496001',
    flag: '🇨🇿',
    hasRailNetwork: true,
  },
  {
    country: 'Estonia',
    capital: 'Tallinn',
    name: 'Tallinn Balti jaam',
    coords: [59.4406, 24.7374],
    hafasId: '2600080',
    flag: '🇪🇪',
    hasRailNetwork: true,
  },
  {
    country: 'Węgry',
    capital: 'Budapeszt',
    name: 'Budapest-Keleti',
    coords: [47.5002, 19.0739],
    hafasId: '5500003',
    flag: '🇭🇺',
    hasRailNetwork: true,
  },
  {
    country: 'Łotwa',
    capital: 'Ryga',
    name: 'Riga',
    coords: [56.9418, 24.1131],
    hafasId: '2500009',
    flag: '🇱🇻',
    hasRailNetwork: true,
  },
  {
    country: 'Litwa',
    capital: 'Wilno',
    name: 'Vilnius',
    coords: [54.6697, 25.2791],
    hafasId: '2400008',
    flag: '🇱🇹',
    hasRailNetwork: true,
  },
  {
    country: 'Polska',
    capital: 'Warszawa',
    name: 'Warszawa Centralna',
    coords: [52.2289, 21.0036],
    hafasId: '5100065',
    flag: '🇵🇱',
    hasRailNetwork: true,
  },
  {
    country: 'Rumunia',
    capital: 'Bukareszt',
    name: 'Bucuresti Nord',
    coords: [44.4520, 26.0845],
    hafasId: '5300007',
    flag: '🇷🇴',
    hasRailNetwork: true,
  },
  {
    country: 'Słowacja',
    capital: 'Bratysława',
    name: 'Bratislava hl.st.',
    coords: [48.1572, 17.1069],
    hafasId: '5600207',
    flag: '🇸🇰',
    hasRailNetwork: true,
  },
  {
    country: 'Słowenia',
    capital: 'Lublana',
    name: 'Ljubljana',
    coords: [46.0562, 14.5057],
    hafasId: '7900003',
    flag: '🇸🇮',
    hasRailNetwork: true,
  },

  // --- Remaining 15 EU member states ---
  {
    country: 'Belgia',
    capital: 'Bruksela',
    name: 'Bruxelles-Midi',
    coords: [50.8354, 4.3363],   // Brussels South — main international station
    hafasId: '8814001',
    flag: '🇧🇪',
    hasRailNetwork: true,
  },
  {
    country: 'Cypr',
    capital: 'Nikozja',
    name: 'Nikozja',
    coords: [35.1725, 33.3640],  // City centre — Cypr nie posiada sieci kolejowej
    hafasId: null,
    flag: '🇨🇾',
    hasRailNetwork: false,
  },
  {
    country: 'Dania',
    capital: 'Kopenhaga',
    name: 'København H',
    coords: [55.6726, 12.5650],  // Copenhagen Central Station
    hafasId: '8600626',
    flag: '🇩🇰',
    hasRailNetwork: true,
  },
  {
    country: 'Finlandia',
    capital: 'Helsinki',
    name: 'Helsinki päärautatieasema',
    coords: [60.1712, 24.9414],  // Helsinki Central Station (VR)
    hafasId: '1000067',
    flag: '🇫🇮',
    hasRailNetwork: true,
  },
  {
    country: 'Francja',
    capital: 'Paryż',
    name: 'Paris Gare du Nord',
    coords: [48.8809, 2.3553],   // Paris Nord — główny węzeł międzynarodowy
    hafasId: '8796001',
    flag: '🇫🇷',
    hasRailNetwork: true,
  },
  {
    country: 'Niemcy',
    capital: 'Berlin',
    name: 'Berlin Hbf',
    coords: [52.5251, 13.3694],  // Berlin Hauptbahnhof
    hafasId: '8011160',
    flag: '🇩🇪',
    hasRailNetwork: true,
  },
  {
    country: 'Grecja',
    capital: 'Ateny',
    name: 'Athina Larissis',
    coords: [37.9908, 23.7260],  // Athens Larissa Station (Hellenic Train)
    hafasId: '7300001',
    flag: '🇬🇷',
    hasRailNetwork: true,
  },
  {
    country: 'Irlandia',
    capital: 'Dublin',
    name: 'Dublin Heuston',
    coords: [53.3461, -6.2966],  // Dublin Heuston (Irish Rail)
    hafasId: '6000001',
    flag: '🇮🇪',
    hasRailNetwork: true,
  },
  {
    country: 'Włochy',
    capital: 'Rzym',
    name: 'Roma Termini',
    coords: [41.9006, 12.5023],  // Rome Termini
    hafasId: '8300132',
    flag: '🇮🇹',
    hasRailNetwork: true,
  },
  {
    country: 'Luksemburg',
    capital: 'Luksemburg',
    name: 'Luxembourg Gare',
    coords: [49.6001, 6.1345],   // Luxembourg Central Station (CFL)
    hafasId: '8200010',
    flag: '🇱🇺',
    hasRailNetwork: true,
  },
  {
    country: 'Malta',
    capital: 'Valletta',
    name: 'Valletta',
    coords: [35.8997, 14.5147],  // City centre — Malta nie posiada sieci kolejowej
    hafasId: null,
    flag: '🇲🇹',
    hasRailNetwork: false,
  },
  {
    country: 'Niderlandy',
    capital: 'Amsterdam',
    name: 'Amsterdam Centraal',
    coords: [52.3791, 4.9003],   // Amsterdam Central Station (NS)
    hafasId: '8400058',
    flag: '🇳🇱',
    hasRailNetwork: true,
  },
  {
    country: 'Portugalia',
    capital: 'Lizbona',
    name: 'Lisboa Oriente',
    coords: [38.7671, -9.0990],  // Lisbon Oriente (CP Portugal)
    hafasId: '9400509',
    flag: '🇵🇹',
    hasRailNetwork: true,
  },
  {
    country: 'Hiszpania',
    capital: 'Madryt',
    name: 'Madrid Puerta de Atocha',
    coords: [40.4069, -3.6892],  // Madrid Atocha (ADIF/RENFE)
    hafasId: '7100010',
    flag: '🇪🇸',
    hasRailNetwork: true,
  },
  {
    country: 'Szwecja',
    capital: 'Sztokholm',
    name: 'Stockholm Centralstation',
    coords: [59.3302, 18.0579],  // Stockholm C (SJ/Trafikverket)
    hafasId: '7400860',
    flag: '🇸🇪',
    hasRailNetwork: true,
  },
]

export const EU_CAPITAL_BY_HAFAS_ID = Object.fromEntries(
  EU_CAPITALS
    .filter((c) => c.hafasId !== null)
    .map((c) => [c.hafasId, c])
)

export const EU_CAPITAL_BY_COUNTRY = Object.fromEntries(
  EU_CAPITALS.map((c) => [c.country, c])
)
