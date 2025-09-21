import { test, expect, type Page } from '@playwright/test'

declare global {
  interface Window {
    __E2E_CLERK__?: {
      reset: () => void
      createUser: (input: {
        email: string
        password: string
        firstName?: string
        lastName?: string
      }) => void
      verificationCode: string
    }
  }
}

const TEST_VERIFICATION_CODE = '424242'
const TEST_USER = {
  name: 'Taylor Doe',
  email: 'auth-e2e@example.com',
  password: 'Password123!',
}

async function waitForClerkHelpers(page: Page) {
  await page.waitForFunction(() => Boolean(window.__E2E_CLERK__))
}

test.describe('authentication flow', () => {
  test.describe.configure({ mode: 'serial' })

  test('allows a visitor to complete sign up', async ({ page }) => {
    await page.goto('/sign-up')
    await waitForClerkHelpers(page)
    await page.evaluate(() => window.__E2E_CLERK__?.reset())

    await page.getByLabel('Full name').fill(TEST_USER.name)
    await page.getByLabel('Work email').fill(TEST_USER.email)
    await page.getByLabel('Password').first().fill(TEST_USER.password)
    await page.getByLabel('Confirm password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText('We sent a verification code')).toBeVisible()
    await page.getByLabel('Verification code').fill(TEST_VERIFICATION_CODE)
    await page.getByRole('button', { name: 'Verify email' }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Interactive counter' })).toBeVisible()
  })

  test('allows an existing user to sign in', async ({ page }) => {
    await page.goto('/login')
    await waitForClerkHelpers(page)
    await page.evaluate(
      ({ email, password }) => {
        window.__E2E_CLERK__?.reset()
        window.__E2E_CLERK__?.createUser({
          email,
          password,
          firstName: 'Casey',
          lastName: 'Tester',
        })
      },
      { email: TEST_USER.email, password: TEST_USER.password },
    )

    await page.getByLabel('Email address').fill(TEST_USER.email)
    await page.getByLabel('Password').fill(TEST_USER.password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Interactive counter' })).toBeVisible()
  })
})

export {}
