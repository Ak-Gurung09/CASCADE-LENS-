import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type ConsoleMessage, type Page } from '@playwright/test'

// The production build with its real data, served under a CSP that blocks every request off this origin.
const SHOTS = '../docs/screenshots'
const TSHO = '/?case=tsho-rolpa-2026'

async function open(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.locator('.map-state')).toHaveText('Map ready')
}

const inspector = (page: Page) => page.locator('.inspector')

async function inspect(page: Page, bookmark: string) {
  await page.getByRole('button', { name: bookmark }).click()
  await page.getByRole('tab', { name: 'Inspector' }).click()
  await expect(inspector(page)).toContainText(bookmark)
  await expect(inspector(page)).not.toHaveAttribute('data-state', 'loading')
}

test('opening index.html directly explains what to do, instead of a blank page', async ({ page }) => {
  await page.goto(pathToFileURL(resolve('dist/index.html')).href)
  await expect(page.getByRole('heading', { name: 'GAIA CascadeLens has not started' })).toBeVisible()
  await expect(page.getByText('Start CascadeLens.bat')).toBeVisible()
  await expect(page.getByText('http://localhost:8765')).toBeVisible()
})

test('a normal start never shows that message', async ({ page }) => {
  await open(page)
  await page.waitForTimeout(2300)
  await expect(page.getByRole('heading', { name: 'GAIA CascadeLens has not started' })).toHaveCount(0)
})

test('opens on Rasuwa with real NISAR measurements', async ({ page }) => {
  const tiles: string[] = []
  page.on('response', (r) => { if (r.url().includes('/tiles/pair-a/')) tiles.push(`${r.status()}`) })
  await open(page)
  await expect(page.getByRole('heading', { name: 'Rasuwa–Bhote Koshi–Trishuli, Nepal' })).toBeVisible()
  await expect(page.getByRole('radio', { name: /Unwrapped phase/ })).toBeChecked()
  await expect(page.locator('.fixture-banner')).toHaveCount(0)
  await expect.poll(() => tiles.length).toBeGreaterThan(3)
  expect(tiles.filter((s) => s !== '200' && s !== '404')).toEqual([])
  await expect(page.locator('.source')).toContainText('Provisional (P05023)')
  await expect(page.locator('.legend-title').first()).toContainText('relative to frame median')
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${SHOTS}/overview.png` })
})

test('every product has an honest status', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('radio', { name: /19–31 August 2026/ })).toBeEnabled()
  await page.getByRole('tab', { name: 'Snapshots' }).click()
  await expect(page.getByRole('radio', { name: /28 August 2026/ })).toBeChecked()
  await expect(page.getByRole('radio', { name: /Gamma-0 backscatter/ })).toBeDisabled()
  await expect(page.getByText('Download required').first()).toBeVisible()
})

test('the inspector reads real NISAR values and refuses the swath gap', async ({ page }) => {
  await open(page)
  await page.getByRole('radio', { name: /Coherence magnitude/ }).check()
  await inspect(page, 'Bhote Koshi corridor')
  await expect(inspector(page)).toHaveAttribute('data-state', 'valid')
  await expect(page.locator('.value')).toContainText('0.21492')
  await expect(inspector(page)).toContainText('at Shyaphru Bensi')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${SHOTS}/corridor-coherence.png` })
  await inspect(page, 'Mountain source area')
  await expect(inspector(page)).toHaveAttribute('data-state', 'masked')
  await expect(page.locator('.sample')).toContainText('Masked measurement')
})

test('Pair B reaches the source that Pair A cannot', async ({ page }) => {
  await open(page)
  await page.getByRole('tab', { name: 'Pixel offsets' }).click()
  await page.getByRole('radio', { name: /19–31 August 2026/ }).check()
  await page.getByRole('radio', { name: /Correlation surface peak/ }).check()
  await inspect(page, 'Mountain source area')
  await expect(inspector(page)).toHaveAttribute('data-state', 'valid')
  await expect(inspector(page)).toContainText('ascending, Track 98, frame 16')
})

