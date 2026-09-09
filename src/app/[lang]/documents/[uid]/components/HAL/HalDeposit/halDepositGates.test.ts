import { DocumentType, Document as DocumentClass } from '@/types/Document'
import { DocumentState } from '@prisma/client'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationIdentifier } from '@/types/AuthorityOrganizationIdentifier'
import { Person } from '@/types/Person'
import { hasHalRecognisedAffiliation } from './halDepositGates'

const docWithOrg = (orgIdType: string | null) => {
  const person = new Person('p', false, null, 'A', 'A', 'B')
  const org = new AuthorityOrganization(
    'org',
    ['Lab'],
    null,
    [],
    orgIdType
      ? [new AuthorityOrganizationIdentifier(orgIdType as never, 'val')]
      : [],
  )
  return new DocumentClass(
    'doc',
    DocumentType.Article,
    null,
    '2024',
    null,
    null,
    null,
    [new Literal('t', 'en')],
    [],
    [],
    [new Contribution(person, [], [org], 1)],
    [],
    DocumentState.default,
  )
}

describe('hasHalRecognisedAffiliation', () => {
  it.each(['nns', 'ror', 'isni', 'idref'])(
    'accepts a %s affiliation identifier',
    (type) => {
      expect(hasHalRecognisedAffiliation(docWithOrg(type))).toBe(true)
    },
  )

  it('rejects a non-HAL identifier (e.g. scopus)', () => {
    expect(hasHalRecognisedAffiliation(docWithOrg('scopus'))).toBe(false)
  })

  it('rejects an org with no identifiers', () => {
    expect(hasHalRecognisedAffiliation(docWithOrg(null))).toBe(false)
  })
})
