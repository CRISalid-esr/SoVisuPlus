import { WordItem, WordstreamData, WordstreamTopic } from '@/types/WordStream'

// Tests the lookup of every uid sharing a wordstream label
describe('WordstreamData.uidsOf', () => {
  const item = (
    text: string,
    uid: string,
    topic = WordstreamTopic.Concepts,
  ): WordItem => ({ text, uid, topic, frequency: 1, sudden: 1, id: uid })

  const data = new WordstreamData([
    {
      date: '2020',
      words: {
        [WordstreamTopic.Concepts]: [
          item('Urbanisme', 'c-1'),
          item('Climat', 'c-2'),
        ],
        [WordstreamTopic.CoAuthors]: [
          item('Urbanisme', 'p-1', WordstreamTopic.CoAuthors),
        ],
      },
    },
    {
      date: '2021',
      words: {
        [WordstreamTopic.Concepts]: [
          item('Urbanisme', 'c-3'),
          item('Urbanisme', 'c-1'),
        ],
      },
    },
  ])

  it('returns the unique uids sharing the label across all slices', () => {
    expect(data.uidsOf('Urbanisme', WordstreamTopic.Concepts)).toEqual([
      'c-1',
      'c-3',
    ])
  })

  it('ignores items of another topic', () => {
    expect(data.uidsOf('Urbanisme', WordstreamTopic.CoAuthors)).toEqual(['p-1'])
  })

  it('returns an empty list for an unknown label', () => {
    expect(data.uidsOf('Inconnu', WordstreamTopic.Concepts)).toEqual([])
  })
})
