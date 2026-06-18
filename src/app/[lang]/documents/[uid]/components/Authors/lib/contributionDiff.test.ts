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
  buildContributionChanges,
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

describe('buildContributionChanges', () => {
  it('produces no changes when nothing changed', () => {
    const baseline = [contribution('p1')]
    const working = baseline.map(workingFromContribution)
    expect(buildContributionChanges(baseline, working, false)).toEqual([])
  })

  it('emits UPDATE when a role is added', () => {
    const baseline = [contribution('p1', { roles: [LocRelator.AUTHOR] })]
    const working = baseline.map(workingFromContribution)
    working[0].roles = [LocRelator.AUTHOR, LocRelator.EDITOR]

    const changes = buildContributionChanges(baseline, working, false)
    expect(changes).toHaveLength(1)
    expect(changes[0].actionType).toBe('UPDATE')
  })

  it('emits UPDATE when an identifier changes', () => {
    const baseline = [contribution('p1')]
    const working = baseline.map(workingFromContribution)
    working[0].identifiers = [
      { type: PersonIdentifierType.orcid, value: '0000-0001' },
    ]

    const changes = buildContributionChanges(baseline, working, false)
    expect(changes).toHaveLength(1)
    expect(changes[0].actionType).toBe('UPDATE')
  })

  it('emits ADD for a brand-new contributor (no person uid)', () => {
    const baseline = [contribution('p1')]
    const working = baseline.map(workingFromContribution)
    working.push({
      ...workingFromContribution(contribution('temp')),
      personUid: null,
    })

    const changes = buildContributionChanges(baseline, working, false)
    const adds = changes.filter((c) => c.actionType === 'ADD')
    expect(adds).toHaveLength(1)
    expect(adds[0].parameters.person.uid).toBeNull()
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

    const changes = buildContributionChanges(baseline, working, false)
    expect(changes).toEqual([])
  })

  it('emits REMOVE for a dropped baseline contribution', () => {
    const baseline = [contribution('p1')]
    const changes = buildContributionChanges(baseline, [], false)
    expect(changes).toEqual([
      { actionType: 'REMOVE', parameters: { person: { uid: 'p1' } } },
    ])
  })

  it('assigns sequential ranks when ranking mode is on', () => {
    const baseline = [contribution('p1'), contribution('p2')]
    const working = baseline.map(workingFromContribution)

    const changes = buildContributionChanges(baseline, working, true)
    expect(changes).toHaveLength(2)
    expect(changes.every((c) => c.actionType === 'UPDATE')).toBe(true)
    const ranks = changes.map((c) =>
      c.actionType === 'UPDATE' ? c.parameters.rank : null,
    )
    expect(ranks).toEqual([1, 2])
  })

  it('nulls all ranks when ranking mode is off', () => {
    const baseline = [
      contribution('p1', { rank: 1 }),
      contribution('p2', { rank: 2 }),
    ]
    const working = baseline.map(workingFromContribution)

    const changes = buildContributionChanges(baseline, working, false)
    expect(changes).toHaveLength(2)
    changes.forEach((c) => {
      expect(c.actionType).toBe('UPDATE')
      if (c.actionType === 'UPDATE') expect(c.parameters.rank).toBeNull()
    })
  })

  it('maps the DB affiliation type to its HAL default and carries a change in the payload', () => {
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
    const changes = buildContributionChanges(baseline, working, false)
    expect(changes).toHaveLength(1)
    expect(changes[0].actionType).toBe('UPDATE')
    if (changes[0].actionType === 'UPDATE') {
      expect(changes[0].parameters.affiliations[0].type).toBe('institution')
    }
  })

  it('treats "Add contributor" on an existing contributor as REMOVE + ADD', () => {
    const baseline = [
      contribution('p1', { ids: [[PersonIdentifierType.orcid, 'x']] }),
    ]
    const working = baseline.map(workingFromContribution)
    // markNotAligned effect:
    working[0].personUid = null
    working[0].notAligned = true
    working[0].identifiers = []

    const changes = buildContributionChanges(baseline, working, false)
    const types = changes.map((c) => c.actionType).sort()
    expect(types).toEqual(['ADD', 'REMOVE'])
    const remove = changes.find((c) => c.actionType === 'REMOVE')
    expect(remove?.parameters).toEqual({ person: { uid: 'p1' } })
  })
})
