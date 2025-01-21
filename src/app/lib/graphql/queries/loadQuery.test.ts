import { loadQuery } from './loadQuery'
import { readFileSync } from 'fs'
import { join } from 'path'

// Mock the fs and path modules
jest.mock('fs')
jest.mock('path')

describe('loadQuery', () => {
  const mockQuery = '{ users { id name } }' // Example GraphQL query string

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  it('should load a query file correctly', () => {
    // Mock the behavior of path.join to return a fixed path
    ;(join as jest.Mock).mockReturnValue('mocked/path/to/query.graphql')

    // Mock the behavior of readFileSync to return a query string
    ;(readFileSync as jest.Mock).mockReturnValue(mockQuery)

    // Call the function and assert the returned value
    const result = loadQuery('query.graphql')
    expect(result).toBe(mockQuery)

    // Verify that readFileSync and join were called with the correct arguments
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
    // Simulate a failure in reading the file by throwing an error from readFileSync
    const errorMessage = 'File not found'
    ;(readFileSync as jest.Mock).mockImplementationOnce(() => {
      throw new Error(errorMessage)
    })

    // Mock path.join to return a fixed path
    ;(join as jest.Mock).mockReturnValue('mocked/path/to/query.graphql')

    // Assert that the function throws the expected error
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