test('completes the story with the outside world blocked', async ({ page }) => {
  const errors: string[] = []
  const external: string[] = []
  const onConsole = (m: ConsoleMessage) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()) }
  page.on('console', onConsole)
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (r) => { if (new URL(r.url()).hostname !== 'localhost') external.push(r.url()) })
  await open(page)
  await page.getByRole('button', { name: 'Start the guided story' }).click()
  await expect(page.locator('.story')).toContainText('phase was not unwrapped there')
  await expect(page.locator('.story')).toContainText('at the detachment zone against')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('.story')).toContainText('much lower than on the terrain beside it')
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('heading', { name: '3. Can the radar see it?' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByRole('heading', { name: '4. The downstream corridor' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('.story')).toContainText('No displacement is calculated')
  await expect(page.locator('.story')).toContainText('from the ionosphere')
  await page.getByRole('button', { name: 'Explore the map' }).click()
  await page.getByRole('button', { name: 'Bhote Koshi corridor' }).click()
  await page.getByRole('tab', { name: 'Inspector' }).click()
  await expect(inspector(page)).toHaveAttribute('data-state', /valid|masked/) // Ionosphere-removed phase at this pixel did not unwrap reliably
  expect(external).toEqual([])
  expect(errors).toEqual([])
  const probe = await page.evaluate(() => fetch('https://example.com/', { mode: 'no-cors' }).then(() => 'reached', () => 'blocked'))
  expect(probe).toBe('blocked')
})

test('all three simulations run and stay labelled as illustrations', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await open(page)
  await page.getByRole('button', { name: 'Simulate' }).click()
  const panel = page.locator('.sim-panel')
  await expect(panel).toContainText('Illustration only')
  await expect(page.locator('.sim-head')).toBeVisible()
  await panel.getByRole('button', { name: 'Play' }).click()
  await expect(panel).toContainText(/[1-9]\d* of 198 km/)
  await panel.getByRole('button', { name: 'Pause' }).click()
  await panel.getByRole('tab', { name: 'What-if flood' }).click()
  await expect(panel).toContainText('not a forecast')
  await expect(panel).toContainText('Places below the water')
  await page.waitForTimeout(1500) // The tab's content fades in: wait so the picture shows it
  // The pointer is still on the tab it just clicked, and the tab's label must stay readable there
  const tab = panel.getByRole('tab', { name: 'What-if flood' })
  expect(await tab.evaluate((e) => { const s = getComputedStyle(e); return s.color !== s.backgroundColor })).toBe(true)
  await page.screenshot({ path: `${SHOTS}/simulate-whatif.png` })
  await panel.getByRole('tab', { name: 'Radar explainer' }).click()
  await expect(panel).toContainText('This model')
  await expect(page.locator('.sim-head')).toHaveCount(0)
  await page.getByRole('button', { name: 'Exit simulation' }).click()
  await expect(panel).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Interpretation' })).toBeVisible()
  expect(errors).toEqual([])
})

test('a bookmark selects a named place and reads its real elevation', async ({ page }) => {
  await open(page)
  await page.getByRole('radio', { name: /Terrain elevation/ }).check()
  await inspect(page, 'Bhote Koshi corridor')
  await expect(page.locator('.place-chip')).toHaveText('Bhote Koshi corridor')
  await expect(page.locator('.value')).toHaveText('1445.8 m') // rasterio reads 1445.7694 at this pixel
})

test('Sentinel-1 layers stay separate from NISAR and cannot be sampled', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Bhote Koshi corridor' }).click()
  const tile = page.waitForResponse((r) => r.url().includes('/tiles/context/eos_dpm/') && r.status() === 200)
  await page.getByRole('checkbox', { name: /damage proxy/ }).check()
  await tile
  await expect(page.locator('.legend')).toContainText('More change')
  await page.getByRole('button', { name: /About Sentinel-1 damage proxy/ }).click()
  await expect(page.getByRole('heading', { name: /damage proxy map/i })).toBeVisible()
  await expect(page.locator('.limits')).toContainText('Not NISAR')
  await expect(page.locator('.limits')).toContainText('cannot sample it')
  await expect(page.locator('.credits summary')).toContainText('Sentinel-1')
  await page.getByRole('button', { name: /^Back to/ }).click()
  await expect(page.getByRole('heading', { name: 'Unwrapped phase' })).toBeVisible()
})

