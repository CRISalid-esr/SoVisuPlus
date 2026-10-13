import { SourcePersonIdentifier } from '@/types/SourcePersonIdentifier'
import { SourcePersonIdentifierType } from '@prisma/client'

describe('SourcePersonIdentifier', () => {
  describe('getUrl', () => {
    it.each([
      '02725030X',
      'http://www.idref.fr/02725030X',
      'https://www.idref.fr/02725030X',
      'https://idref.fr/02725030X',
    ])('builds IdRef URL from %s', (value) => {
      const id = new SourcePersonIdentifier(
        SourcePersonIdentifierType.idref,
        value,
      )
      expect(id.getUrl()).toBe('https://www.idref.fr/02725030X')
    })
  })
})
