import { Contribution } from '@/types/Contribution'
import { Person } from '@/types/Person'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { LocRelator } from '@/types/LocRelator'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationType } from '@prisma/client'
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

describe('buildContributionsState', () => {
  it('carries every non-empty contribution in order', () => {
    const baseline = [contribution('p1'), contribution('p2')]
    const working = baseline.map(workingFromContribution)

    const state = buildContributionsState(working, false)
    expect(state).toHaveLength(2)
    expect(state.map((c) => c.person.uid)).toEqual(['p1', 'p2'])
  })

  it('keeps a null person uid for a brand-new contributor', () => {
    const baseline = [contribution('p1')]
    const working = baseline.map(workingFromContribution)
    working.push({
      ...workingFromContribution(contribution('temp')),
      personUid: null,
    })

    const state = buildContributionsState(working, false)
    expect(state).toHaveLength(2)
    expect(state[1].person.uid).toBeNull()
  })

  it('skips an empty, never-filled-in new contributor (no name/identifiers)', () => {
    const baseline = [contribution('p1')]
    const working = baseline.map(workingFromContribution)
    working.push({
      ...workingFromContribution(contribution('temp')),
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
    const working = baseline.map(workingFromContribution)

    const state = buildContributionsState(working, true)
    expect(state.map((c) => c.rank)).toEqual([1, 2])
  })

  it('nulls all ranks when ranking mode is off', () => {
    const baseline = [
      contribution('p1', { rank: 1 }),
      contribution('p2', { rank: 2 }),
    ]
    const working = baseline.map(workingFromContribution)

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
    const working = baseline.map(workingFromContribution)
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
    const working = baseline.map(workingFromContribution)
    expect(contributionsAreDirty(baseline, working, false)).toBe(false)
  })

  it('is dirty when a role is added', () => {
    const baseline = [contribution('p1', { roles: [LocRelator.AUTHOR] })]
    const working = baseline.map(workingFromContribution)
    working[0].roles = [LocRelator.AUTHOR, LocRelator.EDITOR]
    expect(contributionsAreDirty(baseline, working, false)).toBe(true)
  })

  it('is dirty when an identifier changes', () => {
    const baseline = [contribution('p1')]
    const working = baseline.map(workingFromContribution)
    working[0].identifiers = [
      { type: PersonIdentifierType.orcid, value: '0000-0001' },
    ]
    expect(contributionsAreDirty(baseline, working, false)).toBe(true)
  })

  it('is dirty when a contributor is added', () => {
    const baseline = [contribution('p1')]
    const working = baseline.map(workingFromContribution)
    working.push({
      ...workingFromContribution(contribution('temp')),
      personUid: null,
    })
    expect(contributionsAreDirty(baseline, working, false)).toBe(true)
  })

  it('is dirty when a contributor is removed', () => {
    const baseline = [contribution('p1')]
    expect(contributionsAreDirty(baseline, [], false)).toBe(true)
  })

  it('is not dirty after adding an empty, never-filled-in row', () => {
    const baseline = [contribution('p1')]
    const working = baseline.map(workingFromContribution)
    working.push({
      ...workingFromContribution(contribution('temp')),
      personUid: null,
      displayName: '   ',
      identifiers: [],
    })
    expect(contributionsAreDirty(baseline, working, false)).toBe(false)
  })

  it('is not dirty on reorder when ranking mode is off', () => {
    const baseline = [contribution('p1'), contribution('p2')]
    const working = baseline.map(workingFromContribution).reverse()
    expect(contributionsAreDirty(baseline, working, false)).toBe(false)
  })

  it('is dirty on reorder when ranking mode is on', () => {
    const baseline = [
      contribution('p1', { rank: 1 }),
      contribution('p2', { rank: 2 }),
    ]
    const working = baseline.map(workingFromContribution).reverse()
    expect(contributionsAreDirty(baseline, working, true)).toBe(true)
  })

  it('is dirty when ranking mode is toggled on', () => {
    const baseline = [contribution('p1'), contribution('p2')]
    const working = baseline.map(workingFromContribution)
    expect(contributionsAreDirty(baseline, working, true)).toBe(true)
  })

  it('is dirty when "Add contributor" detaches an existing contributor', () => {
    const baseline = [
      contribution('p1', { ids: [[PersonIdentifierType.orcid, 'x']] }),
    ]
    const working = baseline.map(workingFromContribution)
    // markNotAligned effect:
    working[0].personUid = null
    working[0].notAligned = true
    working[0].identifiers = []
    expect(contributionsAreDirty(baseline, working, false)).toBe(true)
  })
})
