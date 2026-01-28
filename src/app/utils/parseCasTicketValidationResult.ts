import { XMLParser } from 'fast-xml-parser'

export type CasNormalizedAttributes = {
  uid: string
  lastName: string
  firstName: string
  email: string
  userName: string
}

export type CasValidateResult =
  | {
      success: true
      user: string
      attributes: CasNormalizedAttributes
    }
  | {
      success: false
      failureCode?: string
      failureMessage?: string
    }

export function parseCasTicketValidationResult(xml: string): CasValidateResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: false,
    trimValues: true,
  })

  const obj = parser.parse(xml)
  const sr = obj?.['cas:serviceResponse'] ?? obj?.serviceResponse

  const failure = sr?.['cas:authenticationFailure'] ?? sr?.authenticationFailure
  if (failure) {
    const code = failure?.['@_code'] ?? failure?.['@code']
    const message =
      typeof failure === 'string'
        ? failure
        : (failure?.['#text'] ?? '').toString()
    return {
      success: false,
      failureCode: code,
      failureMessage: message?.trim(),
    }
  }

  const success = sr?.['cas:authenticationSuccess'] ?? sr?.authenticationSuccess
  if (!success) {
    return { success: false, failureMessage: 'Missing authenticationSuccess' }
  }

  const user = (success?.['cas:user'] ?? success?.user ?? '').toString().trim()
  if (!user) return { success: false, failureMessage: 'Missing cas:user' }

  const attrsNode = success?.['cas:attributes'] ?? success?.attributes ?? {}

  const readAttr = (xmlKey: string): string => {
    const raw = attrsNode?.[`cas:${xmlKey}`] ?? attrsNode?.[xmlKey]
    if (raw == null) return ''

    if (Array.isArray(raw)) {
      const first = raw[0]
      if (first == null) return ''
      if (typeof first === 'object') return String(first['#text'] ?? '').trim()
      return String(first).trim()
    }

    if (typeof raw === 'object') {
      const text = raw['#text']
      return text == null ? '' : String(text).trim()
    }

    return String(raw).trim()
  }

  // Hard-coded expected XML fields
  const uid = readAttr('UID')
  const lastName = readAttr('LASTNAME')
  const firstName = readAttr('FIRSTNAME')
  const email = readAttr('EMAIL')
  const userName = readAttr('username')

  const attributes: CasNormalizedAttributes = {
    uid,
    lastName,
    firstName,
    email,
    userName,
  }

  const missing = Object.entries(attributes).filter(([, v]) => !v)
  if (missing.length) {
    console.warn(
      `Warning: Missing CAS attributes for user=${user}: ${missing
        .map(([k]) => k)
        .join(', ')}`,
    )
  }

  return { success: true, user, attributes }
}
