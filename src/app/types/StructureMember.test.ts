import { PersonIdentifierType } from '@prisma/client'
import { StructureMember } from './StructureMember'

type IdentifierRow = {
  type: PersonIdentifierType
  value: string
  validated: boolean
  orcidIdentifier: { id: number } | null
}

const identifier = (
  type: PersonIdentifierType,
  overrides: Partial<IdentifierRow> = {},
): IdentifierRow => ({
  type,
  value: `${type}-value`,
  validated: false,
  orcidIdentifier: null,
  ...overrides,
})

const member = (identifiers: IdentifierRow[]): StructureMember =>
  StructureMember.fromDb({
    startDate: null,
    endDate: null,
    positionCode: null,
    person: {
      id: 1,
      uid: 'person-1',
      slug: null,
      displayName: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      identifiers,
    },
  })

const validatedByType = (structureMember: StructureMember) =>
  Object.fromEntries(
    structureMember.identifiers.map((id) => [id.type, id.validated]),
  )

// fromDb folds authentication into `validated` (authentication implies validation).
describe('StructureMember.fromDb effective validation', () => {
  it('keeps the stored validated flag', () => {
    const result = member([
      identifier(PersonIdentifierType.idref, { validated: true }),
    ])
    expect(validatedByType(result)).toEqual({ idref: true })
  })

  it('treats an ORCID with an OAuth grant as validated', () => {
    const result = member([
      identifier(PersonIdentifierType.orcid, { orcidIdentifier: { id: 7 } }),
    ])
    expect(validatedByType(result)).toEqual({ orcid: true })
  })

  it('treats idHAL forms as validated when a hal_login exists', () => {
    const result = member([
      identifier(PersonIdentifierType.idhals),
      identifier(PersonIdentifierType.idhali),
      identifier(PersonIdentifierType.hal_login),
    ])
    expect(validatedByType(result)).toMatchObject({
      idhals: true,
      idhali: true,
    })
  })

  it('leaves unvalidated, unauthenticated identifiers unvalidated', () => {
    const result = member([
      identifier(PersonIdentifierType.idref),
      identifier(PersonIdentifierType.orcid),
      identifier(PersonIdentifierType.idhals),
    ])
    expect(validatedByType(result)).toEqual({
      idref: false,
      orcid: false,
      idhals: false,
    })
  })
})

// The validation state is only disclosed to viewers allowed to edit the account.
describe('StructureMember.toJson validation disclosure', () => {
  const validatedMember = () =>
    member([identifier(PersonIdentifierType.idref, { validated: true })])

  it('hides the validation state when the account is not editable', () => {
    const json = validatedMember().toJson()
    expect(json.identifiers[0].validated).toBe(false)
  })

  it('exposes the validation state when the account is editable', () => {
    const structureMember = validatedMember()
    structureMember.canEditAccount = true
    expect(structureMember.toJson().identifiers[0].validated).toBe(true)
  })
})
