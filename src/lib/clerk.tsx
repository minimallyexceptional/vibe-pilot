import React from 'react'
import {
  ClerkLoaded as RealClerkLoaded,
  ClerkLoading as RealClerkLoading,
  ClerkProvider as RealClerkProvider,
  SignedIn as RealSignedIn,
  SignedOut as RealSignedOut,
  UserButton as RealUserButton,
  useSignIn as realUseSignIn,
  useSignUp as realUseSignUp,
  useUser as realUseUser,
} from '@clerk/clerk-react'

type ChildrenProps = { children?: React.ReactNode }

type SignInHookReturn = ReturnType<typeof realUseSignIn>
type SignUpHookReturn = ReturnType<typeof realUseSignUp>
type UseUserHookReturn = ReturnType<typeof realUseUser>
type SignInSetActive = NonNullable<SignInHookReturn['setActive']>
type SetActiveParams = Parameters<SignInSetActive>[0]

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const placeholderPattern = /yourClerkKeyHere/i
const e2eFlag = import.meta.env.VITE_E2E

export const isClerkConfigured = Boolean(publishableKey && !placeholderPattern.test(publishableKey))
export const clerkMissingKeyMessage =
  'Clerk authentication is not configured. Set VITE_CLERK_PUBLISHABLE_KEY to a valid key to enable sign in.'

const isE2ETestMode = !isClerkConfigured && (e2eFlag === 'true' || e2eFlag === '1')
const TEST_VERIFICATION_CODE = '424242'

type TestUserRecord = {
  email: string
  password: string
  firstName?: string
  lastName?: string
}

type TestVerificationRecord = {
  email: string
  password: string
  firstName?: string
  lastName?: string
  code: string
}

type TestHelpers = {
  reset: () => void
  createUser: (input: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }) => void
  verificationCode: string
}

type TestAuthState = {
  users: Map<string, TestUserRecord>
  sessions: Map<string, string>
  activeSessionId: string | null
  pendingVerification: TestVerificationRecord | null
}

type TestAuthAction =
  | { type: 'RESET' }
  | { type: 'ADD_USER'; user: TestUserRecord }
  | { type: 'SET_PENDING_VERIFICATION'; record: TestVerificationRecord | null }
  | { type: 'REGISTER_SESSION'; sessionId: string; email: string }
  | { type: 'SET_ACTIVE_SESSION'; sessionId: string | null }

type TestAuthContextValue = {
  state: TestAuthState
  dispatch: React.Dispatch<TestAuthAction>
}

type GlobalWithHelpers = typeof globalThis & { __E2E_CLERK__?: TestHelpers }
type WindowWithHelpers = typeof window & { __E2E_CLERK__?: TestHelpers }

const initialTestAuthState: TestAuthState = {
  users: new Map(),
  sessions: new Map(),
  activeSessionId: null,
  pendingVerification: null,
}

const TestAuthContext = React.createContext<TestAuthContextValue | null>(null)

function testAuthReducer(state: TestAuthState, action: TestAuthAction): TestAuthState {
  switch (action.type) {
    case 'RESET':
      return {
        users: new Map(),
        sessions: new Map(),
        activeSessionId: null,
        pendingVerification: null,
      }
    case 'ADD_USER': {
      const users = new Map(state.users)
      users.set(action.user.email, action.user)
      return { ...state, users }
    }
    case 'SET_PENDING_VERIFICATION':
      return { ...state, pendingVerification: action.record }
    case 'REGISTER_SESSION': {
      const sessions = new Map(state.sessions)
      sessions.set(action.sessionId, action.email)
      return { ...state, sessions, activeSessionId: action.sessionId }
    }
    case 'SET_ACTIVE_SESSION':
      if (action.sessionId && !state.sessions.has(action.sessionId)) {
        return state
      }
      return { ...state, activeSessionId: action.sessionId }
    default:
      return state
  }
}

