import { Contribution } from '@/types/Contribution'
import { Person } from '@/types/Person'
import { Document, DocumentType } from '@/types/Document'
import { DocumentRecord } from '@/types/DocumentRecord'
import { SourceContribution } from '@/types/SourceContribution'
import { SourcePerson } from '@/types/SourcePerson'
import { SourcePersonIdentifier } from '@/types/SourcePersonIdentifier'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { LocRelator } from '@/types/LocRelator'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import {
  AuthorityOrganizationType,
  SourcePersonIdentifierType,
} from '@prisma/client'
import {
  buildContributionsState,
  contributionsAreDirty,
  workingFromContribution,
} from './contributionDiff'

function person(uid: string, ids: [PersonIdentifierType, string][] = []) {
  return new Person(
    uid,
    false,
    null,
    `Name ${uid}`,
    'First',
    'Last',
    ids.map(([type, value]) => new PersonIdentifier(type, value)),
  )
}

function contribution(
  uid: string,
  opts: {
    roles?: LocRelator[]
    ids?: [PersonIdentifierType, string][]
    rank?: number | null
  } = {},
) {
  return new Contribution(
    person(uid, opts.ids ?? []),
    opts.roles ?? [LocRelator.AUTHOR],
    [],
    opts.rank ?? null,
  )
}

function doc(contributions: Contribution[], records: DocumentRecord[] = []) {
  return new Document(
    'd1',
    DocumentType.Document,
    null,
    null,
    null,
    null,
    null,
    [],
    [],
    [],
    contributions,
    records,
  )
}

function toWorking(contributions: Contribution[]) {
  const document = doc(contributions)
  return contributions.map((item) => workingFromContribution(item, document))
}

function sourcePerson(
  uid: string,
  ids: [SourcePersonIdentifierType, string][],
) {
  return new SourcePerson(
    uid,
    `Source ${uid}`,
    'hal',
    null,
    ids.map(([type, value]) => new SourcePersonIdentifier(type, value)),
  )
}

function record(uid: string, sourcePersons: SourcePerson[]) {
  return new DocumentRecord(
    uid,
    uid,
    [],
    sourcePersons.map(
      (item) => new SourceContribution(LocRelator.AUTHOR, item),
    ),
    [],
    null,
    BibliographicPlatform.HAL,
    [],
  )
}

describe('buildContributionsState', () => {
  it('carries every non-empty contribution in order', () => {
    const baseline = [contribution('p1'), contribution('p2')]
    const working = toWorking(baseline)

    const state = buildContributionsState(working, false)
    expect(state).toHaveLength(2)
    expect(state.map((c) => c.person.uid)).toEqual(['p1', 'p2'])
  })

  it('keeps a null person uid for a brand-new contributor', () => {
    const baseline = [contribution('p1')]
    const working = toWorking(baseline)
    working.push({
      ...workingFromContribution(contribution('temp'), doc([])),
      personUid: null,
    })

    const state = buildContributionsState(working, false)
    expect(state).toHaveLength(2)
    expect(state[1].person.uid).toBeNull()
  })

  it('skips an empty, never-filled-in new contributor (no name/identifiers)', () => {
    const baseline = [contribution('p1')]
    const working = toWorking(baseline)
    working.push({
      ...workingFromContribution(contribution('temp'), doc([])),
      personUid: null,
      displayName: '   ',
      identifiers: [],
    })

    const state = buildContributionsState(working, false)
    expect(state).toHaveLength(1)
    expect(state[0].person.uid).toBe('p1')
  })

  it('assigns sequential ranks when ranking mode is on', () => {
    const baseline = [contribution('p1'), contribution('p2')]
    const working = toWorking(baseline)

    const state = buildContributionsState(working, true)
    expect(state.map((c) => c.rank)).toEqual([1, 2])
  })

  it('nulls all ranks when ranking mode is off', () => {
    const baseline = [
      contribution('p1', { rank: 1 }),
      contribution('p2', { rank: 2 }),
    ]
    const working = toWorking(baseline)

    const state = buildContributionsState(working, false)
    expect(state.map((c) => c.rank)).toEqual([null, null])
  })

  it('maps the DB affiliation type to its HAL default and carries it in the payload', () => {
    const org = new AuthorityOrganization(
      'o1',
      ['Some Lab'],
      AuthorityOrganizationType.research_team,
      [],
      [],
    )
    const baseline = [
      new Contribution(person('p1'), [LocRelator.AUTHOR], [org], null),
    ]
    const working = toWorking(baseline)
    // research_team -> researchteam (HAL default).
    expect(working[0].affiliations[0].type).toBe('researchteam')

    working[0].affiliations[0].type = 'institution'
    const state = buildContributionsState(working, false)
    expect(state[0].affiliations[0].type).toBe('institution')
  })
})

