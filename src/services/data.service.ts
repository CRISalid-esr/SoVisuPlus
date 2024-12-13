import {
  ApolloClient,
  InMemoryCache,
  gql,
  NormalizedCacheObject,
} from '@apollo/client'

export class DataService {
  private client: ApolloClient<NormalizedCacheObject>

  constructor(uri: string) {
    this.client = new ApolloClient({
      uri,
      cache: new InMemoryCache(),
      // headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
  }

  /**
   * Performs a GraphQL query.
   * @param query - The GraphQL query as a string.
   * @param variables - Optional variables for the query.
   */
  public async query<T>(
    query: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variables?: Record<string, any>,
  ): Promise<T> {
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
   * @param mutation - The GraphQL mutation as a string.
   * @param variables - Optional variables for the mutation.
   */
  public async mutate<T>(
    mutation: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variables?: Record<string, any>,
  ): Promise<T> {
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
   * Subscribes to a GraphQL subscription.
   * @param subscription - The GraphQL subscription as a string.
   * @param variables - Optional variables for the subscription.
   * @param callback - Callback to handle data updates.
   */
  public subscribe<T>(
    subscription: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variables: Record<string, any>,
    callback: (data: T) => void,
  ) {
    const observable = this.client.subscribe({
      query: gql`
        ${subscription}
      `,
      variables,
    })

    return observable.subscribe({
      next: ({ data }) => {
        callback(data as T)
      },
      error: (error) => console.error('Subscription error:', error),
    })
  }
}
