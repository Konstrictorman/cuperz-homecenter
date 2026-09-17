# OIDC authentication setup (Oracle Identity Cloud Service)

Step-by-step guide to wire up user sign-in for this platform against an
OpenID Connect provider — specifically **Oracle Identity Cloud Service
(IDCS)** / OCI IAM Identity Domains, Cuperz's corporate identity provider.

**Scope note:** this is about authenticating a *human user* into the
Homecenter integration platform itself (staff logging into the SPA). It is
unrelated to the API Keys the platform's `AuthService` uses to call
Homecenter's own REST HUB (see the root `CLAUDE.md` domain model) — that is a
separate, machine-to-machine credential.

## Why `genericOAuth`, not MSAL

This project already ships [better-auth](https://www.better-auth.com) (see
`src/lib/auth.ts`, currently configured with email/password only). Don't
reach for `@azure/msal-browser` here — MSAL only talks to Azure AD / Entra ID
endpoints and doesn't support arbitrary third-party OIDC providers like
Oracle IDCS. better-auth ships a
[`generic-oauth`](https://www.better-auth.com/docs/plugins/generic-oauth)
plugin instead, which speaks standard OIDC discovery and slots the provider
in alongside any social providers you configure. No extra package is needed
— `generic-oauth` is bundled with the `better-auth` dependency already in
`package.json`.

## 1. Prerequisites — gather these from the Oracle tenant

Ask whoever administers the Oracle Cloud tenancy to register this app and
hand you:

| Item | Where it comes from | Notes |
| --- | --- | --- |
| **Identity domain base URL** | Oracle tenancy | e.g. `https://idcs-<guid>.identity.oraclecloud.com`. Confirm whether the tenancy is classic IDCS or a newer OCI IAM Identity Domain — the console differs, the OIDC contract below doesn't. |
| **Client ID** | App registration in IDCS | Register as a **Confidential Application** (has a client secret) for the authorization-code flow. |
| **Client Secret** | Same app registration | Treat as a secret — env var only, never committed. |
| **Redirect URI(s)** | You provide, IDCS must allow-list them | See §3 for the exact path this app expects. |
| **Post-logout redirect URI** | You provide, IDCS must allow-list it | Where IDCS sends the browser back after RP-initiated logout. |
| **Scopes** | Agree with the IDCS admin | At minimum `openid profile email`; add any custom resource scope IDCS exposes for this app (commonly shaped like `urn:opc:idcs:t:<app>:<scope>`). |

Also confirm whether QA and Production are **separate identity domains**
(separate base URL, client ID/secret, redirect URIs) — mirror the
QA/Production split this project already has for Homecenter's own APIM
environment, but treat it as unconfirmed until the Oracle admin says
otherwise (see "Open items" below).

## 2. Register the application in Oracle IDCS

1. Sign in to the Oracle IDCS / OCI IAM admin console for the target tenancy.
2. Create a new **Confidential Application** (web application, authorization
   code grant).
3. Set the redirect URI to:
   - Local dev: `http://localhost:3000/api/auth/oauth2/callback/oracle-idcs`
   - QA / Production: `https://<deployed-host>/api/auth/oauth2/callback/oracle-idcs`

   (`oracle-idcs` here is the `providerId` used in §4 — keep it consistent
   between IDCS and the app config, or endpoints won't match.)
4. Set the post-logout redirect URI to the app's base URL (or a dedicated
   `/logged-out` route if one gets added later).
5. Grant the app the scopes agreed in §1.
6. Save, then copy the **Client ID** and **Client Secret** — the secret is
   usually shown once.
7. Note the identity domain's discovery document, normally at:

   ```
   https://idcs-<guid>.identity.oraclecloud.com/.well-known/openid-configuration
   ```

   better-auth uses this single URL to resolve the authorization, token,
   userinfo, JWKS, and end-session endpoints — you don't need to hardcode
   each one individually.

## 3. Add environment variables

Add to `.env.local` (and to whatever secret store backs QA/Production —
never commit real values):

```bash
# Existing better-auth config
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<random 32+ byte secret>

# Oracle IDCS (OIDC)
OIDC_ORACLE_ISSUER_URL=https://idcs-<guid>.identity.oraclecloud.com
OIDC_ORACLE_CLIENT_ID=<client id from §2>
OIDC_ORACLE_CLIENT_SECRET=<client secret from §2>
```

These are server-only secrets — do **not** prefix them with `VITE_`
(`src/env.ts` enforces that only `VITE_`-prefixed vars are exposed to the
client; keep OIDC vars out of the `client` block entirely). Register them in
the `server` block instead:

```ts
// src/env.ts
export const env = createEnv({
  server: {
    SERVER_URL: z.string().url().optional(),
    OIDC_ORACLE_ISSUER_URL: z.string().url(),
    OIDC_ORACLE_CLIENT_ID: z.string().min(1),
    OIDC_ORACLE_CLIENT_SECRET: z.string().min(1),
  },
  // ...unchanged
})
```

## 4. Configure the server-side plugin

Edit `src/lib/auth.ts` to add the `genericOAuth` plugin alongside the
existing `tanstackStartCookies` plugin:

```ts
import { betterAuth } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins/generic-oauth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env } from '#/env'

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true, // keep as a fallback until IDCS rollout is confirmed
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: 'oracle-idcs',
          name: 'Oracle Identity Cloud Service',
          discoveryUrl: `${env.OIDC_ORACLE_ISSUER_URL}/.well-known/openid-configuration`,
          clientId: env.OIDC_ORACLE_CLIENT_ID,
          clientSecret: env.OIDC_ORACLE_CLIENT_SECRET,
          scopes: ['openid', 'profile', 'email'],
          // Verify the id_token against IDCS's published JWKS before trusting it
          requireIdTokenVerification: true,
        },
      ],
    }),
    tanstackStartCookies(),
  ],
})
```

`generic-oauth` registers each configured provider as if it were a built-in
social provider — there's no separate client-side plugin to add. `discoveryUrl`
is enough for better-auth to resolve every endpoint it needs (authorization,
token, userinfo, JWKS, and end-session if IDCS publishes one).

The existing `src/routes/api/auth/$.ts` catch-all route needs no changes —
it already forwards every `/api/auth/*` request (including the new OIDC
callback) to `auth.handler`.

## 5. Wire up the client-side sign-in call

`src/lib/auth-client.ts` needs no changes either — `createAuthClient()`
already exposes the standard `signIn.social` method, which is what drives a
`generic-oauth`-registered provider:

```tsx
import { authClient } from '#/lib/auth-client'

function LoginButton() {
  return (
    <button
      onClick={() =>
        authClient.signIn.social({
          provider: 'oracle-idcs',
          callbackURL: '/', // where to land after a successful sign-in
        })
      }
    >
      Sign in with Oracle IDCS
    </button>
  )
}
```

This redirects the browser to IDCS's authorization endpoint, IDCS redirects
back to `/api/auth/oauth2/callback/oracle-idcs`, better-auth exchanges the
code, verifies the `id_token`, creates the session, and finally redirects the
browser to `callbackURL`.

## 6. Protect routes with the session

No `_authenticated` layout route or `beforeLoad` guard exists yet in
`src/routes/`. Once one is added, the standard TanStack Router pattern
applies: read the session server-side in `beforeLoad` and `throw redirect()`
to a login route when there isn't one. Sketch:

```ts
// src/routes/_authenticated.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { auth } from '#/lib/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    const session = await auth.api.getSession({
      headers: context.request?.headers, // whatever carries the incoming request headers in this loader
    })
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return { session }
  },
})
```

Treat this as a starting sketch, not a drop-in file — it needs to match
however request headers actually reach `beforeLoad` in this TanStack Start
version, and there is no `/login` route yet either.

## 7. Sign-out

```ts
await authClient.signOut()
```

If `endSessionEndpoint` was discovered (IDCS publishes one) and
`disableProviderLogout` isn't set, better-auth also redirects through IDCS's
RP-initiated logout so the corporate SSO session ends, not just the local
app session. Set `postLogoutRedirectURI` in the provider config (§4) to
control where IDCS sends the browser back afterward.

## 8. Verify end-to-end

- [ ] `.well-known/openid-configuration` for `OIDC_ORACLE_ISSUER_URL` resolves and returns `authorization_endpoint`, `token_endpoint`, `jwks_uri`.
- [ ] Clicking "Sign in with Oracle IDCS" redirects to an IDCS login page.
- [ ] After IDCS login, the browser lands back on `callbackURL` with an active better-auth session (check the session cookie / `authClient.getSession()`).
- [ ] Signing out clears the local session (and, if configured, ends the IDCS session too).
- [ ] Repeat all of the above against the QA identity domain, if it's a separate registration from Production.

## Open items / unconfirmed

Per this repo's own convention of flagging what hasn't been confirmed with
the relevant third party (see root `CLAUDE.md`), the following are
assumptions, not a closed contract:

- **QA vs Production split on the Oracle side** — unconfirmed whether Cuperz's
  Oracle tenancy actually has separate identity domains per environment, or
  one domain shared across both. Confirm before hardcoding two sets of env
  vars.
- **Classic IDCS vs OCI IAM Identity Domain** — Oracle has been migrating
  customers between these; console navigation and some URL shapes differ.
  Confirm which one the Cuperz tenancy is on.
- **Role / group claims for RBAC** — this guide only covers authentication
  (proving who the user is). If the platform later needs authorization
  (e.g. restricting the Bitácora screen to certain roles), it's unconfirmed
  whether IDCS exposes group membership as an ID-token claim, a scope, or a
  separate userinfo call — needs validation with the IDCS admin before
  designing role mapping.
- **MFA / step-up requirements** — not yet discussed with the Oracle admin;
  may affect the `prompt` parameter or session lifetime expectations.
