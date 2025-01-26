import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { Document } from '@/types/Document'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import { GraphPersonResponse, PersonGraphQLClient } from './PersonGraphQLClient'

interface GraphcontributorResponse {
  contributor: Array<GraphPersonResponse>
}

interface GraphDocumentResponse {
  uid: string
  titles: Record<string, string>
  has_contributions: Array<GraphcontributorResponse>
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
    // Protect application against potential empty contributions
    const mutableDocumentData = {
      ...documentData,
      has_contributions: documentData.has_contributions.filter(
        (contributionData) => contributionData.contributor.length > 0,
      ),
    }

    return this.hydrate(mutableDocumentData)
  }

  private hydrate(documentData: GraphDocumentResponse): Document {
    const titles = Array.isArray(documentData.titles) ? documentData.titles : []
    const transformedTitles = Object.fromEntries(
      titles.map((title) => [title.language, title.value]),
    )
    return new Document(
      documentData.uid,
      transformedTitles,
      documentData.has_contributions.map(
        (contributionData: GraphcontributorResponse) => {
          const [contributor] = contributionData.contributor
          return new PersonGraphQLClient().hydrate(contributor)
        },
      ),
    )
  }
}
