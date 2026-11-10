# Transient SSO: direct sign-in route bypassing the splash screen

Issue: [#870](https://github.com/CRISalid-esr/SoVisuPlus/issues/870)

## Goal

Give institutions a URL that signs the user in **without showing the splash
screen and without the Keycloak login-mode selection page**: the user is sent
straight to Keycloak with a
[`kc_idp_hint`](https://www.keycloak.org/docs/latest/server_admin/index.html#_client_suggested_idp),
so Keycloak forwards them at once to the institutional identity provider. If
they already hold a session at that IdP, they land in SoVisu+ with no
interaction at all.

Typical use: a link to SoVisu+ from an intranet or ENT portal.

## Decisions

- **Dedicated route**, not a branch in the splash logic: the splash is never
  rendered, so there is no flicker. The splash screen and its login button are
  unchanged.
- **The IdP alias comes from an environment variable**, not from the URL. This
  departs from the issue (`?auto-idp=saml2-xyz`): the entry URL carries no IdP
  name, and callers cannot send arbitrary hints to Keycloak. One alias per
  deployment.
- **The route is a small client page, not a server redirect.** NextAuth v4
  starts a sign-in with a CSRF-protected `POST`, so a route handler cannot
  redirect to Keycloak by itself; the page calls `signIn()` on mount and shows
  only the existing `Loading` component meanwhile.

## Route

`/[lang]/transient-sso` — `/transient-sso` also works, the locale middleware
prefixes the default locale and keeps the query string.

| Situation                 | Behaviour                                                           |
| ------------------------- | ------------------------------------------------------------------- |
| `KEYCLOAK_IDP_HINT` unset | **403** (plain response from the middleware): the route is disabled |
| Not authenticated         | `signIn('keycloak', { callbackUrl }, { kc_idp_hint })` on mount     |
| Already authenticated     | Redirect to `callbackUrl`, no round trip to Keycloak                |

`callbackUrl` is an optional query parameter, default `/<lang>/dashboard`. Only
a same-site relative path is accepted (starts with a single `/`); anything else
falls back to the default.

Failures (unknown user, Keycloak error) follow the existing NextAuth error
flow. The route is not the NextAuth sign-in page, so a failed sign-in cannot
loop back into it.

## Configuration

New variable `KEYCLOAK_IDP_HINT`: alias of the Keycloak identity provider to
suggest (e.g. `saml2-xyz`). Optional, empty by default.

- When unset, the route is disabled and answers 403.
- Server-side and runtime only (no `NEXT_PUBLIC_` prefix, not bundled): the
  middleware and the server page read it at request time; the page passes it
  as a prop to the client component and is forced dynamic so the value is never
  frozen at build time.
- Declared in `docker-bootstrap-app.sh`, `.env.sample` and
  `docs/installation.md`.

## Implementation

- `src/middlewares/authMiddleware.ts` — `withAuth` redirects every
  unauthenticated page request to the splash (`/fr`). `/<lang>/transient-sso`
  is handled before it: 403 when `KEYCLOAK_IDP_HINT` is unset, otherwise let
  through without a session.
- `src/app/[lang]/transient-sso/page.tsx` — server component,
  `dynamic = 'force-dynamic'`, reads `process.env.KEYCLOAK_IDP_HINT` and the
  `callbackUrl` query parameter, passes both to the client component.
- `src/app/[lang]/transient-sso/callbackUrl.ts` — `resolveCallbackUrl`, the
  same-site check.
- `src/app/[lang]/transient-sso/TransientSso.tsx` — client component: once the
  session status is known, calls `signIn` (or redirects when already
  authenticated) exactly once, and renders `Loading`. It does not reuse
  `UnauthenticatedRoute`, which redirects to an unchecked `callbackUrl`.
- No new user-facing string, no i18n change.

## Tests

- `resolveCallbackUrl`: default, relative path kept, external and
  protocol-relative values (`https://…`, `//…`, `/\…`) rejected.
- `TransientSso`: `signIn` called once with the hint; authenticated user
  redirected without `signIn`; nothing happens while the session loads.
- `authMiddleware`: the route passes without a session when the variable is
  set, answers 403 when it is not; other pages are still protected.

## Out of scope

- Choosing the IdP per request (URL parameter), or several configured aliases.
- Any change to sign-out: after signing out the user lands on the splash as
  today.
- Keycloak configuration: the IdP alias must exist in the realm, otherwise
  Keycloak shows its regular login page.
