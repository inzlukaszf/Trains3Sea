/**
 * Shared Selenium WebDriver configuration for E2E tests.
 * Uses the bundled Playwright Chromium binary (141.x) together with a
 * matching ChromeDriver 141 to avoid version mismatches.
 */
import { Builder } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import { until, By } from 'selenium-webdriver'

export const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:5173'

const CHROME_BIN =
  process.env.CHROME_BIN ||
  '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome'

const CHROMEDRIVER_PATH =
  process.env.CHROMEDRIVER_PATH ||
  '/usr/local/bin/chromedriver141'

/**
 * Build a headless Chrome WebDriver instance.
 * @returns {import('selenium-webdriver').WebDriver}
 */
export async function buildDriver() {
  const options = new chrome.Options()
  options.addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--window-size=1280,900',
  )
  options.setChromeBinaryPath(CHROME_BIN)

  const service = new chrome.ServiceBuilder(CHROMEDRIVER_PATH)

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .setChromeService(service)
    .build()
}

/** Wait for an element matching `selector` to be visible, then return it. */
export async function waitForVisible(driver, selector, timeoutMs = 10000) {
  const el = await driver.wait(
    until.elementLocated(By.css(selector)),
    timeoutMs,
    `Timed out waiting for "${selector}"`
  )
  await driver.wait(until.elementIsVisible(el), timeoutMs)
  return el
}

/** Select an <option> by value inside a <select> identified by `selector`. */
export async function selectOption(driver, selector, value) {
  const select = await waitForVisible(driver, selector)
  await driver.executeScript(
    `arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('change', {bubbles:true}))`,
    select, value
  )
}
