import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { Document, DocumentState } from '@/types/Document'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import { GraphPersonResponse, PersonGraphQLClient } from './PersonGraphQLClient'
import { Literal } from '@/types/Literal'
import { Contribution } from '@/types/Contribution'
import { LocRelator, LocRelatorHelper } from '@/types/LocRelator'
import { getBibliographicPlatformByNameIgnoreCase } from '@/types/BibliographicPlatform'
import { DocumentRecord } from '@/types/DocumentRecord'
import { Concept } from '@/types/Concept'
import { Journal } from '@/types/Journal'
import { JournalIdentifier } from '@/types/JournalIdentifier'
import { SourceContribution } from '@/types/SourceContribution'
import { SourceJournal } from '@/types/SourceJournal'
import { SourcePerson } from '@/types/SourcePerson'
import { PublicationIdentifier } from '@/types/PublicationIdentifier'
import { AuthorityOrganization } from '@/types/AuthorityOrganization'
import { AuthorityOrganizationIdentifier } from '@/types/AuthorityOrganizationIdentifier'
import { AuthorityOrganizationIdentifierType } from '@prisma/client'

interface GraphSourcePersonResponse {
  uid: string
  name: string
  source: string
  source_identifier: string | null
}

interface GraphAuthorityOrganization {
  uid: string
  display_names: string[]
  identifiers: {
    type: string
    value: string
  }[]
}

interface GraphContributionResponse {
  roles: string[]
  affiliations: Array<GraphAuthorityOrganization>
  contributor: Array<GraphPersonResponse>
}

interface GraphSourceContributionResponse {
  role: string
  contributor: GraphSourcePersonResponse
}

interface GraphSourceJournalResponse {
  uid: string
  source: string
  source_identifier: string
  titles: string[]
  publisher: string
}

interface GraphSourceIssueResponse {
  issued_by: GraphSourceJournalResponse
  source: string
  source_identifier: string
}

interface GraphSourcePublicationIdentifierResponse {
  type: string
  value: string | null
}

interface GraphDocumentRecordResponse {
  uid: string
  url: string | null
  source_identifier: string
  document_types: string[]
  harvester: string
  has_contributions: Array<GraphSourceContributionResponse>
  issued: string | null
  has_identifiers: Array<GraphSourcePublicationIdentifierResponse>
  published_in: GraphSourceIssueResponse
  titles: { language: string; value: string }[]
  hal_collection_codes?: string[] | null
  hal_submit_type?: 'file' | 'notice' | 'annex' | null
}

interface GraphDocumentResponse {
  uid: string
  document_type: string
  oa_status: string | null
  publication_date: string | null
  publication_date_start: string | null
  publication_date_end: string | null
  upw_oa_status: string | null
  titles: { language: string; value: string }[]
  abstracts: { language: string; value: string }[]
  has_subjects: {
    uid: string
    uri: string | null
    pref_labels: [{ language: string; value: string }]
    alt_labels: { language: string; value: string }[]
  }[]
  has_contributions: Array<GraphContributionResponse>
  recorded_by: Array<GraphDocumentRecordResponse> // Add record information
  publishedInConnection: {
    edges: Array<{
      properties: {
        volume: string
        issue: string
        pages: string
      }
      node: {
        uid: string
        issn_l: string
        publisher: string
        titles: string[]
        identifiers: { type: string; value: string; format?: string | null }[]
      }
    }>
  }
}

export interface GraphDocumentsResponse {
  documents: Array<GraphDocumentResponse>
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

