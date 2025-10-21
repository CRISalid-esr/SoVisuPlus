import { Vocab } from '@/types/Vocab'
import { VOCABS } from '@/lib/services/Vocabs'

describe('Vocab type test', () => {
  it('Vocab.fromString test with known vocab', () => {
    const v = 'jel'
    expect(Vocab.fromString(v).getValue()).toEqual('jel')
  })

  it('Vocabs.fromString test with unknown vocab', () => {
    const v = '???'
    expect(() => Vocab.fromString(v).getValue()).toThrow(
      `${v} is not an available vocab`,
    )
  })

  it('Vocabs.getVocabs test with known vocabs', () => {
    const v = 'jel'
    expect(Vocab.getVocabsFromNames([v])).toEqual([Vocab.fromString('jel')])
  })

  it('Vocabs.getVocabs test with known and unknown vocabs', () => {
    const v = 'jel'
    expect(Vocab.getVocabsFromNames([v, '???'])).toEqual([
      Vocab.fromString('jel'),
    ])
  })

  it('Vocabs.iriToIdentifiers test with known vocab', () => {
    const v1 = 'jel'
    const iri1 = 'http://zbw.eu/beta/external_identifiers/jel#P4C35'
    const expected1 = iri1.match(VOCABS[v1.toUpperCase()])

    const v2 = 'acm'
    const iri2 = 'https://dl.acm.org/10010583.10010633.10010650'
    const expected2 = iri2.match(VOCABS[v2.toUpperCase()])

    expect(Vocab.iriToIdentifier(iri1, v1)).toEqual(
      expected1 ? expected1[0] : '',
    )
    expect(Vocab.iriToIdentifier(iri2, v2)).toEqual(
      expected2 ? expected2[0].replaceAll('.', ' - ') : '',
    )
  })

  it('Vocabs.iriToIdentifiers test with available unconfigured vocab', () => {
    const mockedHas = jest.spyOn(Vocab, 'has').mockImplementation(() => true)

    const v1 = '???'
    const iri1 = 'http://whatever.com/???#P4C35'
    const expected1 = 'P4C35'

    const v2 = '???'
    const iri2 = 'http://whatever.com/???/P4C35'
    const expected2 = 'P4C35'

    expect(Vocab.iriToIdentifier(iri1, v1)).toEqual(expected1)
    expect(Vocab.iriToIdentifier(iri2, v2)).toEqual(expected2)

    mockedHas.mockRestore()
  })

  it('Vocabs.iriToIdentifiers test with unavailable vocab', () => {
    const mockedHas = jest.spyOn(Vocab, 'has').mockImplementation(() => false)

    const v = '???'
    const iri = 'http://whatever.com/???#P4C35'

    expect(Vocab.iriToIdentifier(iri, v)).toEqual('')

    mockedHas.mockRestore()
  })
})
