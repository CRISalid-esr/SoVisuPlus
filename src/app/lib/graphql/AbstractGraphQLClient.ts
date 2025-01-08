import {
  ApolloClient,
  gql,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  OperationVariables,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'

export class AbstractGraphQLClient {
  private readonly client: ApolloClient<NormalizedCacheObject>
  private readonly enabled: boolean
  private readonly apiKeyEnabled: boolean

  constructor() {
    this.enabled = process.env.GRAPHQL_ENDPOINT_ENABLED === 'true'
    this.apiKeyEnabled = process.env.GRAPHQL_API_KEY_ENABLED === 'true'
    const uri = process.env.GRAPHQL_ENDPOINT_URL
    const apiKey = process.env.GRAPHQL_API_KEY

    if (!this.enabled) {
      console.warn('GraphQL endpoint is disabled.')
    }
    if (!uri) {
      console.error('GRAPHQL_ENDPOINT_URL must be defined.')
    }
    if (this.apiKeyEnabled && !apiKey) {
      console.error('GRAPHQL_API_KEY must be defined.')
    }

    const httpLink = new HttpLink({ uri: uri || '' })

    // Set the x-api-key header only if API key is enabled
    const authLink = setContext((_, { headers }) => {
      if (this.apiKeyEnabled) {
        if (!apiKey) {
          console.error(
            'GRAPHQL_API_KEY must be defined when API key authentication is enabled.',
          )
        }
        return {
          headers: {
            ...headers,
            'x-api-key': apiKey || '', // Use the API key from the environment
          },
        }
      }
      return { headers }
    })

    this.client = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
    })
  }

  /**
   * Performs a GraphQL query.
   * @param query - The GraphQL query as a string.
   * @param variables - Optional variables for the query.
   */
  public async query<T>(
    query: string,
    variables?: OperationVariables,
  ): Promise<T> {
    this.assertEnabled()
    try {
      const result = await this.client.query<T>({
        query: gql`
          ${query}
        `,
        variables,
        fetchPolicy: 'network-only', // Adjust fetch policy as needed
      })
      return result.data as T
    } catch (error) {
      console.error('Query error:', error)
      throw error
    }
  }

  /**
   * Performs a GraphQL mutation.
   * @param mutation - The GraphQL mutation as a document node (AST).
   * @param variables - Optional variables for the mutation.
   */
  public async mutate<T>(
    mutation: string,
    variables?: OperationVariables,
  ): Promise<T> {
    this.assertEnabled()
    try {
      const result = await this.client.mutate<T>({
        mutation: gql`
          ${mutation}
        `,
        variables,
      })
      if (!result.data) {
        throw new Error('Mutation returned no data')
      }
      return result.data as T
    } catch (error) {
      console.error('Mutation error:', error)
      throw error
    }
  }

  /**
   * Check if the GraphQL client is enabled.
   * @returns `true` if enabled, otherwise `false`.
   */
  public isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Asserts that the GraphQL client is enabled and valid.
   */
  private assertEnabled(): void {
    if (!this.enabled) {
      throw new Error('GraphQL client is disabled.')
    }
    if (!this.client) {
      throw new Error('GraphQL client is not initialized.')
    }
  }
}
