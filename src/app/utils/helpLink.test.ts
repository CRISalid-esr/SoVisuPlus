import { resolveHelpLink } from './helpLink'

const url = 'https://help.example.org'
const mail = 'support@example.org'

describe('resolveHelpLink', () => {
  it.each([undefined, '', '  ', 'phone'])(
    'returns null when the link type is %p',
    (type) => {
      expect(
        resolveHelpLink({
          NEXT_PUBLIC_HELP_LINK_TYPE: type,
          NEXT_PUBLIC_HELP_URL: url,
          NEXT_PUBLIC_SUPPORT_SERVICE_EMAIL_ADDR: mail,
        }),
      ).toBeNull()
    },
  )

  it('uses the help URL when type is url', () => {
    expect(
      resolveHelpLink({
        NEXT_PUBLIC_HELP_LINK_TYPE: 'url',
        NEXT_PUBLIC_HELP_URL: url,
        NEXT_PUBLIC_SUPPORT_SERVICE_EMAIL_ADDR: mail,
      }),
    ).toEqual({ href: url, external: true })
  })

  it('uses a mailto link when type is mail', () => {
    expect(
      resolveHelpLink({
        NEXT_PUBLIC_HELP_LINK_TYPE: ' MAIL ',
        NEXT_PUBLIC_HELP_URL: url,
        NEXT_PUBLIC_SUPPORT_SERVICE_EMAIL_ADDR: mail,
      }),
    ).toEqual({
      href: `mailto:${mail}`,
      external: false,
      email: mail,
    })
  })

  it('falls back to the mail address when the URL is missing', () => {
    expect(
      resolveHelpLink({
        NEXT_PUBLIC_HELP_LINK_TYPE: 'url',
        NEXT_PUBLIC_HELP_URL: '  ',
        NEXT_PUBLIC_SUPPORT_SERVICE_EMAIL_ADDR: mail,
      }),
    ).toEqual({
      href: `mailto:${mail}`,
      external: false,
      email: mail,
    })
  })

  it('falls back to the URL when the mail address is missing', () => {
    expect(
      resolveHelpLink({
        NEXT_PUBLIC_HELP_LINK_TYPE: 'mail',
        NEXT_PUBLIC_HELP_URL: url,
      }),
    ).toEqual({ href: url, external: true })
  })

  it('returns null when neither target is configured', () => {
    expect(resolveHelpLink({ NEXT_PUBLIC_HELP_LINK_TYPE: 'mail' })).toBeNull()
    expect(
      resolveHelpLink({
        NEXT_PUBLIC_HELP_LINK_TYPE: 'url',
        NEXT_PUBLIC_HELP_URL: '',
        NEXT_PUBLIC_SUPPORT_SERVICE_EMAIL_ADDR: '',
      }),
    ).toBeNull()
  })
})
