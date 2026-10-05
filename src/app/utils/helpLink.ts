export type HelpLink = { href: string; external: boolean; email?: string }

type HelpLinkEnv = {
  NEXT_PUBLIC_HELP_LINK_TYPE?: string
  NEXT_PUBLIC_HELP_URL?: string
  NEXT_PUBLIC_SUPPORT_SERVICE_EMAIL_ADDR?: string
}

/**
 * Resolves the sidebar help button target. NEXT_PUBLIC_HELP_LINK_TYPE selects
 * `url` or `mail`; if the selected target is not configured, the other one is
 * used. Returns null (no help button) when the type is missing or unknown, or
 * when neither target is configured.
 */
export const resolveHelpLink = (env: HelpLinkEnv): HelpLink | null => {
  const url = env.NEXT_PUBLIC_HELP_URL?.trim()
  const mail = env.NEXT_PUBLIC_SUPPORT_SERVICE_EMAIL_ADDR?.trim()
  const urlLink = url ? { href: url, external: true } : null
  const mailLink = mail
    ? { href: `mailto:${mail}`, external: false, email: mail }
    : null

  switch (env.NEXT_PUBLIC_HELP_LINK_TYPE?.trim().toLowerCase()) {
    case 'url':
      return urlLink ?? mailLink
    case 'mail':
      return mailLink ?? urlLink
    default:
      return null
  }
}
