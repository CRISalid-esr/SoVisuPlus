import { loadQuery } from './loadQuery'
import { readFileSync } from 'fs'
import { join } from 'path'

jest.mock('fs')
jest.mock('path')

describe('loadQuery', () => {
  const mockQuery = '{ users { id name } }'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load a query file correctly', () => {
    ;(join as jest.Mock).mockReturnValue('mocked/path/to/query.graphql')

    ;(readFileSync as jest.Mock).mockReturnValue(mockQuery)

    const result = loadQuery('query.graphql')
    expect(result).toBe(mockQuery)

    expect(join).toHaveBeenCalledWith(
      process.cwd(),
      'src/app/lib/graphql/queries',
      'query.graphql',
    )
    expect(readFileSync).toHaveBeenCalledWith(
      'mocked/path/to/query.graphql',
      'utf-8',
    )
  })

  it('should throw an error if reading the file fails', () => {
    const errorMessage = 'File not found'
    ;(readFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error(errorMessage)
    })

    ;(join as jest.Mock).mockReturnValue('mocked/path/to/query.graphql')

    try {
      loadQuery('query.graphql')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      if (error instanceof Error) {
        expect(error.message).toBe(errorMessage)
      }
    }
  })
})
