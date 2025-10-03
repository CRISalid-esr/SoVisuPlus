import { VocabSearchService } from '@/lib/services/VocabSearchService'
import { Vocab } from '@/types/Vocab'

const clientSuggest = jest.fn()

jest.mock('@/lib/services/VocabSearchClient', () => ({
  VocabSearchClient: jest.fn().mockImplementation(() => ({
    suggest: clientSuggest,
  })),
}))

describe('VocabSearchService class test', () => {
  let service: VocabSearchService

  beforeEach(() => {
    service = new VocabSearchService()
  })

  it('VocabSearchService call suggest function from VocabSearchClient with parameters converted in right types', () => {
    service.suggest('strike', ['aat', '???', 'jel'], 'fr,en')
    expect(clientSuggest).toHaveBeenCalledWith(
      'strike',
      [Vocab.fromString('aat'), Vocab.fromString('jel')],
      'fr,en',
    )
  })
})
