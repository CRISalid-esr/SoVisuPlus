import { computeContributionStatus } from './contributionStatus'

const make = (types: string[], notAligned = false) => ({
  identifiers: types.map((type) => ({ type, value: 'x' })),
  notAligned,
})

describe('computeContributionStatus', () => {
  it('is identified_and_aligned when an idhals identifier is present', () => {
    expect(computeContributionStatus(make(['idhals']))).toBe(
      'identified_and_aligned',
    )
  })

  it('is identified_and_aligned when only an idhali identifier is present', () => {
    expect(computeContributionStatus(make(['idhali']))).toBe(
      'identified_and_aligned',
    )
  })

  it('is identified for orcid or idref', () => {
    expect(computeContributionStatus(make(['orcid']))).toBe('identified')
    expect(computeContributionStatus(make(['idref']))).toBe('identified')
  })

  it('prefers identified_and_aligned over identified', () => {
    expect(computeContributionStatus(make(['orcid', 'idhals']))).toBe(
      'identified_and_aligned',
    )
  })

  it('is not_aligned when flagged and no qualifying identifier', () => {
    expect(computeContributionStatus(make([], true))).toBe('not_aligned')
  })

  it('is not_identified when nothing applies', () => {
    expect(computeContributionStatus(make([]))).toBe('not_identified')
  })
})
