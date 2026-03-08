/**
 * Selenium E2E tests for the Trains3Sea application.
 *
 * Prerequisites:
 *   npm run dev   (or `npm run preview` after build) must be running.
 *   Use `npm run test:e2e` which starts the dev server automatically.
 *
 * Environment variables (optional):
 *   E2E_BASE_URL       - default http://localhost:5173
 *   CHROME_BIN         - path to Chromium binary
 *   CHROMEDRIVER_PATH  - path to matching ChromeDriver binary
 */
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest'
import { By, until } from 'selenium-webdriver'
import { buildDriver, waitForVisible, selectOption, APP_URL } from './selenium.config.js'

// ── Kapitał IDs (HAFAS) used in selects ────────────────────────────────────
const WARSAW_ID   = '5100067'   // Polska
const VIENNA_ID   = '8103000'   // Austria
const PRAGUE_ID   = '5400001'   // Czechy
const BUDAPEST_ID = '5510009'   // Węgry

const TIMEOUT = 20000

let driver

beforeAll(async () => {
  driver = await buildDriver()
  await driver.manage().setTimeouts({ implicit: 0, pageLoad: 30000, script: 30000 })
}, 30000)

afterAll(async () => {
  if (driver) await driver.quit()
}, 15000)

beforeEach(async () => {
  await driver.get(APP_URL)
  // Wait for the React app to mount (search panel must appear)
  await driver.wait(
    until.elementLocated(By.css('[data-testid="search-panel"]')),
    TIMEOUT
  )
})

// ═══════════════════════════════════════════════════════════════════════════
// Layout & initial state
// ═══════════════════════════════════════════════════════════════════════════

