import {
  affiliationDedupKey,
  countDistinctAffiliations,
  halAuthorToContributionFields,
  halStructureToAffiliation,
  isAffiliationIdentified,
} from './halMapping'
import { WorkingAffiliation, WorkingContribution } from './types'

describe('halAuthorToContributionFields', () => {
  it('maps fullName/first/last and idHal_s, orcid, idref (stripping URL prefixes)', () => {
    const fields = halAuthorToContributionFields({
      fullName_s: 'Jean Dupont',
      firstName_s: 'Jean',
      lastName_s: 'Dupont',
      form_i: 42,
      person_i: 7,
      idHal_s: 'jean-dupont',
      orcidId_s: ['https://orcid.org/0000-0001-2345-6789'],
      idrefId_s: ['https://www.idref.fr/123456789'],
    })

    expect(fields.displayName).toBe('Jean Dupont')
    expect(fields.firstName).toBe('Jean')
    expect(fields.lastName).toBe('Dupont')
    expect(fields.identifiers).toEqual([
      { type: 'idhals', value: 'jean-dupont' },
      { type: 'orcid', value: '0000-0001-2345-6789' },
      { type: 'idref', value: '123456789' },
    ])
  })

  it('never maps form_i / person_i to identifiers', () => {
    const fields = halAuthorToContributionFields({
      fullName_s: 'No Ids',
      form_i: 99,
      person_i: 5,
    })
    expect(fields.identifiers).toEqual([])
  })
})

describe('halStructureToAffiliation', () => {
  it('uses docid as hal id and maps rnsr->nns, ror, etc.', () => {
    const aff = halStructureToAffiliation({
      docid: '300',
      acronym_s: 'LAB',
      name_s: 'Some Lab',
      ror_s: ['04ezmf85'],
      rnsr_s: ['199912345A'],
      idref_s: ['026404117'],
    })
    expect(aff.hal).toBe('300')
    expect(aff.ror).toBe('04ezmf85')
    expect(aff.nns).toBe('199912345A')
    expect(aff.idref).toBe('026404117')
    expect(aff.name).toBe('Some Lab')
    expect(isAffiliationIdentified(aff)).toBe(true)
  })

  it('maps a known type_s to the HAL affiliation type', () => {
    const aff = halStructureToAffiliation({
      docid: '301',
      name_s: 'Some Lab',
      type_s: 'researchteam',
    })
    expect(aff.type).toBe('researchteam')
  })

  it('drops an unknown type_s to null', () => {
    const aff = halStructureToAffiliation({
      docid: '302',
      name_s: 'Some Lab',
      type_s: 'regroupinstitution',
    })
    expect(aff.type).toBeNull()
  })
})

const affiliation = (
  partial: Partial<WorkingAffiliation>,
): WorkingAffiliation => ({
  localId: Math.random().toString(),
  acronym: null,
  name: null,
  label: null,
  type: null,
  hal: null,
  idref: null,
  isni: null,
  nns: null,
  ror: null,
  wikidata: null,
  importedText: null,
  ...partial,
})

describe('countDistinctAffiliations', () => {
  it('dedupes by identifier across contributions', () => {
    const contributions = [
      { affiliations: [affiliation({ ror: '04ezmf85' })] },
      {
        affiliations: [
          affiliation({ ror: '04ezmf85' }),
          affiliation({ idref: '026404117' }),
        ],
      },
    ] as unknown as WorkingContribution[]

    expect(countDistinctAffiliations(contributions)).toBe(2)
  })

  it('falls back to the name when there is no identifier', () => {
    expect(affiliationDedupKey(affiliation({ name: 'Imported Lab' }))).toBe(
      'imported lab',
    )
  })
})
