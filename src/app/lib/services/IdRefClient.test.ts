import { IdRefClient, IdRefRecordSchema } from '@/lib/services/IdRefClient'
import { ZodError } from 'zod'

const VALID_MARC_RESPONSE = {
  record: {
    datafield: [
      {
        tag: '200',
        subfield: [
          { code: 'a', content: 'Doe' },
          { code: 'b', content: 'John' },
        ],
      },
      {
        tag: '340',
        subfield: { code: 'a', content: 'Professeur des universités' },
      },
      {
        tag: '035',
        subfield: [
          { code: 'a', content: '12345678' },
          { code: '2', content: 'VIAF' },
        ],
      },
    ],
  },
}

describe('IdRefClient', () => {
  const client = new IdRefClient()

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('parses a valid MARC JSON response into an IdRefRecord', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(VALID_MARC_RESPONSE),
    })

    const record = await client.fetchPerson('127220747')

    expect(record.record.datafield).toHaveLength(3)
    expect(record.record.datafield[0].tag).toBe('200')
  })

  it('throws with status 404 when the person is not found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(client.fetchPerson('000000000')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('throws with the upstream status for other non-ok responses', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
    })

    await expect(client.fetchPerson('127220747')).rejects.toMatchObject({
      status: 503,
    })
  })

  it('throws a ZodError when the response shape does not match the schema', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ record: { unexpectedField: [] } }),
    })

    await expect(client.fetchPerson('127220747')).rejects.toThrow(ZodError)
  })
})

describe('IdRefRecordSchema', () => {
  it('accepts a single subfield object (not an array)', () => {
    const input = {
      record: {
        datafield: [
          {
            tag: '340',
            subfield: { code: 'a', content: 'Professeur' },
          },
        ],
      },
    }
    expect(() => IdRefRecordSchema.parse(input)).not.toThrow()
  })

  it('accepts a datafield with no subfield', () => {
    const input = {
      record: {
        datafield: [{ tag: '001' }],
      },
    }
    expect(() => IdRefRecordSchema.parse(input)).not.toThrow()
  })
})
