import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { Document } from '@/types/Document'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import {
  GraphPersonResponse,
  GraphPersonIdentifier,
  PersonGraphQLClient,
} from './PersonGraphQLClient'
import { Person } from '@/types/Person'

interface GraphDocumentResponse {
  uid: string
  titles: Record<string, string>
  has_contributions: Array<GraphPersonResponse>
}

export interface GraphDocumentsResponse {
  textualDocuments: Array<GraphDocumentResponse>
}

export class DocumentGraphQLClient extends AbstractGraphQLClient {
  /**
   * Get a document by their UID
   * @param uid
   * @returns The document if found, null otherwise
   */
  public async getDocumentByUid(uid: string): Promise<Document | null> {
    const variables = {
      where: {
        uid_EQ: uid,
      },
    }

    const documentQuery = loadQuery('document.graphql')

    const response: GraphDocumentsResponse =
      await this.query<GraphDocumentsResponse>(documentQuery, variables)

    const [documentData] = response.textualDocuments

    if (!documentData) {
      return null
    }
    return this.hydrate(documentData)
  }

  private hydrate(personData: GraphDocumentResponse): Document {
    return new Document(
      personData.uid,
      personData.titles,
      personData.has_contributions.map((personData: GraphPersonResponse) => {
        return new PersonGraphQLClient().hydrate(personData)
      }),
    )
  }
}