function useTestAuthContext(): TestAuthContextValue {
  const context = React.useContext(TestAuthContext)

  if (!context) {
    throw new Error('Test auth context is not available')
  }

  return context
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function createTestHelpers(dispatch: React.Dispatch<TestAuthAction>): TestHelpers {
  return {
    reset: () => dispatch({ type: 'RESET' }),
    createUser: ({ email, password, firstName, lastName }) => {
      const normalizedEmail = normalizeEmail(email)
      dispatch({
        type: 'ADD_USER',
        user: { email: normalizedEmail, password, firstName, lastName },
      })
    },
    verificationCode: TEST_VERIFICATION_CODE,
  }
}

function TestClerkProvider({ children }: ChildrenProps) {
  const [state, dispatch] = React.useReducer(testAuthReducer, initialTestAuthState)

  React.useEffect(() => {
    const helpers = createTestHelpers(dispatch)
    const globalWithHelpers = globalThis as GlobalWithHelpers
    globalWithHelpers.__E2E_CLERK__ = helpers

    if (typeof window !== 'undefined') {
      ;(window as WindowWithHelpers).__E2E_CLERK__ = helpers
    }

    return () => {
      if (globalWithHelpers.__E2E_CLERK__ === helpers) {
        delete globalWithHelpers.__E2E_CLERK__
      }

      if (typeof window !== 'undefined') {
        const windowWithHelpers = window as WindowWithHelpers

        if (windowWithHelpers.__E2E_CLERK__ === helpers) {
          delete windowWithHelpers.__E2E_CLERK__
        }
      }
    }
  }, [dispatch])

  const value = React.useMemo(() => ({ state, dispatch }), [state])

  return <TestAuthContext.Provider value={value}>{children}</TestAuthContext.Provider>
}

function useCreateSession() {
  const { dispatch } = useTestAuthContext()

  return React.useCallback(
    (email: string) => {
      const sessionId = `session-${Math.random().toString(36).slice(2)}`
      dispatch({ type: 'REGISTER_SESSION', sessionId, email })
      return sessionId
    },
    [dispatch],
  )
}

function useSetActiveSession() {
  const { state, dispatch } = useTestAuthContext()
  const sessionsRef = React.useRef(state.sessions)

  React.useEffect(() => {
    sessionsRef.current = state.sessions
  }, [state.sessions])

  return React.useCallback(
    async (params: SetActiveParams) => {
      let sessionId: string | null | undefined = null

      if (!params) {
        sessionId = null
      } else if (typeof params === 'string') {
        sessionId = params
      } else if (typeof params === 'object') {
        if ('session' in params && params.session !== undefined) {
          sessionId = params.session as string | null
        } else if ('sessionId' in params && params.sessionId !== undefined) {
          sessionId = params.sessionId as string | null
        }
      }

      if (sessionId === null || sessionId === undefined) {
        dispatch({ type: 'SET_ACTIVE_SESSION', sessionId: null })
        return
      }

      const sessions = sessionsRef.current

      if (!sessions.has(sessionId)) {
        throw new Error('Session not found')
      }

      dispatch({ type: 'SET_ACTIVE_SESSION', sessionId })
    },
    [dispatch],
  ) as SignInSetActive
}

function useE2ESignIn(): SignInHookReturn {
  const { state } = useTestAuthContext()
  const createSession = useCreateSession()
  const setActive = useSetActiveSession()

  return React.useMemo(
    () =>
      ({
        isLoaded: true,
        signIn: {
          async create(params: { identifier: string; password: string }) {
            const email = normalizeEmail(params.identifier)
            const user = state.users.get(email)

            if (!user || user.password !== params.password) {
              throw new Error('Invalid email or password.')
            }

            const sessionId = createSession(email)
            return { status: 'complete', createdSessionId: sessionId }
          },
        },
        setActive,
      }) as unknown as SignInHookReturn,
    [state.users, createSession, setActive],
  )
}

function useE2ESignUp(): SignUpHookReturn {
  const { state, dispatch } = useTestAuthContext()
  const createSession = useCreateSession()
  const setActive = useSetActiveSession()

  return React.useMemo(
    () =>
      ({
        isLoaded: true,
        signUp: {
          async create(params: {
            emailAddress: string
            password: string
            firstName?: string
            lastName?: string
          }) {
            const email = normalizeEmail(params.emailAddress)

            if (!email) {
              throw new Error('Enter a valid email before continuing.')
            }

            if (state.users.has(email)) {
              throw new Error('An account already exists with that email.')
            }

            dispatch({
              type: 'SET_PENDING_VERIFICATION',
              record: {
                email,
                password: params.password,
                firstName: params.firstName,
                lastName: params.lastName,
                code: TEST_VERIFICATION_CODE,
              },
            })

            return { status: 'needs_email_verification' }
          },
          async prepareEmailAddressVerification() {
            return { status: 'prepared' }
          },
          async attemptEmailAddressVerification(params: { code: string }) {
            const pending = state.pendingVerification

            if (!pending) {
              throw new Error('No sign-up attempt found.')
            }

            if (pending.code !== params.code.trim()) {
              throw new Error('Invalid verification code.')
            }

            dispatch({ type: 'SET_PENDING_VERIFICATION', record: null })
            dispatch({
              type: 'ADD_USER',
              user: {
                email: pending.email,
                password: pending.password,
                firstName: pending.firstName,
                lastName: pending.lastName,
              },
            })

            const sessionId = createSession(pending.email)
            return { status: 'complete', createdSessionId: sessionId }
          },
        },
        setActive,
      }) as unknown as SignUpHookReturn,
    [state.pendingVerification, state.users, dispatch, createSession, setActive],
  )
}

function useE2EUser(): UseUserHookReturn {
  const { state } = useTestAuthContext()

  return React.useMemo(() => {
    const activeSessionId = state.activeSessionId

    if (!activeSessionId) {
      return { isLoaded: true, isSignedIn: false, user: null }
    }

    const email = state.sessions.get(activeSessionId)

    if (!email) {
      return { isLoaded: true, isSignedIn: false, user: null }
    }

    const record = state.users.get(email)

    if (!record) {
      return { isLoaded: true, isSignedIn: false, user: null }
    }

    const fullName = [record.firstName, record.lastName].filter(Boolean).join(' ') || undefined

    return {
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: `user_${email}`,
        firstName: record.firstName,
        lastName: record.lastName,
        fullName,
        imageUrl: null,
        primaryEmailAddress: { emailAddress: email },
        emailAddresses: [{ emailAddress: email }],
      },
    }
  }, [state]) as unknown as UseUserHookReturn
}