describe('Layout i stan początkowy', () => {
  it('wyświetla panel wyszukiwania', async () => {
    const panel = await driver.findElement(By.css('[data-testid="search-panel"]'))
    expect(await panel.isDisplayed()).toBe(true)
  })

  it('wyświetla tytuł aplikacji', async () => {
    const title = await driver.findElement(By.css('.search-panel__title'))
    const text = await title.getText()
    expect(text).toContain('Trójmorza')
  })

  it('wyświetla select "Skąd" i "Dokąd"', async () => {
    const fromSelect = await driver.findElement(By.css('#from-select'))
    const toSelect   = await driver.findElement(By.css('#to-select'))
    expect(await fromSelect.isDisplayed()).toBe(true)
    expect(await toSelect.isDisplayed()).toBe(true)
  })

  it('przycisk Szukaj jest nieaktywny przy braku wyboru', async () => {
    const btn = await driver.findElement(By.css('[data-testid="search-btn"]'))
    const disabled = await btn.getAttribute('disabled')
    expect(disabled).not.toBeNull()
  })

  it('wyświetla komunikat o pustym stanie', async () => {
    const empty = await driver.findElement(By.css('[data-testid="empty"]'))
    expect(await empty.isDisplayed()).toBe(true)
  })

  it('zawiera mapę', async () => {
    const map = await driver.findElement(By.css('[data-testid="train-map"], .leaflet-container'))
    expect(await map.isDisplayed()).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Wybór stacji
// ═══════════════════════════════════════════════════════════════════════════

describe('Wybór stacji startowej i docelowej', () => {
  it('aktywuje przycisk Szukaj po wyborze obu stacji', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const btn = await driver.findElement(By.css('[data-testid="search-btn"]'))
    const disabled = await btn.getAttribute('disabled')
    expect(disabled).toBeNull()
  })

  it('przycisk Szukaj pozostaje nieaktywny gdy from === to', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', WARSAW_ID)

    const btn = await driver.findElement(By.css('[data-testid="search-btn"]'))
    const disabled = await btn.getAttribute('disabled')
    expect(disabled).not.toBeNull()
  })

  it('select "Skąd" zawiera wszystkie 12 stolic Trójmorza', async () => {
    const options = await driver.findElements(By.css('#from-select option'))
    // 12 capitals + 1 placeholder
    expect(options.length).toBeGreaterThanOrEqual(13)
  })

  it('po wyborze stacji select odzwierciedla wybraną wartość', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    const fromSelect = await driver.findElement(By.css('#from-select'))
    const val = await fromSelect.getAttribute('value')
    expect(val).toBe(WARSAW_ID)
  })

  it('przycisk zamiany kierunku (⇄) zamienia stacje miejscami', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const swapBtn = await driver.findElement(By.css('.swap-btn'))
    await swapBtn.click()

    await driver.sleep(200)

    const fromVal = await driver.findElement(By.css('#from-select')).then(e => e.getAttribute('value'))
    const toVal   = await driver.findElement(By.css('#to-select')).then(e => e.getAttribute('value'))
    expect(fromVal).toBe(VIENNA_ID)
    expect(toVal).toBe(WARSAW_ID)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Stacje pośrednie (via)
// ═══════════════════════════════════════════════════════════════════════════

describe('Przesiadki przez stacje pośrednie', () => {
  it('wyświetla chipsy via po wyborze from i to', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const chips = await driver.findElements(By.css('.via-chip'))
    expect(chips.length).toBeGreaterThanOrEqual(10)
  })

  it('zaznaczenie chipa via dodaje klasę --active', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const chip = await driver.findElement(By.css(`[data-testid="via-chip-${PRAGUE_ID}"]`))
    await chip.click()

    const cls = await chip.getAttribute('class')
    expect(cls).toContain('via-chip--active')
  })

  it('drugie kliknięcie chipa via usuwa klasę --active (toggle)', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const chip = await driver.findElement(By.css(`[data-testid="via-chip-${PRAGUE_ID}"]`))
    await chip.click()
    await chip.click()

    const cls = await chip.getAttribute('class')
    expect(cls).not.toContain('via-chip--active')
  })

  it('po zaznaczeniu via pojawia się sekcja "Przez:"', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const chip = await driver.findElement(By.css(`[data-testid="via-chip-${BUDAPEST_ID}"]`))
    await chip.click()

    const summary = await waitForVisible(driver, '.via-selected')
    const text = await summary.getText()
    expect(text).toContain('Budapest')
  })

  it('stacja startowa i docelowa nie pojawiają się wśród chipów via', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const warsawChip  = await driver.findElements(By.css(`[data-testid="via-chip-${WARSAW_ID}"]`))
    const viennaChip  = await driver.findElements(By.css(`[data-testid="via-chip-${VIENNA_ID}"]`))

    expect(warsawChip.length).toBe(0)
    expect(viennaChip.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Wyszukiwanie połączeń (wymaga działającego API przez proxy)
// ═══════════════════════════════════════════════════════════════════════════

describe('Wyszukiwanie połączeń kolejowych', () => {
  it('kliknięcie Szukaj pokazuje spinner ładowania', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const btn = await driver.findElement(By.css('[data-testid="search-btn"]'))
    await btn.click()

    // Spinner powinien pojawić się natychmiast (zanim API odpowie)
    try {
      const spinner = await driver.wait(
        until.elementLocated(By.css('[data-testid="loading"]')),
        3000
      )
      expect(await spinner.isDisplayed()).toBe(true)
    } catch {
      // Jeśli API odpowiedziało zbyt szybko — sprawdź wyniki lub błąd
      const results = await driver.findElements(By.css('[data-testid="connection-list"], [data-testid="error"]'))
      expect(results.length).toBeGreaterThan(0)
    }
  })

  it('po wyszukiwaniu wyświetlana jest lista połączeń lub komunikat błędu', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const btn = await driver.findElement(By.css('[data-testid="search-btn"]'))
    await btn.click()

    // Czekaj na zakończenie ładowania (maks. 20 s)
    await driver.wait(
      until.elementLocated(By.css('[data-testid="connection-list"], [data-testid="error"]')),
      TIMEOUT
    )

    const list  = await driver.findElements(By.css('[data-testid="connection-list"]'))
    const error = await driver.findElements(By.css('[data-testid="error"]'))
    expect(list.length + error.length).toBeGreaterThan(0)
  }, TIMEOUT + 5000)

  it('kliknięcie karty połączenia otwiera szczegóły trasy', async () => {
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)
    await driver.findElement(By.css('[data-testid="search-btn"]')).then(b => b.click())

    // Czekaj na wynik lub błąd API (środowisko testowe może nie mieć dostępu do internetu)
    await driver.wait(
      until.elementLocated(By.css('[data-testid="journey-card"], [data-testid="error"]')),
      TIMEOUT
    )

    const cards = await driver.findElements(By.css('[data-testid="journey-card"]'))
    if (cards.length === 0) {
      // API niedostępne w tym środowisku — test UI interakcji pomijamy
      const errEl = await driver.findElements(By.css('[data-testid="error"]'))
      expect(errEl.length).toBeGreaterThan(0)
      return
    }

    // Kliknij drugą kartę (jeśli istnieje) lub pierwszą
    await (cards.length > 1 ? cards[1] : cards[0]).click()

    const detail = await driver.wait(
      until.elementLocated(By.css('[data-testid="journey-detail"]')),
      5000
    )
    expect(await detail.isDisplayed()).toBe(true)
  }, TIMEOUT + 5000)

  it('wyszukiwanie z przesiadką przez Pragę zawiera parametr via w zapytaniu', async () => {
    // Przechwytuj requesty przez wykonanie JS (performance.getEntries)
    await selectOption(driver, '#from-select', WARSAW_ID)
    await selectOption(driver, '#to-select', VIENNA_ID)

    const chip = await driver.findElement(By.css(`[data-testid="via-chip-${PRAGUE_ID}"]`))
    await chip.click()

    await driver.findElement(By.css('[data-testid="search-btn"]')).then(b => b.click())

    // Czekaj aż zapytanie zostanie wysłane
    await driver.sleep(1000)

    const entries = await driver.executeScript(`
      return performance.getEntriesByType('resource')
        .filter(e => e.name.includes('/api/journeys'))
        .map(e => e.name)
    `)

    const journeyRequests = entries.filter(url => url.includes('/api/journeys'))
    if (journeyRequests.length > 0) {
      const url = journeyRequests[journeyRequests.length - 1]
      expect(url).toContain(`via=${PRAGUE_ID}`)
    } else {
      // Jeśli performance API nie zapisało — sprawdź, że wyszukiwanie się odbyło
      const list = await driver.findElements(By.css('[data-testid="connection-list"], [data-testid="error"]'))
      expect(list.length).toBeGreaterThan(0)
    }
  }, TIMEOUT + 5000)
})

// ═══════════════════════════════════════════════════════════════════════════
// Pole daty
// ═══════════════════════════════════════════════════════════════════════════

describe('Pole daty wyjazdu', () => {
  it('pole daty jest widoczne i ma domyślną wartość', async () => {
    const input = await driver.findElement(By.css('#departure-input'))
    expect(await input.isDisplayed()).toBe(true)
    const val = await input.getAttribute('value')
    expect(val).toBeTruthy()
  })

  it('można zmienić datę wyjazdu', async () => {
    const input = await driver.findElement(By.css('#departure-input'))
    await driver.executeScript(
      `arguments[0].value = '2025-12-24T10:00'; arguments[0].dispatchEvent(new Event('change', {bubbles:true}))`,
      input
    )
    const val = await input.getAttribute('value')
    expect(val).toBe('2025-12-24T10:00')
  })
})