describe('contributionsAreDirty', () => {
  it('is clean when nothing changed', () => {
    const baseline = [contribution('p1')]
    const working = toWorking(baseline)
    expect(contributionsAreDirty(doc(baseline), working, false)).toBe(false)
  })

  it('is dirty when a role is added', () => {
    const baseline = [contribution('p1', { roles: [LocRelator.AUTHOR] })]
    const working = toWorking(baseline)
    working[0].roles = [LocRelator.AUTHOR, LocRelator.EDITOR]
    expect(contributionsAreDirty(doc(baseline), working, false)).toBe(true)
  })

  it('is dirty when an identifier changes', () => {
    const baseline = [contribution('p1')]
    const working = toWorking(baseline)
    working[0].identifiers = [
      { type: PersonIdentifierType.orcid, value: '0000-0001' },
    ]
    expect(contributionsAreDirty(doc(baseline), working, false)).toBe(true)
  })

  it('is dirty when a contributor is added', () => {
    const baseline = [contribution('p1')]
    const working = toWorking(baseline)
    working.push({
      ...workingFromContribution(contribution('temp'), doc([])),
      personUid: null,
    })
    expect(contributionsAreDirty(doc(baseline), working, false)).toBe(true)
  })

  it('is dirty when a contributor is removed', () => {
    const baseline = [contribution('p1')]
    expect(contributionsAreDirty(doc(baseline), [], false)).toBe(true)
  })

  it('is not dirty after adding an empty, never-filled-in row', () => {
    const baseline = [contribution('p1')]
    const working = toWorking(baseline)
    working.push({
      ...workingFromContribution(contribution('temp'), doc([])),
      personUid: null,
      displayName: '   ',
      identifiers: [],
    })
    expect(contributionsAreDirty(doc(baseline), working, false)).toBe(false)
  })

  it('is not dirty on reorder when ranking mode is off', () => {
    const baseline = [contribution('p1'), contribution('p2')]
    const working = toWorking(baseline).reverse()
    expect(contributionsAreDirty(doc(baseline), working, false)).toBe(false)
  })

  it('is dirty on reorder when ranking mode is on', () => {
    const baseline = [
      contribution('p1', { rank: 1 }),
      contribution('p2', { rank: 2 }),
    ]
    const working = toWorking(baseline).reverse()
    expect(contributionsAreDirty(doc(baseline), working, true)).toBe(true)
  })

  it('is dirty when ranking mode is toggled on', () => {
    const baseline = [contribution('p1'), contribution('p2')]
    const working = toWorking(baseline)
    expect(contributionsAreDirty(doc(baseline), working, true)).toBe(true)
  })

  it('is dirty when "Add contributor" detaches an existing contributor', () => {
    const baseline = [
      contribution('p1', { ids: [[PersonIdentifierType.orcid, 'x']] }),
    ]
    const working = toWorking(baseline)
    // markNotAligned effect:
    working[0].personUid = null
    working[0].notAligned = true
    working[0].identifiers = []
    expect(contributionsAreDirty(doc(baseline), working, false)).toBe(true)
  })
})

describe('source-person identifiers fallback', () => {
  // A contributor without own identifiers, linked to one source person of the
  // document and one source person of another document.
  function fallbackDocument() {
    const inDocument = sourcePerson('sp-in', [
      [SourcePersonIdentifierType.orcid, '0000-0001'],
    ])
    const elsewhere = sourcePerson('sp-out', [
      [SourcePersonIdentifierType.idref, '123456789'],
    ])
    const item = contribution('p1')
    item.person.records = [inDocument, elsewhere]
    return doc([item], [record('r1', [inDocument])])
  }

  it('only keeps identifiers of source persons contributing to the document', () => {
    const document = fallbackDocument()
    const working = workingFromContribution(document.contributions[0], document)
    expect(working.identifiers).toEqual([
      { type: PersonIdentifierType.orcid, value: '0000-0001' },
    ])
  })

  it('is clean when the baseline relies on the fallback', () => {
    const document = fallbackDocument()
    const working = document.contributions.map((item) =>
      workingFromContribution(item, document),
    )
    expect(contributionsAreDirty(document, working, false)).toBe(false)
  })
})