    const [documentData] = response.documents

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
      document_type,
      oa_status,
      upw_oa_status,
      titles,
      abstracts,
      publication_date,
      publication_date_start,
      publication_date_end,
      publishedInConnection,
    } = documentData

    const journalEdge = publishedInConnection?.edges?.[0]
    const journal = journalEdge
      ? new Journal(
          journalEdge.node.titles?.[0] ?? 'Unknown title',
          journalEdge.node.issn_l,
          journalEdge.node.publisher,
          journalEdge.node.identifiers.map(
            (id) => new JournalIdentifier(id.type, id.value, id.format),
          ),
        )
      : undefined

    return new Document(
      uid,
      Document.documentTypeFromString(document_type),
      Document.oaStatusFromString(oa_status),
      publication_date,
      publication_date_start ? new Date(publication_date_start) : null,
      publication_date_end ? new Date(publication_date_end) : null,
      Document.upwOAStatusFromString(upw_oa_status),
      titles.map(Literal.fromObject),
      abstracts.map(Literal.fromObject),
      documentData.has_subjects.map((subject) => {
        return new Concept(
          subject.uid,
          subject.pref_labels.map(Literal.fromObject),
          subject.alt_labels.map(Literal.fromObject),
          subject.uri,
        )
      }),
      documentData.has_contributions.reduce<Contribution[]>(
        (acc, contributionData: GraphContributionResponse) => {
          const [contributor] = contributionData.contributor
          const person = new PersonGraphQLClient().hydrate(contributor)
          const { roles, affiliations } = contributionData
          const locRelators = roles.reduce<LocRelator[]>((roleAcc, role) => {
            const relator = LocRelatorHelper.fromURI(role)
            if (relator) {
              roleAcc.push(relator)
            }
            return roleAcc
          }, [])
          const organizations = affiliations.map((org) => {
            const ids = org.identifiers.reduce<
              AuthorityOrganizationIdentifier[]
            >((idsAcc, id) => {
              const type =
                AuthorityOrganizationIdentifier.authorityOrganizationIdentifierTypeFromString(
                  id.type,
                )
              if (type) {
                idsAcc.push(new AuthorityOrganizationIdentifier(type, id.value))
              }
              return idsAcc
            }, [])
            return new AuthorityOrganization(org.uid, org.display_names, ids)
          })

          acc.push(new Contribution(person, locRelators, organizations))
          return acc
        },
        [],
      ),
      documentData.recorded_by.reduce<DocumentRecord[]>(
        (acc, recordData: GraphDocumentRecordResponse) => {
          const platform = getBibliographicPlatformByNameIgnoreCase(
            recordData.harvester,
          )
          if (!platform) {
            console.error(`Unknown platform: ${recordData.harvester}`)
            return acc
          }
          const publisher = recordData.published_in?.issued_by

          acc.push(
            new DocumentRecord(
              recordData.uid,
              recordData.source_identifier,
              recordData.has_identifiers.reduce<PublicationIdentifier[]>(
                (acc, identifier: PublicationIdentifier) => {
                  const pubId = new PublicationIdentifier(
                    identifier.type,
                    identifier.value,
                  )
                  acc.push(pubId)
                  return acc
                },
                [],
              ),
              recordData.has_contributions.reduce<SourceContribution[]>(
                (
                  acc,
                  sourceContributionData: GraphSourceContributionResponse,
                ) => {
                  const contributor = sourceContributionData.contributor
                  const person = new SourcePerson(
                    contributor.uid,
                    contributor.name,
                    contributor.source,
                    contributor.source_identifier,
                  )
                  const { role } = sourceContributionData
                  const locRelator = LocRelatorHelper.fromLabel(
                    role.toLowerCase(),
                  )
                  if (!locRelator) {
                    console.error(
                      `Unknown role label ${role} for document record ${recordData.uid}`,
                    )
                    return acc
                  }
                  acc.push(new SourceContribution(locRelator, person))
                  return acc
                },
                [],
              ),
              recordData.document_types.map((type) =>
                DocumentRecord.sourceRecordTypeFromString(type),
              ),
              recordData.issued ? new Date(recordData.issued) : null,
              platform,
              recordData.titles.map(Literal.fromObject),
              recordData.url,
              recordData.hal_collection_codes ?? [],
              recordData.hal_submit_type,
              publisher
                ? new SourceJournal(
                    publisher.uid,
                    publisher.source,
                    publisher.source_identifier,
                    publisher.titles,
                    publisher.publisher,
                  )
                : undefined,
            ),
          )
          return acc
        },
        [],
      ),
      DocumentState.default,
      journal,
      journalEdge?.properties.volume,
      journalEdge?.properties.issue,
      journalEdge?.properties.pages,
    )
  }
}