test('source details are reachable for every reference layer', async ({ page }) => {
  await open(page)
  const about = page.getByRole('button', { name: /^About / })
  const n = await about.count()
  expect(n).toBeGreaterThan(10)
  for (let i = 0; i < n; i++) {
    await about.nth(i).click()
    await expect(page.locator('.attribution').first()).not.toBeEmpty()
    await expect(page.locator('.limits li').first()).toBeVisible()
  }
})

test('has no serious accessibility violations', async ({ page }) => {
  const scan = async () => {
    const { violations } = await new AxeBuilder({ page }).exclude('.maplibregl-canvas-container').analyze()
    return violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)
  }
  await open(page)
  expect(await scan()).toEqual([])
  await page.getByRole('button', { name: 'Start the guided story' }).click()
  expect(await scan()).toEqual([])
  await open(page, TSHO)
  expect(await scan()).toEqual([])
})

test('every control can be reached and used from the keyboard', async ({ page }) => {
  await open(page)
  const b = page.getByRole('button', { name: 'Mountain source area' })
  await b.focus()
  await page.keyboard.press('Enter')
  await expect(b).toHaveAttribute('aria-pressed', 'true')
  const box = page.getByRole('checkbox', { name: /barrier lakes/ })
  await box.focus()
  await page.keyboard.press('Space')
  await expect(box).toBeChecked()
})

