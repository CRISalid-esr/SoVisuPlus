import { Vocab } from '@/types/Vocab'

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
    expect(Vocab.getVocabs([v])).toEqual([Vocab.fromString('jel')])
  })

  it('Vocabs.getVocabs test with known and unknown vocabs', () => {
    const v = 'jel'
    expect(Vocab.getVocabs([v, '???'])).toEqual([Vocab.fromString('jel')])
  })
})
