/**
 * Keeps `callbackUrl` only when it is a same-site relative path; otherwise
 * falls back to the dashboard of the current locale.
 */
export const resolveCallbackUrl = (
  callbackUrl: string | string[] | undefined,
  lang: string,
): string => {
  const fallback = `/${lang}/dashboard`
  if (typeof callbackUrl !== 'string') return fallback
  // `//host` and `/\host` are read by browsers as another origin.
  if (!callbackUrl.startsWith('/') || /^\/[/\\]/.test(callbackUrl)) {
    return fallback
  }
  return callbackUrl
}