test('switching case moves between Tsho Rolpa and Rasuwa', async ({ page }) => {
  await open(page, TSHO)
  await expect(page.getByRole('heading', { name: /Tsho Rolpa/ }).first()).toBeVisible()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${SHOTS}/tsho-rolpa.png` })
  await page.getByLabel('Case study').selectOption('rasuwa-2026')
  await expect(page.getByRole('heading', { name: 'Rasuwa–Bhote Koshi–Trishuli, Nepal' })).toBeVisible()
})

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: false })

  test('stays usable with collapsed panels', async ({ page }) => {
    await open(page)
    await expect(page.locator('.left')).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Layers' }).click()
    await expect(page.locator('.left')).toBeVisible()
    // The top bar's case menu and status button do not fit on a phone, so the sheet carries them
    await expect(page.getByLabel('Change case')).toBeVisible()
    await expect(page.locator('.left').getByRole('button', { name: 'What is real here?' })).toBeVisible()
    await page.getByRole('button', { name: 'Start the guided story' }).click()
    await expect(page.locator('.left')).toBeHidden()
    await expect(page.locator('.story')).toBeVisible()
    await expect(page.locator('.story')).toContainText('The source')
    await page.waitForTimeout(1500)
    // The step describes the detachment zone, so its marker must sit in the strip of map the sheet leaves free.
    const marker = await page.locator('.point-marker').boundingBox()
    const sheet = await page.locator('.story').boundingBox()
    expect(marker!.y + marker!.height).toBeLessThan(sheet!.y)
    expect(marker!.y).toBeGreaterThan(64)
    await page.screenshot({ path: `${SHOTS}/phone-story.png` })
    for (const b of await page.locator('.top-actions button, .story button').all()) {
      if (!(await b.isVisible())) continue // hidden at phone width, so not a tap target
      const h = (await b.boundingBox())?.height ?? 0
      if (await b.evaluate((e) => !e.classList.contains('link'))) expect(h).toBeGreaterThanOrEqual(32)
    }
  })
})

test('records performance', async ({ page }) => {
  await page.goto('/')
  const started = Date.now()
  await expect(page.locator('.map-state')).toHaveText('Map ready')
  const mapReady = Date.now() - started
  await page.getByRole('radio', { name: /Coherence magnitude/ }).check()
  const t1 = Date.now()
  await page.getByRole('button', { name: 'Bhote Koshi corridor' }).click()
  await page.getByRole('tab', { name: 'Inspector' }).click()
  await expect(inspector(page)).toHaveAttribute('data-state', 'valid')
  const firstSample = Date.now() - t1
  const t2 = Date.now()
  await page.getByRole('button', { name: 'Mountain source area' }).click()
  await expect(inspector(page)).toContainText('detachment zone')
  await expect(inspector(page)).toHaveAttribute('data-state', 'masked')
  const nextSample = Date.now() - t2
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
    return { domInteractiveMs: Math.round(nav.domInteractive), loadMs: Math.round(nav.loadEventEnd), requests: res.length, transferredMB: +(res.reduce((a, r) => a + r.encodedBodySize, 0) / 1e6).toFixed(1), heapMB: mem ? +(mem.usedJSHeapSize / 1e6).toFixed(0) : null }
  })
  const report = { mapReadyMs: mapReady, firstSampleMs: firstSample, nextSampleMs: nextSample, ...metrics }
  console.log(JSON.stringify(report))
  writeFileSync('e2e/performance.json', JSON.stringify(report, null, 2))
  // A shared CI machine draws the map in software on borrowed cores: CL_PERF_SLACK widens the limits there without loosening them here.
  const slack = Number(process.env.CL_PERF_SLACK ?? 1)
  expect(mapReady).toBeLessThan(8000 * slack)
  expect(firstSample).toBeLessThan(5000 * slack)
})

test('a clicked spot gets ranked explanations and a downloadable evidence report', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Bhote Koshi corridor' }).click()
  await page.getByRole('tab', { name: 'Inspector' }).click()
  const panel = page.locator('.hypotheses')
  await expect(panel.locator('.hyp').first()).toContainText('ground surface was disturbed', { timeout: 20000 })
  await expect(panel).toContainText('it is not a probability')
  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'CSV', exact: true }).click()])
  expect(csv.suggestedFilename()).toMatch(/^cascadelens-rasuwa-2026-.*\.csv$/)
})

test('the printable report prints under the offline policy', async ({ page, context }) => {
  await open(page)
  await page.getByRole('button', { name: 'Bhote Koshi corridor' }).click()
  await page.getByRole('tab', { name: 'Inspector' }).click()
  const [report] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Printable / PDF' }).click()])
  const refused: string[] = []
  report.on('console', (m) => { if (/Content Security Policy/.test(m.text())) refused.push(m.text()) })
  await expect(report.getByRole('heading', { level: 1 })).toContainText('CascadeLens evidence report', { timeout: 20000 })
  // The new window inherits the policy that blocks a script written into the page, so the button must be wired from the app.
  await report.evaluate(() => { window.print = () => { document.title = 'printed' } })
  await report.getByRole('button', { name: 'Print or save as PDF' }).click()
  await expect(report).toHaveTitle('printed')
  expect(refused).toEqual([])
})

test('the first minute leads with the finding and an honest status list', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('cascadelens.finding.seen'))
  await open(page)
  const card = page.getByRole('dialog', { name: 'The key finding' })
  await expect(card).toContainText('beyond this radar frame')
  await expect(card).toContainText('Provisional products')
  await card.getByRole('button', { name: 'What is real here?' }).click()
  const status = page.getByRole('dialog', { name: 'What is real here?' })
  await expect(status).toContainText('blocked by data')
  await expect(status).toContainText('experimental')
  await page.getByRole('button', { name: 'Close' }).click()
  await card.getByRole('button', { name: 'Walk through the evidence' }).click()
  await expect(page.locator('.story')).toContainText('The source')
  await expect(card).toHaveCount(0)
})

test('hazard screens explain a road stretch and say whether the radar could watch it', async ({ page }) => {
  await open(page)
  await page.getByRole('radio', { name: /Landslide-prone terrain/ }).check()
  await page.getByRole('checkbox', { name: 'Show road exposure' }).check()
  await page.getByRole('button', { name: 'Trishuli downstream corridor' }).click()
  await page.getByRole('tab', { name: 'Inspector' }).click()
  const hz = page.locator('.hazard-at')
  await expect(hz).toContainText('Experimental')
  await expect(hz).toContainText('exposure', { timeout: 20000 })
  await expect(hz).toContainText(/Radar (can|cannot) watch|Partly watchable/)
  await expect(page.locator('.legend')).toContainText('High exposure')
})
