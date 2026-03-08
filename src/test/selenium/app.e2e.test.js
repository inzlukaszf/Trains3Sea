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

// ── Station HAFAS IDs (Three Seas capitals) ────────────────────────────────
const WARSAW      = '5100067'   // Poland
const VIENNA      = '8103000'   // Austria
const PRAGUE      = '5400001'   // Czech Republic
const BUDAPEST    = '5510009'   // Hungary
const BRATISLAVA  = '5600020'   // Slovakia
const TALLINN     = '7700001'   // Estonia
const RIGA        = '7600001'   // Latvia
const VILNIUS     = '7600010'   // Lithuania
const SOFIA       = '5500010'   // Bulgaria
const BUCHAREST   = '5310034'   // Romania

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
    expect(await btn.getAttribute('disabled')).not.toBeNull()
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
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', VIENNA)

    const btn = await driver.findElement(By.css('[data-testid="search-btn"]'))
    expect(await btn.getAttribute('disabled')).toBeNull()
  })

  it('przycisk Szukaj pozostaje nieaktywny gdy from === to', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', WARSAW)

    const btn = await driver.findElement(By.css('[data-testid="search-btn"]'))
    expect(await btn.getAttribute('disabled')).not.toBeNull()
  })

  it('select "Skąd" zawiera wszystkie 12 stolic Trójmorza', async () => {
    const options = await driver.findElements(By.css('#from-select option'))
    expect(options.length).toBeGreaterThanOrEqual(13) // 12 + placeholder
  })

  it('po wyborze stacji select odzwierciedla wybraną wartość', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    const val = await driver.findElement(By.css('#from-select')).then(e => e.getAttribute('value'))
    expect(val).toBe(WARSAW)
  })

  it('przycisk zamiany kierunku (⇄) zamienia stacje miejscami', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', VIENNA)

    await driver.findElement(By.css('.swap-btn')).then(b => b.click())
    await driver.sleep(300)

    const fromVal = await driver.findElement(By.css('#from-select')).then(e => e.getAttribute('value'))
    const toVal   = await driver.findElement(By.css('#to-select')).then(e => e.getAttribute('value'))
    expect(fromVal).toBe(VIENNA)
    expect(toVal).toBe(WARSAW)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Auto-via: trasy wymagające EU-bezpiecznych przesiadek
// ═══════════════════════════════════════════════════════════════════════════

describe('Automatyczne przesiadki EU (auto-via)', () => {
  it('Warszawa → Tallinn: automatycznie zaznacza Wilno i Rygę', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', TALLINN)

    await driver.sleep(300)

    const vilniusChip = await driver.findElement(By.css(`[data-testid="via-chip-${VILNIUS}"]`))
    const rigaChip    = await driver.findElement(By.css(`[data-testid="via-chip-${RIGA}"]`))

    expect(await vilniusChip.getAttribute('class')).toContain('via-chip--active')
    expect(await rigaChip.getAttribute('class')).toContain('via-chip--active')
  })

  it('Warszawa → Tallinn: chipa Wilno i Rygi mają klasę via-chip--auto', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', TALLINN)
    await driver.sleep(300)

    const vilniusChip = await driver.findElement(By.css(`[data-testid="via-chip-${VILNIUS}"]`))
    const rigaChip    = await driver.findElement(By.css(`[data-testid="via-chip-${RIGA}"]`))
    expect(await vilniusChip.getAttribute('class')).toContain('via-chip--auto')
    expect(await rigaChip.getAttribute('class')).toContain('via-chip--auto')
  })

  it('Warszawa → Tallinn: pojawia się komunikat o wymaganiu EU-tras', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', TALLINN)
    await driver.sleep(300)

    const hint = await waitForVisible(driver, '[data-testid="auto-via-hint"]')
    expect(await hint.isDisplayed()).toBe(true)
  })

  it('Warszawa → Tallinn: sekcja via-selected wyświetla Wilno i Rygę', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', TALLINN)
    await driver.sleep(300)

    const summary = await waitForVisible(driver, '[data-testid="via-selected"]')
    const text = await summary.getText()
    expect(text).toContain('Vilnius')
    expect(text).toContain('Riga')
  })

  it('Warszawa → Sofia: automatycznie zaznacza Bratysławę, Budapeszt i Bukareszt', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', SOFIA)
    await driver.sleep(300)

    const braChip = await driver.findElement(By.css(`[data-testid="via-chip-${BRATISLAVA}"]`))
    const budChip = await driver.findElement(By.css(`[data-testid="via-chip-${BUDAPEST}"]`))
    const bucChip = await driver.findElement(By.css(`[data-testid="via-chip-${BUCHAREST}"]`))

    expect(await braChip.getAttribute('class')).toContain('via-chip--active')
    expect(await budChip.getAttribute('class')).toContain('via-chip--active')
    expect(await bucChip.getAttribute('class')).toContain('via-chip--auto')
  })

  it('Warszawa → Praga: brak auto-via (są sąsiadami)', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', PRAGUE)
    await driver.sleep(300)

    // No auto-via hint should appear
    const hints = await driver.findElements(By.css('[data-testid="auto-via-hint"]'))
    expect(hints.length).toBe(0)

    // No via-selected section either
    const selected = await driver.findElements(By.css('[data-testid="via-selected"]'))
    expect(selected.length).toBe(0)
  })

  it('Wiedeń → Budapeszt: brak auto-via (są sąsiadami)', async () => {
    await selectOption(driver, '#from-select', VIENNA)
    await selectOption(driver, '#to-select', BUDAPEST)
    await driver.sleep(300)

    const hints = await driver.findElements(By.css('[data-testid="auto-via-hint"]'))
    expect(hints.length).toBe(0)
  })

  it('po odznaczeniu auto-via chipa, chip staje się nieaktywny', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', TALLINN)
    await driver.sleep(300)

    const vilniusChip = await driver.findElement(By.css(`[data-testid="via-chip-${VILNIUS}"]`))
    await vilniusChip.click()
    await driver.sleep(200)

    const cls = await vilniusChip.getAttribute('class')
    expect(cls).not.toContain('via-chip--active')
  })

  it('zmiana trasy resetuje auto-via do nowej trasy', async () => {
    // First: Warsaw → Tallinn (via Vilnius + Riga)
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', TALLINN)
    await driver.sleep(300)

    let tallinnChips = await driver.findElements(By.css(`[data-testid="via-chip-${RIGA}"]`))
    expect(await tallinnChips[0].getAttribute('class')).toContain('via-chip--active')

    // Then change to: Warsaw → Vienna (no auto-via; Prague/Bratislava are adjacent)
    await selectOption(driver, '#to-select', VIENNA)
    await driver.sleep(300)

    // Riga should no longer be auto-active
    const rigaChip = await driver.findElement(By.css(`[data-testid="via-chip-${RIGA}"]`))
    const cls = await rigaChip.getAttribute('class')
    expect(cls).not.toContain('via-chip--auto')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Ręczne przesiadki
// ═══════════════════════════════════════════════════════════════════════════

describe('Ręczne przesiadki (manual via)', () => {
  it('wyświetla chipsy via po wyborze from i to', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', VIENNA)
    await driver.sleep(200)

    const chips = await driver.findElements(By.css('.via-chip'))
    expect(chips.length).toBeGreaterThanOrEqual(10)
  })

  it('kliknięcie nieaktywnego chipa dodaje klasę --active', async () => {
    // Warsaw → Prague are adjacent (no auto-via); Budapest is not auto-added
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', PRAGUE)
    await driver.sleep(200)

    const chip = await driver.findElement(By.css(`[data-testid="via-chip-${BUDAPEST}"]`))
    await chip.click()
    await driver.sleep(100)

    expect(await chip.getAttribute('class')).toContain('via-chip--active')
  })

  it('drugie kliknięcie ręcznego chipa usuwa klasę --active', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', PRAGUE)
    await driver.sleep(200)

    const chip = await driver.findElement(By.css(`[data-testid="via-chip-${BUDAPEST}"]`))
    await chip.click()
    await chip.click()
    await driver.sleep(100)

    expect(await chip.getAttribute('class')).not.toContain('via-chip--active')
  })

  it('stacja startowa i docelowa nie pojawiają się wśród chipów via', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', VIENNA)

    const warsawChip = await driver.findElements(By.css(`[data-testid="via-chip-${WARSAW}"]`))
    const viennaChip = await driver.findElements(By.css(`[data-testid="via-chip-${VIENNA}"]`))
    expect(warsawChip.length).toBe(0)
    expect(viennaChip.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Wyszukiwanie połączeń (wymaga działającego API przez proxy)
// ═══════════════════════════════════════════════════════════════════════════

describe('Wyszukiwanie połączeń kolejowych', () => {
  it('kliknięcie Szukaj pokazuje spinner ładowania', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', VIENNA)
    await driver.findElement(By.css('[data-testid="search-btn"]')).then(b => b.click())

    try {
      const spinner = await driver.wait(
        until.elementLocated(By.css('[data-testid="loading"]')),
        3000
      )
      expect(await spinner.isDisplayed()).toBe(true)
    } catch {
      const results = await driver.findElements(
        By.css('[data-testid="connection-list"], [data-testid="error"]')
      )
      expect(results.length).toBeGreaterThan(0)
    }
  })

  it('po wyszukiwaniu wyświetlana jest lista połączeń lub komunikat błędu', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', VIENNA)
    await driver.findElement(By.css('[data-testid="search-btn"]')).then(b => b.click())

    await driver.wait(
      until.elementLocated(By.css('[data-testid="connection-list"], [data-testid="error"]')),
      TIMEOUT
    )

    const list  = await driver.findElements(By.css('[data-testid="connection-list"]'))
    const error = await driver.findElements(By.css('[data-testid="error"]'))
    expect(list.length + error.length).toBeGreaterThan(0)
  }, TIMEOUT + 5000)

  it('kliknięcie karty połączenia otwiera szczegóły trasy', async () => {
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', VIENNA)
    await driver.findElement(By.css('[data-testid="search-btn"]')).then(b => b.click())

    await driver.wait(
      until.elementLocated(By.css('[data-testid="journey-card"], [data-testid="error"]')),
      TIMEOUT
    )

    const cards = await driver.findElements(By.css('[data-testid="journey-card"]'))
    if (cards.length === 0) {
      const errEl = await driver.findElements(By.css('[data-testid="error"]'))
      expect(errEl.length).toBeGreaterThan(0)
      return
    }

    await (cards.length > 1 ? cards[1] : cards[0]).click()

    const detail = await driver.wait(
      until.elementLocated(By.css('[data-testid="journey-detail"]')),
      5000
    )
    expect(await detail.isDisplayed()).toBe(true)
  }, TIMEOUT + 5000)

  it('wyszukiwanie z auto-via zawiera parametr via w zapytaniu do API', async () => {
    // Warszawa → Tallinn forces Vilnius as auto-via
    await selectOption(driver, '#from-select', WARSAW)
    await selectOption(driver, '#to-select', TALLINN)
    await driver.sleep(300)

    await driver.findElement(By.css('[data-testid="search-btn"]')).then(b => b.click())
    await driver.sleep(1500)

    const entries = await driver.executeScript(`
      return performance.getEntriesByType('resource')
        .filter(e => e.name.includes('/api/journeys'))
        .map(e => e.name)
    `)

    if (entries.length > 0) {
      const url = entries[entries.length - 1]
      // The first auto-via for Warsaw→Tallinn is Vilnius
      expect(url).toContain(`via=${VILNIUS}`)
    } else {
      const results = await driver.findElements(
        By.css('[data-testid="connection-list"], [data-testid="error"]')
      )
      expect(results.length).toBeGreaterThan(0)
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
    expect(await input.getAttribute('value')).toBeTruthy()
  })

  it('można zmienić datę wyjazdu', async () => {
    const input = await driver.findElement(By.css('#departure-input'))
    await driver.executeScript(
      `arguments[0].value = '2025-12-24T10:00'; arguments[0].dispatchEvent(new Event('change', {bubbles:true}))`,
      input
    )
    expect(await input.getAttribute('value')).toBe('2025-12-24T10:00')
  })
})
