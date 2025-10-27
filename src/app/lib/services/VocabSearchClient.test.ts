import { VocabSearchClient } from '@/lib/services/VocabSearchClient'
import { Vocab } from '@/types/Vocab'
import { ZodError } from 'zod'

describe('VocabSearchClient class test', () => {
  const client = new VocabSearchClient()

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('VocabSearchClient suggest throw error if the fetch return wrong type data', async () => {
    const mockResponse = {
      total: 42,
      items: [
        {
          iri: 435,
          scheme: null,
          vocab: '???',
          identifier: null,
        },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResponse),
    })

    await expect(
      client.suggest('strike', [Vocab.fromString('jel')], 20, 0, 'fr,en'),
    ).rejects.toThrow(ZodError)
  })
})
