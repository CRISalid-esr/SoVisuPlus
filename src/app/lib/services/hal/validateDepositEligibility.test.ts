import { DocumentType, Document as DocumentClass } from '@/types/Document'
import { DocumentState, PersonIdentifierType } from '@prisma/client'
import { Literal } from '@/types/Literal'
import { Journal } from '@/types/Journal'
import { Contribution } from '@/types/Contribution'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationIdentifier } from '@/types/AuthorityOrganizationIdentifier'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { Concept } from '@/types/Concept'
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
    [
      new AuthorityOrganizationIdentifier(
        'ror' as never,
        'https://ror.org/xyz',
      ),
    ],
  )

const makeArt = ({
  publicationDate = '2024',
  withJournal = true,
  withAffiliation = true,
  titles = [new Literal('Title', 'en')],
  abstracts = [],
  subjects = [],
  type = DocumentType.Article,
}: {
  publicationDate?: string | null
  withJournal?: boolean
  withAffiliation?: boolean
  titles?: Literal[]
  abstracts?: Literal[]
  subjects?: Concept[]
  type?: DocumentType
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
    type,
    null,
    publicationDate,
    null,
    null,
    null,
    titles,
    abstracts,
    subjects,
    [contribution],
    [],
    DocumentState.default,
    withJournal
      ? new Journal('Journal of Tests', '1234-5678', 'Pub', [])
      : undefined,
  )
}

const bilingualTitles = () => [
  new Literal('English title', 'en'),
  new Literal('Titre français', 'fr'),
]

const bilingualAbstracts = () => [
  new Literal('English abstract', 'en'),
  new Literal('Résumé français', 'fr'),
]

const bilingualSubjects = () => [
  new Concept('c-1', [
    new Literal('quantique', 'fr'),
    new Literal('quantum', 'en'),
  ]),
]

describe('validateDepositEligibility', () => {
  it('accepts a complete ART document + eligible person', () => {
    expect(
      validateDepositEligibility(makeArt(), eligiblePerson(), 'ART'),
    ).toEqual({ ok: true })
  })

  it('rejects an unknown / non-depositable type', () => {
    expect(
      validateDepositEligibility(makeArt(), eligiblePerson(), 'NOPE'),
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

  it('rejects a THESE/HDR that lacks a bilingual (fr+en) title', () => {
    for (const type of ['THESE', 'HDR']) {
      expect(
        validateDepositEligibility(
          makeArt({
            withJournal: false,
            titles: [new Literal('EN only', 'en')],
          }),
          eligiblePerson(),
          type,
        ),
      ).toEqual({ ok: false, reason: 'missing_bilingual_title' })
    }
  })

  it('rejects a THESE that has a bilingual title but lacks a bilingual (fr+en) abstract', () => {
    expect(
      validateDepositEligibility(
        makeArt({
          withJournal: false,
          titles: bilingualTitles(),
          abstracts: [new Literal('EN only', 'en')],
        }),
        eligiblePerson(),
        'THESE',
      ),
    ).toEqual({ ok: false, reason: 'missing_bilingual_abstract' })
  })

  it('does not require an abstract for an HDR', () => {
    expect(
      validateDepositEligibility(
        makeArt({
          withJournal: false,
          titles: bilingualTitles(),
          abstracts: [],
          subjects: bilingualSubjects(),
        }),
        eligiblePerson(),
        'HDR',
      ),
    ).toEqual({ ok: true })
  })

  it('rejects a THESE/HDR with bilingual title and abstract but no bilingual keywords', () => {
    for (const type of ['THESE', 'HDR']) {
      expect(
        validateDepositEligibility(
          makeArt({
            withJournal: false,
            titles: bilingualTitles(),
            abstracts: bilingualAbstracts(),
            subjects: [new Concept('c-fr', [new Literal('français', 'fr')])],
          }),
          eligiblePerson(),
          type,
        ),
      ).toEqual({ ok: false, reason: 'missing_bilingual_keywords' })
    }
  })

  it('accepts a THESE with a French and an English title, abstract and keywords', () => {
    expect(
      validateDepositEligibility(
        makeArt({
          withJournal: false,
          titles: bilingualTitles(),
          abstracts: bilingualAbstracts(),
          subjects: bilingualSubjects(),
        }),
        eligiblePerson(),
        'THESE',
      ),
    ).toEqual({ ok: true })
  })

  it('accepts THESE keywords when fr and en come from different subjects', () => {
    expect(
      validateDepositEligibility(
        makeArt({
          withJournal: false,
          titles: bilingualTitles(),
          abstracts: bilingualAbstracts(),
          subjects: [
            new Concept('c-fr', [new Literal('français', 'fr')]),
            new Concept('c-en', [new Literal('english', 'en')]),
          ],
        }),
        eligiblePerson(),
        'HDR',
      ),
    ).toEqual({ ok: true })
  })

  it('does not require a bilingual title, abstract or keywords for non-thesis types', () => {
    expect(
      validateDepositEligibility(
        makeArt({ withJournal: false, titles: [new Literal('EN only', 'en')] }),
        eligiblePerson(),
        'OUV',
      ),
    ).toEqual({ ok: true })
  })
})
