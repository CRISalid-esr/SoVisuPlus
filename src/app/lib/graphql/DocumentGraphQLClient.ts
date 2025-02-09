import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { Document } from '@/types/Document'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import { GraphPersonResponse, PersonGraphQLClient } from './PersonGraphQLClient'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'

interface GraphContributionResponse {
  roles: string[]
  contributor: Array<GraphPersonResponse>
}

interface GraphDocumentResponse {
  uid: string
  publication_date: string | null
  publication_date_start: string | null
  publication_date_end: string | null
  titles: { language: string; value: string }[]
  abstracts: { language: string; value: string }[]
  has_contributions: Array<GraphContributionResponse>
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
    const {
      uid,
      titles,
      abstracts,
      publication_date,
      publication_date_start,
      publication_date_end,
    } = documentData
    return new Document(
      uid,
      publication_date,
      publication_date_start ? new Date(publication_date_start) : null,
      publication_date_end ? new Date(publication_date_end) : null,
      titles.map(Literal.fromObject),
      abstracts.map(Literal.fromObject),
      documentData.has_contributions.map(
        (contributionData: GraphContributionResponse) => {
          const [contributor] = contributionData.contributor
          const person = new PersonGraphQLClient().hydrate(contributor)
          const { roles } = contributionData
          const locRelators = roles
            .map(LocRelatorHelper.fromURI)
            .filter(Boolean) as LocRelator[]
          return new Contribution(person, locRelators)
        },
      ),
    )
  }
}
