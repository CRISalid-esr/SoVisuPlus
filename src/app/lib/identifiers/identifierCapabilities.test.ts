import {
  computeIdentifierCapabilities,
  identifierRemovalRequiresWideScope,
  identifierSupportsAuth,
} from './identifierCapabilities'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

describe('identifierSupportsAuth', () => {
  it('is true for ORCID and idHAL, false otherwise', () => {
    expect(identifierSupportsAuth(PersonIdentifierType.orcid)).toBe(true)
    expect(identifierSupportsAuth(PersonIdentifierType.idhals)).toBe(true)
    expect(identifierSupportsAuth(PersonIdentifierType.idhali)).toBe(true)
    expect(identifierSupportsAuth(PersonIdentifierType.idref)).toBe(false)
  })
})

describe('identifierRemovalRequiresWideScope', () => {
  it('is true for IdRef only', () => {
    expect(identifierRemovalRequiresWideScope(PersonIdentifierType.idref)).toBe(
      true,
    )
    expect(identifierRemovalRequiresWideScope(PersonIdentifierType.orcid)).toBe(
      false,
    )
    expect(
      identifierRemovalRequiresWideScope(PersonIdentifierType.idhals),
    ).toBe(false)
  })
})

describe('computeIdentifierCapabilities', () => {
  const base = {
    canManage: true,
    isOwn: true,
    isWide: false,
    isAuthenticated: false,
    supportsAuth: true,
    removalRequiresWide: false,
  }

  it('no manage permission → nothing is allowed', () => {
    expect(
      computeIdentifierCapabilities({
        ...base,
        canManage: false,
        isWide: true,
      }),
    ).toEqual({
      canAuthenticate: false,
      canAddUnauthenticated: false,
      canRemove: false,
    })
  })

  it('self-scoped own account, non-authenticated: authenticate + remove', () => {
    expect(computeIdentifierCapabilities(base)).toEqual({
      canAuthenticate: true,
      canAddUnauthenticated: false,
      canRemove: true,
    })
  })

  it('authenticate is unavailable for types without an auth workflow', () => {
    expect(
      computeIdentifierCapabilities({ ...base, supportsAuth: false })
        .canAuthenticate,
    ).toBe(false)
  })

  it('wide editor can add unauthenticated; only own account can authenticate', () => {
    const other = computeIdentifierCapabilities({
      ...base,
      isOwn: false,
      isWide: true,
    })
    expect(other.canAddUnauthenticated).toBe(true)
    expect(other.canAuthenticate).toBe(false)
    expect(other.canRemove).toBe(true) // non-authenticated
  })

  it('authenticated identifier on another account cannot be removed', () => {
    const other = computeIdentifierCapabilities({
      ...base,
      isOwn: false,
      isWide: true,
      isAuthenticated: true,
    })
    expect(other.canRemove).toBe(false)
  })

  it('authenticated identifier on own account can be removed', () => {
    expect(
      computeIdentifierCapabilities({ ...base, isAuthenticated: true })
        .canRemove,
    ).toBe(true)
  })

  it('wide-only removal: self-scoped owner cannot remove', () => {
    expect(
      computeIdentifierCapabilities({ ...base, removalRequiresWide: true })
        .canRemove,
    ).toBe(false)
  })

  it('wide-only removal: wide editor can remove, on own or other account', () => {
    const wide = { ...base, removalRequiresWide: true, isWide: true }
    expect(computeIdentifierCapabilities(wide).canRemove).toBe(true)
    expect(
      computeIdentifierCapabilities({ ...wide, isOwn: false }).canRemove,
    ).toBe(true)
  })
})
