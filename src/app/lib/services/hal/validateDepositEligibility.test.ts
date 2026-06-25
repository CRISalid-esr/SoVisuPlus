import { DocumentType, Document as DocumentClass } from '@/types/Document'
import { DocumentState, PersonIdentifierType } from '@prisma/client'
import { Literal } from '@/types/Literal'
import { Journal } from '@/types/Journal'
import { Contribution } from '@/types/Contribution'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationIdentifier } from '@/types/AuthorityOrganizationIdentifier'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { validateDepositEligibility } from './validateDepositEligibility'

const eligiblePerson = () =>
  new Person('p-1', false, null, 'Marie Curie', 'Marie', 'Curie', [
    new PersonIdentifier(PersonIdentifierType.hal_login, 'mcurie'),
    new PersonIdentifier(PersonIdentifierType.idhals, 'marie-curie'),
  ])

const orgWithRor = () =>
  new AuthorityOrganization(
    'org-1',
    ['LPTHE'],
    null,
    [],
    [new AuthorityOrganizationIdentifier('ror' as never, 'https://ror.org/xyz')],
  )

const makeArt = ({
  publicationDate = '2024',
  withJournal = true,
  withAffiliation = true,
}: {
  publicationDate?: string | null
  withJournal?: boolean
  withAffiliation?: boolean
} = {}): DocumentClass => {
  const person = eligiblePerson()
  const contribution = new Contribution(
    person,
    [],
    withAffiliation ? [orgWithRor()] : [],
    1,
  )
  return new DocumentClass(
    'doc-1',
    DocumentType.Article,
    null,
    publicationDate,
    null,
    null,
    null,
    [new Literal('Title', 'en')],
    [],
    [],
    [contribution],
    [],
    DocumentState.default,
    withJournal
      ? new Journal('Journal of Tests', '1234-5678', 'Pub', [])
      : undefined,
  )
}

describe('validateDepositEligibility', () => {
  it('accepts a complete ART document + eligible person', () => {
    expect(validateDepositEligibility(makeArt(), eligiblePerson(), 'ART')).toEqual(
      { ok: true },
    )
  })

  it('rejects a non-depositable type', () => {
    expect(
      validateDepositEligibility(makeArt(), eligiblePerson(), 'COMM'),
    ).toEqual({ ok: false, reason: 'type_not_depositable' })
  })

  it('rejects when the person lacks HAL identifiers', () => {
    const person = new Person('p-2', false, null, 'No', 'No', 'Hal', [
      new PersonIdentifier(PersonIdentifierType.orcid, '0000-0001-7990-9804'),
    ])
    expect(validateDepositEligibility(makeArt(), person, 'ART')).toEqual({
      ok: false,
      reason: 'missing_identifiers',
    })
  })

  const idhalOnlyPerson = () =>
    new Person('p-idhal', false, null, 'Id', 'Id', 'Hal', [
      new PersonIdentifier(PersonIdentifierType.idhals, 'id-hal-only'),
    ])

  it('rejects an idhal-only person by default (hal_login required)', () => {
    expect(
      validateDepositEligibility(makeArt(), idhalOnlyPerson(), 'ART'),
    ).toEqual({ ok: false, reason: 'missing_identifiers' })
  })

  it('accepts an idhal-only person when unauthenticated deposits are allowed', () => {
    expect(
      validateDepositEligibility(makeArt(), idhalOnlyPerson(), 'ART', {
        allowUnauthenticated: true,
      }),
    ).toEqual({ ok: true })
  })

  it('still requires an idhal even when unauthenticated deposits are allowed', () => {
    const noIdhal = new Person('p-3', false, null, 'No', 'No', 'Idhal', [
      new PersonIdentifier(PersonIdentifierType.hal_login, 'login-only'),
    ])
    expect(
      validateDepositEligibility(makeArt(), noIdhal, 'ART', {
        allowUnauthenticated: true,
      }),
    ).toEqual({ ok: false, reason: 'missing_identifiers' })
  })

  it('rejects when the document has no publication date', () => {
    expect(
      validateDepositEligibility(
        makeArt({ publicationDate: null }),
        eligiblePerson(),
        'ART',
      ),
    ).toEqual({ ok: false, reason: 'missing_publication_date' })
  })

  it('rejects an ART with no journal', () => {
    expect(
      validateDepositEligibility(
        makeArt({ withJournal: false }),
        eligiblePerson(),
        'ART',
      ),
    ).toEqual({ ok: false, reason: 'missing_journal' })
  })

  it('rejects when no author has a HAL-recognised affiliation', () => {
    expect(
      validateDepositEligibility(
        makeArt({ withAffiliation: false }),
        eligiblePerson(),
        'ART',
      ),
    ).toEqual({ ok: false, reason: 'no_hal_affiliation' })
  })
})
