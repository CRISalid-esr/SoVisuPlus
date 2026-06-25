import { PersonIdentifierType } from '@prisma/client'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { HalOnBehalfOfBuilder } from './HalOnBehalfOfBuilder'

const id = (type: PersonIdentifierType, value: string) =>
  new PersonIdentifier(type, value)

describe('HalOnBehalfOfBuilder', () => {
  it('builds login|…;idhal|… with idhals', () => {
    const header = HalOnBehalfOfBuilder.build([
      id(PersonIdentifierType.hal_login, 'marvin'),
      id(PersonIdentifierType.idhals, 'arthur-dent'),
    ])
    expect(header).toBe('login|marvin;idhal|arthur-dent')
  })

  it('prefers idhals over idhali when both present', () => {
    const header = HalOnBehalfOfBuilder.build([
      id(PersonIdentifierType.hal_login, 'marvin'),
      id(PersonIdentifierType.idhals, 'preferred'),
      id(PersonIdentifierType.idhali, 'fallback'),
    ])
    expect(header).toBe('login|marvin;idhal|preferred')
  })

  it('falls back to idhali when idhals is absent', () => {
    const header = HalOnBehalfOfBuilder.build([
      id(PersonIdentifierType.hal_login, 'marvin'),
      id(PersonIdentifierType.idhali, '12345'),
    ])
    expect(header).toBe('login|marvin;idhal|12345')
  })

  it('emits idhal only when hal_login is missing', () => {
    expect(
      HalOnBehalfOfBuilder.build([id(PersonIdentifierType.idhals, 'arthur')]),
    ).toBe('idhal|arthur')
  })

  it('returns null when no idhal identifier is present', () => {
    expect(
      HalOnBehalfOfBuilder.build([
        id(PersonIdentifierType.hal_login, 'marvin'),
        id(PersonIdentifierType.orcid, '0000-0001-7990-9804'),
      ]),
    ).toBeNull()
  })

  it('never includes ORCID', () => {
    const header = HalOnBehalfOfBuilder.build([
      id(PersonIdentifierType.hal_login, 'marvin'),
      id(PersonIdentifierType.idhals, 'arthur'),
      id(PersonIdentifierType.orcid, '0000-0001-7990-9804'),
    ])
    expect(header).not.toContain('orcid')
    expect(header).not.toContain('0000-0001')
  })
})
