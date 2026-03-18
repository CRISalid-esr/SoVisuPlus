import { expect, it } from '@jest/globals'
import { LocRelator } from '@/types/LocRelator'
import { SourceContribution } from '@/types/SourceContribution'

describe('SourceContribution', () => {
  it('should return corresponding LocRelator for key label and null if unknown', () => {
    expect(SourceContribution.getRelatorFromKey('THESIS_ADVISOR')).toBe(
      LocRelator.THESIS_ADVISOR,
    )
    expect(
      SourceContribution.getRelatorFromKey(
        'AUTHOR_OF_AFTERWORD__COLOPHON__ETC_',
      ),
    ).toBe(LocRelator.AUTHOR_OF_AFTERWORD__COLOPHON__ETC_)
    expect(SourceContribution.getRelatorFromKey('UNKNOWN_ROLE')).toBeNull()
  })
})
