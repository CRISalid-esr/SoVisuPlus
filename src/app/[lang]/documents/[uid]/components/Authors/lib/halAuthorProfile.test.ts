import { authorInitials } from './halAuthorProfile'

describe('authorInitials', () => {
  it('uses first/middle/last initials when present', () => {
    expect(
      authorInitials({
        firstName_s: 'Jean',
        middleName_s: 'Marie',
        lastName_s: 'Dupont',
        fullName_s: 'Jean Marie Dupont',
      }),
    ).toBe('JMD')
  })

  it('uses first/last initials when there is no middle name', () => {
    expect(
      authorInitials({
        firstName_s: 'Sophie',
        lastName_s: 'Martin',
        fullName_s: 'Sophie Martin',
      }),
    ).toBe('SM')
  })

  it('falls back to the first two words of fullName_s when names are absent', () => {
    expect(authorInitials({ fullName_s: 'Sophie J. Martin' })).toBe('SJ')
  })

  it('falls back to label_s when fullName_s is empty', () => {
    expect(authorInitials({ fullName_s: '', label_s: 'Acme Lab' })).toBe('AL')
  })

  it('returns ? when nothing is available', () => {
    expect(authorInitials({ fullName_s: '' })).toBe('?')
  })
})
