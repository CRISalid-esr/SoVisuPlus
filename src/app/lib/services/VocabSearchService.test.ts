import { VocabSearchService } from '@/lib/services/VocabSearchService'
import { Vocab } from '@/types/Vocab'

const clientSuggest = jest.fn()

jest.mock('@/lib/services/VocabSearchClient', () => ({
  VocabSearchClient: jest.fn().mockImplementation(() => ({
    suggest: clientSuggest,
  })),
}))

jest.mock('@/utils/runtimeEnv', () => ({
  getRuntimeEnv: () => ({
    NEXT_PUBLIC_AVAILABLE_VOCABS: 'jel,aat,acm,mesh',
  }),
}))

describe('VocabSearchService class test', () => {
  let service: VocabSearchService

  beforeEach(() => {
    service = new VocabSearchService()
  })

  it('VocabSearchService call suggest function from VocabSearchClient with vocabs converted in the right type', () => {
    service.suggest('strike', ['aat', '???', 'jel'], 20, 0, true, 'fr,en')
    expect(clientSuggest).toHaveBeenCalledWith(
      'strike',
      [Vocab.fromString('aat'), Vocab.fromString('jel')],
      20,
      0,
      true,
      'fr,en',
    )
  })
})
