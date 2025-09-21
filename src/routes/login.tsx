import React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm, useStore, type AnyFieldApi } from '@tanstack/react-form'
import { ClerkLoaded, ClerkLoading, useSignIn } from '@/lib/clerk'
import { AlertCircle, LogIn, ShieldCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { getClerkErrorMessage } from '@/lib/clerk'

type LoginFormValues = {
  email: string
  password: string
}

type FormSubmitContext<TValues> = {
  value: TValues
} & Record<string, unknown>

type TextFieldRenderProps = {
  name: string
  state: { value: string }
  handleBlur: React.FocusEventHandler<HTMLInputElement>
  handleChange: (value: string) => void
}

export function LoginRoute() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const loginForm = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }: FormSubmitContext<LoginFormValues>) => {
      if (!isLoaded || !signIn) {
        return
      }

      setErrorMessage(null)

      const email = value.email.trim()

      if (!email) {
        setErrorMessage('Enter a valid email before continuing.')
        return
      }

      try {
        const result = await signIn.create({
          identifier: email,
          password: value.password,
        })

        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId })
          await navigate({ to: '/dashboard' })
          return
        }

        setErrorMessage(
          'Additional steps are required to finish signing in. Please continue in the Clerk modal.',
        )
      } catch (error) {
        setErrorMessage(
          getClerkErrorMessage(error) ?? 'Something went wrong while signing in. Please try again.',
        )
      }
    },
  })

  const isSubmitting = useStore(
    loginForm.store,
    (state: { isSubmitting: boolean }) => state.isSubmitting,
  )

  return (
    <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1.05fr,0.95fr]">
      <Card className="border-muted/60">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit border-primary/50 text-primary">
            Welcome back
          </Badge>
          <CardTitle className="text-3xl">Sign in to continue</CardTitle>
          <CardDescription>
            Access your project dashboard, manage data sources, and collaborate with your team in
            one place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClerkLoading>
            <div className="space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                void loginForm.handleSubmit()
              }}
            >
              <loginForm.Field name="email">
                {(field: AnyFieldApi) => {
                  const fieldApi = field as TextFieldRenderProps

                  return (
                    <div className="grid gap-2">
                      <Label htmlFor="login-email">Email address</Label>
                      <Input
                        id="login-email"
                        name={fieldApi.name}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={fieldApi.state.value}
                        onBlur={fieldApi.handleBlur}
                        onChange={(event) => fieldApi.handleChange(event.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  )
                }}
              </loginForm.Field>
              <loginForm.Field name="password">
                {(field: AnyFieldApi) => {
                  const fieldApi = field as TextFieldRenderProps

                  return (
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto px-0 font-normal"
                          type="button"
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <Input
                        id="login-password"
                        name={fieldApi.name}
                        type="password"
                        autoComplete="current-password"
                        value={fieldApi.state.value}
                        onBlur={fieldApi.handleBlur}
                        onChange={(event) => fieldApi.handleChange(event.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  )
                }}
              </loginForm.Field>
              {errorMessage ? (
                <div
                  className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <p>{errorMessage}</p>
                </div>
              ) : null}
              <Button type="submit" className="w-full" disabled={isSubmitting || !isLoaded}>
                <LogIn className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </ClerkLoaded>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 rounded-md border border-muted px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Your credentials are encrypted in transit.
          </div>
          <p>
            Don&apos;t have an account?{' '}
            <Button variant="link" size="sm" className="h-auto px-0" asChild>
              <Link to="/sign-up">Create one now</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
      <Card className="border-none bg-gradient-to-br from-primary/15 via-background to-secondary/20 shadow-lg">
        <CardHeader className="space-y-4 pb-6 text-primary-foreground md:pb-8">
          <Badge variant="secondary" className="w-fit bg-primary/80 text-primary-foreground">
            Why teams choose us
          </Badge>
          <CardTitle className="text-2xl text-primary">Stay in sync effortlessly</CardTitle>
          <CardDescription className="text-base text-primary/90">
            Real-time data, collaboration tools, and analytics dashboards are all available as soon
            as you sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-primary/90">
          <div className="rounded-lg border border-primary/30 bg-background/80 p-4">
            <h3 className="text-base font-semibold text-primary">Unified workspace</h3>
            <p className="text-sm text-primary/80">
              Integrate sources, monitor queries, and ship experiences without context switching.
            </p>
          </div>
          <div className="rounded-lg border border-primary/30 bg-background/80 p-4">
            <h3 className="text-base font-semibold text-primary">Secure by default</h3>
            <p className="text-sm text-primary/80">
              Role-based access controls and audit trails help your team stay compliant and
              confident.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
