import { IdRefService } from '@/lib/services/IdRefService'
import { IdRefClient } from '@/lib/services/IdRefClient'

jest.mock('@/lib/services/IdRefClient')

const MockedIdRefClient = IdRefClient as jest.MockedClass<typeof IdRefClient>

const makeRecord = (datafield: object[]) => ({
  record: { datafield },
})

describe('IdRefService', () => {
  let service: IdRefService
  let mockFetchPerson: jest.Mock

  beforeEach(() => {
    mockFetchPerson = jest.fn()
    MockedIdRefClient.prototype.fetchPerson = mockFetchPerson
    service = new IdRefService()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('extracts name from TAG 200 subfields a and b', async () => {
    mockFetchPerson.mockResolvedValue(
      makeRecord([
        {
          tag: '200',
          subfield: [
            { code: 'a', content: 'Dupont' },
            { code: 'b', content: 'Marie' },
          ],
        },
      ]),
    )

    const result = await service.fetchPerson('127220747')

    expect(result.lastName).toBe('Dupont')
    expect(result.firstName).toBe('Marie')
  })

  it('extracts description from TAG 340 subfield a', async () => {
    mockFetchPerson.mockResolvedValue(
      makeRecord([
        {
          tag: '200',
          subfield: [
            { code: 'a', content: 'Dupont' },
            { code: 'b', content: 'Marie' },
          ],
        },
        {
          tag: '340',
          subfield: { code: 'a', content: 'Maître de conférences' },
        },
      ]),
    )

    const result = await service.fetchPerson('127220747')

    expect(result.description).toBe('Maître de conférences')
  })

  it('handles TAG 340 subfield as a single object (not an array)', async () => {
    mockFetchPerson.mockResolvedValue(
      makeRecord([
        {
          tag: '340',
          subfield: { code: 'a', content: 'Professeur' },
        },
      ]),
    )

    const result = await service.fetchPerson('127220747')

    expect(result.description).toBe('Professeur')
  })

  it('extracts other identifiers from TAG 035 fields', async () => {
    mockFetchPerson.mockResolvedValue(
      makeRecord([
        {
          tag: '035',
          subfield: [
            { code: 'a', content: '0000-0001-2345-6789' },
            { code: '2', content: 'ORCID' },
          ],
        },
        {
          tag: '035',
          subfield: [
            { code: 'a', content: '123456' },
            { code: '2', content: 'VIAF' },
          ],
        },
      ]),
    )

    const result = await service.fetchPerson('127220747')

    expect(result.otherIdentifiers).toHaveLength(2)
    expect(result.otherIdentifiers).toEqual(
      expect.arrayContaining([
        { system: 'ORCID', value: '0000-0001-2345-6789' },
        { system: 'VIAF', value: '123456' },
      ]),
    )
  })

  it('returns only the last 5 publications from TAG 810', async () => {
    const publications = Array.from({ length: 7 }, (_, i) => ({
      tag: '810',
      subfield: { code: 'a', content: `Publication ${i + 1}` },
    }))

    mockFetchPerson.mockResolvedValue(makeRecord(publications))

    const result = await service.fetchPerson('127220747')

    expect(result.recentPublications).toHaveLength(5)
    expect(result.recentPublications[0]).toBe('Publication 3')
    expect(result.recentPublications[4]).toBe('Publication 7')
  })

  it('returns empty arrays and undefined for missing optional fields', async () => {
    mockFetchPerson.mockResolvedValue(makeRecord([]))

    const result = await service.fetchPerson('127220747')

    expect(result.lastName).toBe('')
    expect(result.firstName).toBe('')
    expect(result.description).toBeUndefined()
    expect(result.otherIdentifiers).toEqual([])
    expect(result.recentPublications).toEqual([])
  })

  it('propagates errors thrown by the client', async () => {
    const err = Object.assign(new Error('Not found'), { status: 404 })
    mockFetchPerson.mockRejectedValue(err)

    await expect(service.fetchPerson('000000000')).rejects.toMatchObject({
      status: 404,
    })
  })
})
