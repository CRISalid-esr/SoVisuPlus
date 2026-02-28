import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Loads a GraphQL query or mutation from a .graphql file as a string.
 * @param filePath - The relative path to the .graphql file.
 * @returns The content of the file as a string.
 */
export const loadQuery = (filePath: string): string => {
  try {
    const fullPath = join(
      process.cwd(),
      'src/app/lib/graphql/queries',
      filePath,
    )
    return readFileSync(fullPath, 'utf-8')
  } catch (error) {
    console.error(`Failed to load query from ${filePath}:`, error)
    throw error
  }
}
