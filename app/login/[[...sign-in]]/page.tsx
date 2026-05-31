import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { ArrowLeft } from 'lucide-react'
import { SignIn } from '@clerk/nextjs'
import { Logo } from '@/components/mealsaver/logo'

type LoginSearchParams = Promise<{
  role?: string
}>

export default async function LoginCatchAll({
  searchParams,
}: {
  searchParams: LoginSearchParams
}) {
  const params = await searchParams
  const selectedRole = params.role === 'receiver' ? 'receiver' : 'donor'
  const redirectUrl = `/api/auth/redirect?role=${selectedRole}`

  // If a session already exists, never render <SignIn/> — Clerk refuses to draw
  // the form when signed in, which leaves a blank, stuck page (e.g. a stale
  // session pointing at a deleted user). Resolve it server-side instead: the
  // redirect handler sends valid sessions to their dashboard and unknown ones
  // on to /register, so this page can never hang.
  //
  // Only forward the role when it was explicitly chosen via the tab. For a bare
  // /login hit we must NOT inherit the "donor" default — a user who holds both
  // roles would otherwise always be bounced to the donor dashboard. Let the
  // redirect handler use their stored role instead.
  const { userId } = await auth()
  if (userId) redirect(params.role ? redirectUrl : '/api/auth/redirect')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute left-5 top-5 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft size={15} />
        Back
      </Link>

      {/* Logo above the Clerk widget */}
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Logo size="lg" />
        <p className="text-sm text-muted-foreground">
          Save Food. Feed People.
        </p>
      </div>

      <div className="mb-4 flex w-full max-w-[420px] items-center gap-2 rounded-xl border border-border bg-card p-1">
        <Link
          href="/login?role=donor"
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors ${
            selectedRole === 'donor'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          Donor Login
        </Link>
        <Link
          href="/login?role=receiver"
          className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition-colors ${
            selectedRole === 'receiver'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-secondary'
          }`}
        >
          NGO Login
        </Link>
      </div>

      <SignIn
        appearance={{
          elements: {
            card:              'shadow-sm border border-border rounded-2xl',
            headerTitle:       'text-foreground font-bold',
            headerSubtitle:    'text-muted-foreground',
            formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg',
            footerActionLink:  'text-primary hover:underline font-medium',
            socialButtonsBlockButton: 'hidden',
            socialButtonsIconButton: 'hidden',
            dividerLine: 'hidden',
            dividerText: 'hidden',
          },
        }}
        fallbackRedirectUrl={redirectUrl}
        signUpUrl="/register"
      />
    </div>
  )
}
