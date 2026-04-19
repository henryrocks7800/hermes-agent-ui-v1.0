import { test, expect } from '@playwright/test'

async function seedOnboarded(page, overrides = {}) {
  await page.addInitScript((data) => {
    const entries = {
      'hermes.onboardingCompleted': true,
      'hermes.provider': 'openai',
      'hermes.model': 'gpt-4o',
      'hermes.baseUrl': 'http://localhost:42424/v1',
      'hermes.backendMode': 'embedded',
      'hermes.externalUrl': 'http://localhost:42424/v1',
      'hermes.maxTurns': 90,
      'hermes.reasoningEffort': 'medium',
      'hermes.toolProgress': 'all',
      ...data,
    }
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }, overrides)
}

async function openApp(page, overrides = {}) {
  await seedOnboarded(page, overrides)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

test.describe('Threads and skills edge cases', () => {
  test('threads page shows no matching threads found when search misses', async ({ page }) => {
    await openApp(page, {
      'hermes.threads': [
        { id: '1', title: 'Alpha thread', createdAt: '2026-04-19T09:00:00.000Z', messages: [{ role: 'user', content: 'parser work' }] }
      ],
    })
    await page.getByRole('button', { name: 'Threads', exact: true }).click()
    await page.getByPlaceholder('Search threads...').fill('zzz-no-match')
    await expect(page.getByText('No matching threads found')).toBeVisible()
  })

  test('thread rename can be submitted by pressing enter', async ({ page }) => {
    await openApp(page, {
      'hermes.threads': [
        { id: '1', title: 'Rename me', createdAt: '2026-04-19T09:00:00.000Z', messages: [] }
      ],
    })
    await page.getByRole('button', { name: 'Threads', exact: true }).click()
    await page.getByTitle('Rename').click()
    const input = page.getByPlaceholder('e.g. My project discussion')
    await input.fill('Renamed by Enter')
    await input.press('Enter')
    await expect(page.getByRole('button', { name: 'Renamed by Enter' })).toBeVisible()
  })

  test('thread row renders row title and actions area', async ({ page }) => {
    await openApp(page, {
      'hermes.threads': [
        { id: '1', title: 'Menu thread', createdAt: '2026-04-19T09:00:00.000Z', messages: [] }
      ],
    })
    await page.getByRole('button', { name: 'Threads', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Menu thread' })).toBeVisible()
    await expect(page.getByTitle('Rename')).toBeVisible()
  })

  test('thread delete dialog cancels cleanly', async ({ page }) => {
    await openApp(page, {
      'hermes.threads': [
        { id: '1', title: 'Keep me', createdAt: '2026-04-19T09:00:00.000Z', messages: [] }
      ],
    })
    await page.getByRole('button', { name: 'Threads', exact: true }).click()
    await page.getByTitle('Delete').click()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('button', { name: 'Keep me' })).toBeVisible()
  })

  test('skills installed filter still renders skills list', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Skills', exact: true }).click()
    await page.getByText('Installed', { exact: true }).click()
    await expect(page.getByRole('button', { name: 'Inspect' }).first()).toBeVisible()
  })

  test('skills inspect dialog closes on escape', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Skills', exact: true }).click()
    await page.getByRole('button', { name: 'Inspect' }).first().click()
    await expect(page.getByText('Usage Example')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByText('Usage Example')).not.toBeVisible()
  })

  test('development filter hides terminal tool card', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: 'Skills', exact: true }).click()
    await page.locator('.inline-flex.items-center.rounded-md').filter({ hasText: 'Development' }).first().click()
    await expect(page.getByText('Autonomous AI Agents')).toBeVisible()
    await expect(page.getByText('Terminal')).not.toBeVisible()
  })
})
