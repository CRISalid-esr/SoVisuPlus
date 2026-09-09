import { sourceContributorNames } from '@/utils/sourceContributorNames'
import { SourceContribution } from '@/types/SourceContribution'
import { SourcePerson } from '@/types/SourcePerson'
import { LocRelator } from '@/types/LocRelator'

const contribution = (name: string, role: LocRelator = LocRelator.AUTHOR) =>
  new SourceContribution(
    role,
    new SourcePerson(`uid-${name}`, name, 'somesource', `source-${name}`),
  )

describe('sourceContributorNames', () => {
  it('lists every contribution whatever its role', () => {
    const names = sourceContributorNames([
      contribution('Zoé Martin'),
      contribution('Alan Dupont', LocRelator.EDITOR),
      contribution('Bruno Costa', LocRelator.TRANSLATOR),
    ])

    expect(names).toEqual(['Zoé Martin', 'Alan Dupont', 'Bruno Costa'])
  })

  it('never yields blanks for non-author roles', () => {
    // Regression: non-author contributions used to be mapped to '' and still
    // joined, rendering the column as ", , Zoé Martin".
    const names = sourceContributorNames([
      contribution('Alan Dupont', LocRelator.EDITOR),
      contribution('Bruno Costa', LocRelator.CONTRIBUTOR),
      contribution('Zoé Martin'),
    ])

    expect(names).not.toContain('')
    expect(names.join(', ')).toBe('Alan Dupont, Bruno Costa, Zoé Martin')
  })

  it('preserves source order instead of sorting alphabetically', () => {
    const names = sourceContributorNames([
      contribution('Zoé Martin'),
      contribution('Alan Dupont'),
    ])

    expect(names).toEqual(['Zoé Martin', 'Alan Dupont'])
  })

  it('drops contributions whose name is empty or whitespace', () => {
    const names = sourceContributorNames([
      contribution(''),
      contribution('Zoé Martin'),
      contribution('   '),
      contribution('Alan Dupont'),
    ])

    expect(names).toEqual(['Zoé Martin', 'Alan Dupont'])
    expect(names.join(', ')).not.toMatch(/,\s*,/)
  })

  it('trims surrounding whitespace', () => {
    expect(sourceContributorNames([contribution('  Zoé Martin  ')])).toEqual([
      'Zoé Martin',
    ])
  })

  it('returns an empty array for a record without contributions', () => {
    expect(sourceContributorNames([])).toEqual([])
    expect(sourceContributorNames([]).join(', ')).toBe('')
  })
})
