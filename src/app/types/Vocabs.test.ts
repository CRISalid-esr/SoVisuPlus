import { vocabs, getVocab, getVocabs } from '@/types/Vocabs'

describe('Vocabs type test', () => {
  it('Vocabs.getVocab test with known vocab', () => {
    const v = vocabs[0]
    expect(getVocab(v)).toEqual(vocabs[0])
  })

  it('Vocabs.getVocab test with unknown vocab', () => {
    const v = '???'
    expect(() => getVocab(v)).toThrow(`Vocab ${v} unavailable`)
  })

  it('Vocabs.getVocabs test with known vocabs', () => {
    const v = vocabs[0]
    expect(getVocabs([v])).toEqual([vocabs[0]])
  })

  it('Vocabs.getVocabs test with known and unknown vocabs', () => {
    const v = vocabs[0]
    expect(getVocabs([v, '???'])).toEqual([v])
  })
})
