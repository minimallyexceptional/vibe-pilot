import { test } from '@playwright/test'

const PROJECT_ID = 'lunar-interfaces'

test('design document builder screenshot', async ({ page }) => {
  await page.goto(`/dashboard/${PROJECT_ID}/design-document`)

  await page.getByRole('heading', { name: 'Design Document Builder' }).waitFor()

  const chatInput = page.getByPlaceholder(
    'Describe what you are trying to plan. Share goals, audience, or open questions.',
  )
  await chatInput.fill('We need an onboarding flow for new creators with clear milestones.')
  await chatInput.press('Enter')

  await page.getByText('Design document').first().waitFor()

  await page.waitForTimeout(500)

  await page.screenshot({
    path: 'playwright-artifacts/design-document-builder.png',
    fullPage: true,
  })
})