function MockClerkProvider(props: ChildrenProps) {
  return <>{props.children}</>
}

function MockClerkLoaded(props: ChildrenProps) {
  return <>{props.children}</>
}

function MockClerkLoading() {
  return null
}

function MockSignedIn() {
  return null
}

function MockSignedOut(props: ChildrenProps) {
  return <>{props.children}</>
}

function MockUserButton() {
  return null
}

function useMockSignIn(): SignInHookReturn {
  return React.useMemo(() => mockSignInValue, [])
}

function useMockSignUp(): SignUpHookReturn {
  return React.useMemo(() => mockSignUpValue, [])
}

function useMockUser(): UseUserHookReturn {
  return React.useMemo(() => mockUserValue, [])
}

function TestClerkLoaded(props: ChildrenProps) {
  return <>{props.children}</>
}

function TestClerkLoading() {
  return null
}

function TestSignedIn(props: ChildrenProps) {
  const { state } = useTestAuthContext()

  if (!state.activeSessionId) {
    return null
  }

  return <>{props.children}</>
}

function TestSignedOut(props: ChildrenProps) {
  const { state } = useTestAuthContext()

  if (state.activeSessionId) {
    return null
  }

  return <>{props.children}</>
}

function TestUserButton() {
  return null
}

const mockSignInValue = {
  isLoaded: true,
  signIn: {
    async create() {
      throw new Error(clerkMissingKeyMessage)
    },
  },
  setActive: async () => {},
} as unknown as SignInHookReturn

const mockSignUpValue = {
  isLoaded: true,
  signUp: {
    async create() {
      throw new Error(clerkMissingKeyMessage)
    },
    async prepareEmailAddressVerification() {
      return
    },
    async attemptEmailAddressVerification() {
      throw new Error(clerkMissingKeyMessage)
    },
  },
  setActive: async () => {},
} as unknown as SignUpHookReturn

const mockUserValue = {
  isLoaded: true,
  isSignedIn: true,
  user: {
    firstName: 'Avery',
    lastName: 'Parker',
    fullName: 'Avery Parker',
    imageUrl: undefined,
    primaryEmailAddress: { emailAddress: 'avery.parker@example.com' },
    emailAddresses: [{ emailAddress: 'avery.parker@example.com' }],
  },
} as unknown as UseUserHookReturn

export function AppClerkProvider({ children }: ChildrenProps) {
  if (isClerkConfigured && publishableKey) {
    return (
      <RealClerkProvider
        publishableKey={publishableKey}
        appearance={{ variables: { colorPrimary: '#2563eb' } }}
      >
        {children}
      </RealClerkProvider>
    )
  }

  if (isE2ETestMode) {
    return <TestClerkProvider>{children}</TestClerkProvider>
  }

  if (!publishableKey) {
    console.warn(
      'Missing VITE_CLERK_PUBLISHABLE_KEY. Using mock Clerk provider so the UI can render without authentication.',
    )
  } else if (!isClerkConfigured) {
    console.warn(
      'VITE_CLERK_PUBLISHABLE_KEY still contains the placeholder value. Update it with a real key to enable authentication.',
    )
  }

  return <MockClerkProvider>{children}</MockClerkProvider>
}

export const ClerkLoaded = isClerkConfigured
  ? RealClerkLoaded
  : isE2ETestMode
    ? TestClerkLoaded
    : MockClerkLoaded
export const ClerkLoading = isClerkConfigured
  ? RealClerkLoading
  : isE2ETestMode
    ? TestClerkLoading
    : MockClerkLoading
export const SignedIn = isClerkConfigured
  ? RealSignedIn
  : isE2ETestMode
    ? TestSignedIn
    : MockSignedIn
export const SignedOut = isClerkConfigured
  ? RealSignedOut
  : isE2ETestMode
    ? TestSignedOut
    : MockSignedOut
export const UserButton = isClerkConfigured
  ? RealUserButton
  : isE2ETestMode
    ? TestUserButton
    : MockUserButton
export const useSignIn = isClerkConfigured
  ? realUseSignIn
  : isE2ETestMode
    ? useE2ESignIn
    : useMockSignIn
export const useSignUp = isClerkConfigured
  ? realUseSignUp
  : isE2ETestMode
    ? useE2ESignUp
    : useMockSignUp
export const useUser = isClerkConfigured ? realUseUser : isE2ETestMode ? useE2EUser : useMockUser

export function getClerkErrorMessage(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'errors' in error) {
    const apiError = error as { errors?: Array<{ message?: string }> }
    const messages = apiError.errors?.map((item) => item?.message).filter(Boolean) as
      | string[]
      | undefined

    if (messages && messages.length > 0) {
      return messages.join(' ')
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return null
}
