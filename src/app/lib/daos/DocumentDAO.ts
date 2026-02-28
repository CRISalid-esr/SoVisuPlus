import { DocumentWithRelations as DbDocument } from '@/prisma-schema/extended-client'
import {
  Concept as DbConcept,
  DocumentState,
  OAStatus,
  Person as DbPerson,
  Prisma,
} from '@prisma/client'
import { Document, DocumentType } from '@/types/Document'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { PersonDAO } from './PersonDAO'
import {
  BibliographicPlatform,
  getBibliographicPlatformDbValue,
} from '@/types/BibliographicPlatform'
import { ConceptDAO } from '@/lib/daos/ConceptDAO'
import { ConceptJson } from '@/types/Concept'
import { LocRelatorHelper } from '@/types/LocRelator'
import { parseStrArrayEnvVar } from '@/utils/parseStrArrayEnvVar'
import QueryMode = Prisma.QueryMode
import { PublicationIdentifier } from '@/types/PublicationIdentifier'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { Literal, LiteralJson } from '@/types/Literal'

type DbColumnFilters =
  | { id: 'date'; value: [string | null, string | null] }
  | { id: 'type'; value: DocumentType[] }
  | { id: 'oaStatus'; value: (OAStatus | 'UNKNOWN')[] }
  | { id: string; value: string | string[] }

interface FetchDocumentsFromDBParams {
  searchTerm: string
  searchLang: string
  page: number
  pageSize: number
  columnFilters: DbColumnFilters[]
  sorting: { id: string; desc: boolean }[]
  contributorUids: string[]
  halCollectionCodes: string[]
  areHalCollectionCodesOmitted: boolean
}

interface CountDocumentsFromDBParams {
  searchTerm: string
  searchLang: string
  columnFilters: DbColumnFilters[]
  contributorUids: string[]
  halCollectionCodes: string[]
}

export class DocumentDAO extends AbstractDAO {
  /**
   * Create or update a Document record in the database
   * @param document - The Document object to create or update
   * @returns The created or updated Document record
   */
  public async createOrUpdateDocument(document: Document): Promise<DbDocument> {
    const {
      uid,
      titles,
      abstracts,
      subjects,
      contributions,
      records,
      journal,
      volume,
      issue,
      pages,
    } = document

    try {
      let dbDocument: DbDocument | null =
        await this.prismaClient.document.findUnique({
          where: { uid: uid },
          include: {
            titles: true,
            abstracts: true,
            subjects: { include: { labels: true } },
            contributions: {
              include: {
                affiliations: {
                  include: {
                    identifiers: true,
                  },
                },
                person: {
                  include: {
                    identifiers: true,
                    memberships: {
                      include: {
                        researchStructure: {
                          include: {
                            names: true,
                            identifiers: true,
                            descriptions: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            records: {
              include: {
                identifiers: true,
                contributions: { include: { person: true } },
                journal: true,
              },
            },
            journal: {
              include: {
                identifiers: true,
              },
            },
          },
        })

      let journalId: number | null = null

      if (journal) {
        if (!journal.issnL) {
          throw new Error('Journal is missing issnL')
        }
        const dbJournal = await this.prismaClient.journal.upsert({
          where: { issnL: journal.issnL },
          update: {
            publisher: journal.publisher,
            title: journal.title,
          },
          create: {
            issnL: journal.issnL,
            publisher: journal.publisher,
            title: journal.title,
          },
        })

        journalId = dbJournal.id

        await this.prismaClient.journalIdentifier.deleteMany({
          where: { journalId: journalId },
        })

        for (const identifier of journal.identifiers) {
          await this.prismaClient.journalIdentifier.create({
            data: {
              type: identifier.type,
              value: identifier.value,
              format: identifier.format,
              journalId: journalId,
            },
          })
        }
      }

      if (!dbDocument) {
        dbDocument = await this.prismaClient.document.create({
          data: {
            uid: uid,
            documentType: document.documentType,
            oaStatus: document.oaStatus,
            title_locale_0: document.getTitleInLocale(0),
            title_locale_1: document.getTitleInLocale(1),
            title_locale_2: document.getTitleInLocale(2),
            publicationDate: document.publicationDate,
            publicationDateStart: document.publicationDateStart
              ? document.publicationDateStart.toISOString()
              : null,
            publicationDateEnd: document.publicationDateEnd
              ? document.publicationDateEnd.toISOString()
              : null,
            upwOAStatus: document.upwOAStatus,
            journal: journalId ? { connect: { id: journalId } } : undefined,
            volume,
            issue,
            pages,
          },
          include: {
            titles: true,
            abstracts: true,
            subjects: { include: { labels: true } },
            contributions: {
              include: {
                affiliations: {
                  include: {
                    identifiers: true,
                  },
                },
                person: {
                  include: {
                    identifiers: true,
                    memberships: {
                      include: {
                        researchStructure: {
                          include: {
                            names: true,
                            identifiers: true,
                            descriptions: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            records: {
              include: {
                identifiers: true,
                contributions: { include: { person: true } },
                journal: true,
              },
            },
            journal: {
              include: {
                identifiers: true,
              },
            },
          },
        })
      } else {
        // Remove obsolete contributions
        const existingContributors = new Set(
          dbDocument.contributions.map((c) => c.person.uid),
        )
        const newContributors = new Set(contributions.map((c) => c.person.uid))
        const contributorsToRemove = [...existingContributors].filter(
          (uid) => !newContributors.has(uid),
        )

        if (contributorsToRemove.length > 0) {
          await this.prismaClient.contribution.deleteMany({
            where: {
              documentId: dbDocument.id,
              person: {
                uid: { in: contributorsToRemove },
              },
            },
          })
        }

        // Remove obsolete subjects
        const existingSubjects = new Set(dbDocument.subjects.map((s) => s.uid))
        const newSubjects = new Set(subjects.map((s) => s.uid))
        const subjectsToRemove = [...existingSubjects].filter(
          (uid) => !newSubjects.has(uid),
        )

        if (subjectsToRemove.length > 0) {
          await this.prismaClient.document.update({
            where: { id: dbDocument.id },
            data: {
              subjects: {
                disconnect: subjectsToRemove.map((uid) => ({ uid })),
              },
            },
          })
        }

        dbDocument = (await this.prismaClient.document.update({
          where: { uid },
          data: {
            documentType: document.documentType,
            oaStatus: document.oaStatus,
            title_locale_0: document.getTitleInLocale(0),
            title_locale_1: document.getTitleInLocale(1),
            title_locale_2: document.getTitleInLocale(2),
            publicationDate: document.publicationDate,
            publicationDateStart: document.publicationDateStart
              ? document.publicationDateStart.toISOString()
              : null,
            publicationDateEnd: document.publicationDateEnd
              ? document.publicationDateEnd.toISOString()
              : null,
            upwOAStatus: document.upwOAStatus,
            journal: journalId ? { connect: { id: journalId } } : undefined,
            state: DocumentState.default, // reset state to default on update
            volume,
            issue,
            pages,
          },
          include: {
            titles: true,
            abstracts: true,
            subjects: { include: { labels: true } },
            contributions: { include: { person: true } },
            records: {
              include: {
                identifiers: true,
                contributions: { include: { person: true } },
                journal: true,
              },
            },
            journal: { include: { identifiers: true } },
          },
        })) as DbDocument
      }

      if (!dbDocument) {
        throw new Error('dbDocument is null')
      }

      for (const title of titles) {
        await this.prismaClient.documentTitle.upsert({
          where: {
            documentId_language: {
              documentId: dbDocument.id,
              language: title.language ?? null,
            },
          },
          update: {
            value: title.value,
          },
          create: {
            documentId: dbDocument.id,
            language: title.language ?? null,
            value: title.value,
          },
        })
      }
      for (const abstract of abstracts) {
        await this.prismaClient.documentAbstract.upsert({
          where: {
            documentId_language: {
              documentId: dbDocument.id,
              language: abstract.language ?? null,
            },
          },
          update: {
            value: abstract.value,
          },
          create: {
            documentId: dbDocument.id,
            language: abstract.language ?? null,
            value: abstract.value,
          },
        })
      }

      for (const subject of subjects) {
        let concept: DbConcept
        try {
          concept = await new ConceptDAO().createOrUpdateConcept(subject)
        } catch (error) {
          console.error(
            `Failed to create or update concept for subject: ${subject}`,
            error,
          )
          continue
        }
        const { id: conceptId } = concept
        const { id: documentId } = dbDocument
        try {
          await this.prismaClient.document.update({
            where: { id: documentId },
            data: { subjects: { connect: { id: conceptId } } },
          })
        } catch (error) {
          console.error(
            `Failed to upsert document subject for concept ID: ${conceptId} and document ID: ${documentId}`,
            error,
          )
        }
      }

      for (const contribution of contributions) {
        let person: DbPerson
        try {
          person = await new PersonDAO().createOrUpdatePerson(
            contribution.person,
          )
        } catch (error) {
          console.error(
            `Failed to create or update person for contribution: ${contribution}`,
            error,
          )
          continue
        }

        const { id: personId } = person
        const { id: documentId } = dbDocument

        try {
          await this.prismaClient.contribution.upsert({
            where: {
              personId_documentId: {
                personId,
                documentId,
              },
            },
            update: {
              roles: { set: contribution.getRoleLabels() },
            },
            create: {
              personId,
              documentId,
              roles: { set: contribution.getRoleLabels() },
            },
          })
        } catch (error) {
          console.error(
            `Failed to upsert contribution for person ID: ${personId} and document ID: ${documentId}`,
            error,
          )
        }
      }

      const incomingUids = new Set(records.map((r) => r.uid))

      // Remove records no longer present
      await this.prismaClient.documentRecord.deleteMany({
        where: {
          documentId: dbDocument.id,
          uid: { notIn: Array.from(incomingUids) },
        },
      })

      for (const record of records) {
        try {
          const documentRecord = await this.prismaClient.documentRecord.upsert({
            where: {
              uid: record.uid,
            },
            update: {
              url: record.url,
              sourceIdentifier: record.sourceIdentifier,
              documentTypes: record.documentTypes,
              publicationDate: record.publicationDate,
              titles: record.titles.map((title) => title.toJson()),
              halCollectionCodes: record.halCollectionCodes || [],
              halSubmitType: record.halSubmitType,
              journal: record.journal && {
                connectOrCreate: {
                  where: { uid: record.journal.uid },
                  create: {
                    uid: record.journal.uid,
                    source: record.journal.source,
                    sourceId: record.journal.sourceId,
                    publisher: record.journal.publisher,
                    titles: record.journal.titles,
                  },
                },
              },
              contributions: {
                deleteMany: {},
                create: record.contributions.map((contribution) => ({
                  role: LocRelatorHelper.toLabel(contribution.role),
                  person: {
                    connectOrCreate: {
                      where: { uid: contribution.person.uid },
                      create: {
                        uid: contribution.person.uid,
                        name: contribution.person.name,
                        source: contribution.person.source,
                        sourceId: contribution.person.sourceId,
                      },
                    },
                  },
                })),
              },
              identifiers: {
                set: [],
              },
              document: { connect: { id: dbDocument.id } },
              platform: {
                set: getBibliographicPlatformDbValue(record.platform),
              },
            },
            create: {
              uid: record.uid,
              url: record.url,
              sourceIdentifier: record.sourceIdentifier,
              documentTypes: record.documentTypes,
              publicationDate: record.publicationDate,
              titles: record.titles.map((title) => title.toJson()),
              platform: getBibliographicPlatformDbValue(record.platform),
              halCollectionCodes: record.halCollectionCodes || [],
              halSubmitType: record.halSubmitType,
              journal: record.journal && {
                connectOrCreate: {
                  where: { uid: record.journal.uid },
                  create: {
                    uid: record.journal.uid,
                    source: record.journal.source,
                    sourceId: record.journal.sourceId,
                    publisher: record.journal.publisher,
                    titles: record.journal.titles,
                  },
                },
              },
              contributions: {
                create: record.contributions.map((contribution) => ({
                  role: LocRelatorHelper.toLabel(contribution.role),
                  person: {
                    connectOrCreate: {
                      where: { uid: contribution.person.uid },
                      create: {
                        uid: contribution.person.uid,
                        name: contribution.person.name,
                        source: contribution.person.source,
                        sourceId: contribution.person.sourceId,
                      },
                    },
                  },
                })),
              },
              document: { connect: { id: dbDocument.id } },
            },
          })

          await this.upsertIdentifiers(record.identifiers, documentRecord.id)
        } catch (error) {
          console.error(
            `Failed to upsert document record: ${record.uid}`,
            error,
          )
        }
      }

      return dbDocument
    } catch (error) {
      console.error('Error during document creation or update:', error as Error)
      throw new Error(
        `Failed to create or update document: ${(error as Error).message}`,
      )
    }
  }

  computeExistingAnd(where: Prisma.DocumentWhereInput) {
    return where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []
  }

  createFetchDocumentsWhere({
    searchTerm,
    columnFilters,
    halCollectionCodes,
    areHalCollectionCodesOmitted,
    contributorUids,
  }: {
    searchTerm: string
    searchLang: string
    columnFilters: DbColumnFilters[]
    contributorUids: string[]
    halCollectionCodes: string[]
    areHalCollectionCodesOmitted: boolean
  }): Prisma.DocumentWhereInput {
    const publicationListRolesFilter = parseStrArrayEnvVar(
      process.env.PUBLICATION_LIST_ROLES_FILTER,
    )

    const perspectiveRolesFilter: string[] = parseStrArrayEnvVar(
      process.env.PERSPECTIVE_ROLES_FILTER,
    )

    let where: Prisma.DocumentWhereInput = {}
    const contributionFilters: Prisma.DocumentWhereInput[] = []

    if (publicationListRolesFilter.length > 0) {
      where = {
        ...where,
        contributions: {
          every: {
            roles: {
              hasSome: publicationListRolesFilter,
            },
          },
        },
      }
    }

    if (searchTerm) {
      where = {
        ...where,
        AND: [
          ...this.computeExistingAnd(where),
          {
            OR: [
              {
                titles: {
                  some: {
                    value: {
                      contains: searchTerm,
                      mode: QueryMode.insensitive,
                    },
                  },
                },
              },
              {
                abstracts: {
                  some: {
                    value: {
                      contains: searchTerm,
                      mode: QueryMode.insensitive,
                    },
                  },
                },
              },
              {
                contributions: {
                  some: {
                    person: {
                      displayName: {
                        contains: searchTerm,
                        mode: QueryMode.insensitive,
                      },
                    },
                  },
                },
              },
              {
                publicationDate: {
                  contains: searchTerm,
                  mode: QueryMode.insensitive,
                },
              },
              {
                journal: {
                  title: {
                    contains: searchTerm,
                    mode: QueryMode.insensitive,
                  },
                },
              },
            ],
          },
        ],
      }
    }

    columnFilters.forEach((filter) => {
      if (filter.id === 'titles' && typeof filter.value === 'string') {
        where = {
          ...where,
          titles: {
            some: {
              value: {
                contains: filter.value,
                mode: QueryMode.insensitive,
              },
            },
          },
        }
      }

      if (filter.id === 'abstracts' && typeof filter.value === 'string') {
        where = {
          ...where,
          abstracts: {
            some: {
              value: {
                contains: filter.value,
                mode: QueryMode.insensitive,
              },
            },
          },
        }
      }

      if (filter.id === 'contributions' && typeof filter.value === 'string') {
        const nameFilter: Prisma.DocumentWhereInput = {
          contributions: {
            some: {
              person: {
                displayName: {
                  contains: filter.value,
                  mode: QueryMode.insensitive,
                },
              },
            },
          },
        }
        contributionFilters.push(nameFilter)
      }

      if (filter.id === 'date' && Array.isArray(filter.value)) {
        const startDate = filter.value[0] || null // Full ISO string date
        const endDate = filter.value[1] || null // Full ISO string date

        const dateConditions: Prisma.DocumentWhereInput[] = []

        if (startDate && endDate) {
          dateConditions.push({
            AND: [
              { publicationDateEnd: { gte: startDate } }, // Document ends after or on startDate
              { publicationDateStart: { lte: endDate } }, // Document starts before or on endDate
            ],
          })
        } else if (startDate) {
          dateConditions.push({
            publicationDateEnd: { gte: startDate }, // Only filter by start date
          })
        } else if (endDate) {
          dateConditions.push({
            publicationDateStart: { lte: endDate }, // Only filter by end date
          })
        }

        if (dateConditions.length > 0) {
          where = {
            ...where,
            AND: [...this.computeExistingAnd(where), ...dateConditions],
          }
        }
      }
      if (filter.id === 'type' && Array.isArray(filter.value)) {
        where = {
          ...where,
          documentType: {
            in: filter.value as DocumentType[],
          },
        }
      }
      if (filter.id === 'oaStatus' && Array.isArray(filter.value)) {
        const hasUnknown = filter.value.includes('UNKNOWN')
        const knownValues = filter.value.filter((v) => v !== 'UNKNOWN')
        where = {
          ...where,
          OR: [
            {
              oaStatus: {
                not: null,
                in: knownValues as OAStatus[],
              },
            },
            {
              upwOAStatus: {
                not: null,
                in: knownValues as OAStatus[],
              },
            },
            ...(hasUnknown
              ? [
                  {
                    oaStatus: null,
                    upwOAStatus: null,
                  },
                ]
              : []),
          ],
        }
      }

      if (filter.id === 'source' && Array.isArray(filter.value)) {
        where = {
          ...where,
          records: {
            some: {
              platform: {
                in: filter.value as BibliographicPlatform[],
              },
            },
          },
        }
      }

      if (filter.id === 'publishedIn' && typeof filter.value === 'string') {
        where = {
          ...where,
          journal: {
            title: {
              contains: filter.value,
              mode: QueryMode.insensitive,
            },
          },
        }
      }

      if (filter.id === 'halStatus' && Array.isArray(filter.value)) {
        const halStatusOr: Prisma.DocumentWhereInput[] = []

        filter.value.forEach((type) => {
          if (type === 'in_collection') {
            halStatusOr.push({
              records: {
                some: {
                  platform: 'hal',
                  halCollectionCodes: {
                    hasSome: halCollectionCodes,
                  },
                },
              },
            })
          }

          if (type === 'out_of_collection') {
            halStatusOr.push({
              records: {
                some: {
                  platform: 'hal',
                },
                none: {
                  halCollectionCodes: {
                    hasSome: halCollectionCodes,
                  },
                },
              },
            })
          }

          if (type === 'outside_hal') {
            halStatusOr.push({
              records: {
                none: {
                  platform: 'hal',
                },
              },
            })
          }
        })

        where = {
          ...where,
          AND: [
            ...this.computeExistingAnd(where),
            {
              OR: halStatusOr,
            },
          ],
        }
      }
    })

    if (areHalCollectionCodesOmitted) {
      where = {
        ...where,
        records: {
          ...where.records,
          none: {
            OR: [
              {
                halSubmitType: 'file',
              },
              {
                halSubmitType: 'annex',
              },
            ],
            halCollectionCodes: {
              hasSome: halCollectionCodes,
            },
          },
        },
      }
    }

    if (contributorUids && contributorUids.length > 0) {
      const rolesAndUidFilter: Prisma.DocumentWhereInput = {
        contributions: {
          some: {
            person: {
              uid: { in: contributorUids },
            },
            ...(perspectiveRolesFilter.length > 0 && {
              roles: { hasSome: perspectiveRolesFilter },
            }),
          },
        },
      }
      contributionFilters.push(rolesAndUidFilter)
    }

    if (contributionFilters.length > 0) {
      where = {
        ...where,
        AND: [...this.computeExistingAnd(where), ...contributionFilters],
      }
    }

    return where
  }

  createFetchDocumentsOrderBy({
    searchLang,
    sorting,
  }: FetchDocumentsFromDBParams): Prisma.DocumentOrderByWithRelationInput[] {
    const searchLangIndex =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',').indexOf(
        searchLang,
      ) || 0
    const sortingTitleFieldName = `title_locale_${searchLangIndex}`

    return sorting.map((sort) => {
      if (sort.id === 'titles') {
        return {
          [sortingTitleFieldName]: sort.desc ? 'desc' : 'asc',
        }
      }

      if (sort.id === 'date') {
        return {
          publicationDateStart: {
            sort: sort.desc ? 'desc' : 'asc',
            nulls: 'last',
          },
        }
      }

      if (sort.id === 'publishedIn') {
        return {
          journal: {
            title: sort.desc ? 'desc' : 'asc',
          },
        }
      }

      return { [sort.id]: sort.desc ? 'desc' : 'asc' }
    })
  }

  public async fetchDocuments(params: FetchDocumentsFromDBParams): Promise<{
    documents: Document[]
    totalItems: number
  }> {
    const { page, pageSize } = params

    const skip = (page - 1) * pageSize

    const where = this.createFetchDocumentsWhere(params)
    const orderBy = this.createFetchDocumentsOrderBy(params)

    const dbDocuments = await this.prismaClient.document.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        titles: true,
        abstracts: true,
        subjects: {
          include: {
            labels: true,
          },
        },
        contributions: {
          include: {
            affiliations: {
              include: {
                identifiers: true,
              },
            },
            person: {
              include: {
                identifiers: true,
                memberships: {
                  include: {
                    researchStructure: {
                      include: {
                        names: true,
                        identifiers: true,
                        descriptions: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        records: {
          include: {
            identifiers: true,
            contributions: {
              include: {
                person: true,
              },
            },
            journal: true,
          },
        },
        journal: {
          include: {
            identifiers: true,
          },
        },
      },
    })

    const totalItems = await this.prismaClient.document.count({ where })

    return {
      documents: dbDocuments?.map((dbDocument) => {
        return Document.fromDbDocument(dbDocument)
      }),
      totalItems,
    }
  }

  public async fetchOAYearDocuments(contributorUids: string[]): Promise<{
    documents: {
      uid: string
      oaStatus: OAStatus | null
      publicationDate: string | null
      upwOAStatus: OAStatus | null
    }[]
  }> {
    const perspectiveRolesFilter: string[] = parseStrArrayEnvVar(
      process.env.PERSPECTIVE_ROLES_FILTER,
    )

    const dbDocuments = await this.prismaClient.document.findMany({
      select: {
        uid: true,
        oaStatus: true,
        publicationDate: true,
        upwOAStatus: true,
      },
      where: {
        publicationDate: { not: null },
        contributions: {
          some: {
            person: {
              uid: { in: contributorUids },
            },
            ...(perspectiveRolesFilter.length > 0 && {
              roles: { hasSome: perspectiveRolesFilter },
            }),
          },
        },
      },
      orderBy: [
        {
          publicationDate: 'desc',
        },
      ],
    })

    return {
      documents: dbDocuments,
    }
  }

  public async countDocuments(params: CountDocumentsFromDBParams): Promise<{
    allItems: number
    incompleteHalRepositoryItems: number
  }> {
    const allWhere = this.createFetchDocumentsWhere({
      ...params,
      areHalCollectionCodesOmitted: false,
    })
    const incompleteHalRepositoryWhere = this.createFetchDocumentsWhere({
      ...params,
      areHalCollectionCodesOmitted: true,
    })

    const allItems = await this.prismaClient.document.count({
      where: allWhere,
    })
    const incompleteHalRepositoryItems = await this.prismaClient.document.count(
      {
        where: incompleteHalRepositoryWhere,
      },
    )

    return {
      allItems,
      incompleteHalRepositoryItems,
    }
  }

  async fetchDocumentById(uid: string): Promise<Document | null> {
    const dbDocument = await this.prismaClient.document.findUnique({
      where: { uid },
      include: {
        titles: true,
        abstracts: true,
        contributions: {
          include: {
            affiliations: {
              include: {
                identifiers: true,
              },
            },
            person: {
              include: {
                identifiers: true,
                memberships: {
                  include: {
                    researchStructure: {
                      include: {
                        names: true,
                        descriptions: true,
                        identifiers: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        records: {
          include: {
            identifiers: true,
            contributions: { include: { person: true } },
            journal: true,
          },
        },
        subjects: {
          include: {
            labels: true,
          },
        },
        journal: {
          include: {
            identifiers: true,
          },
        },
      },
    })

    return dbDocument ? Document.fromDbDocument(dbDocument) : null
  }

  async deleteConceptsFromDocument(
    documentUid: string,
    conceptUids: string[],
  ): Promise<void> {
    const document = await this.prismaClient.document.findUnique({
      where: { uid: documentUid },
      select: { id: true },
    })

    if (!document) {
      throw new Error(`Document with UID ${documentUid} not found`)
    }

    await this.prismaClient.document.update({
      where: { id: document.id },
      data: {
        subjects: {
          disconnect: conceptUids.map((uid) => ({ uid })),
        },
      },
    })
  }

  async addConceptsToDocument(
    documentUid: string,
    concepts: ConceptJson[],
  ): Promise<void> {
    const document = await this.prismaClient.document.findUnique({
      where: { uid: documentUid },
      select: { id: true },
    })

    if (!document) {
      throw new Error(`Document with UID ${documentUid} not found`)
    }

    await this.prismaClient.document.update({
      where: { id: document.id },
      data: {
        subjects: {
          connect: concepts.map((concept) => ({ uid: concept.uid })),
        },
      },
    })
  }

  async modifyTitles(documentUid: string, titles: Literal[]): Promise<void> {
    const document = await this.prismaClient.document.findUnique({
      where: { uid: documentUid },
      select: { id: true },
    })

    if (!document) {
      throw new Error(`Document with UID ${documentUid} not found`)
    }

    await this.prismaClient.documentTitle.deleteMany({
      where: { documentId: document.id },
    })

    await this.prismaClient.document.update({
      where: { id: document.id },
      data: {
        titles: {
          createMany: {
            data: titles.map((title) => ({
              language: title.language,
              value: title.value,
            })),
          },
        },
      },
    })
  }

  async modifyAbstracts(
    documentUid: string,
    abstracts: Literal[],
  ): Promise<void> {
    const document = await this.prismaClient.document.findUnique({
      where: { uid: documentUid },
      select: { id: true },
    })

    if (!document) {
      throw new Error(`Document with UID ${documentUid} not found`)
    }

    await this.prismaClient.documentAbstract.deleteMany({
      where: { documentId: document.id },
    })

    await this.prismaClient.document.update({
      where: { id: document.id },
      data: {
        abstracts: {
          createMany: {
            data: abstracts.map((abstract) => ({
              language: abstract.language,
              value: abstract.value,
            })),
          },
        },
      },
    })
  }

  public async deleteDocumentByUid(uid: string): Promise<void> {
    await this.prismaClient.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { uid },
        select: { id: true },
      })
      if (!doc) return

      await tx.document.update({
        where: { id: doc.id },
        data: { subjects: { set: [] } },
      })

      await Promise.all([
        tx.documentRecord.deleteMany({ where: { documentId: doc.id } }),
        tx.contribution.deleteMany({ where: { documentId: doc.id } }),
        tx.documentTitle.deleteMany({ where: { documentId: doc.id } }),
        tx.documentAbstract.deleteMany({ where: { documentId: doc.id } }),
      ])

      await tx.document.delete({ where: { id: doc.id } })
    })
  }

  public async getContributorUidsByDocumentUid(uid: string): Promise<string[]> {
    const document = await this.prismaClient.document.findUnique({
      where: { uid },
      include: {
        contributions: {
          include: {
            person: {
              select: { uid: true },
            },
          },
        },
      },
    })

    if (!document) {
      return []
    }

    return document.contributions.map((contribution) => contribution.person.uid)
  }

  public async markDocumentsWaitingForUpdate(uids: string[]) {
    await this.prismaClient.document.updateMany({
      where: { uid: { in: uids } },
      data: { state: DocumentState.waiting_for_update },
    })

    return this.prismaClient.document.findMany({
      where: { uid: { in: uids } },
      select: { uid: true, state: true },
    })
  }

  public async updateDocumentTypeByUid(
    uid: string,
    documentType: DocumentType,
  ): Promise<void> {
    const doc = await this.prismaClient.document.findUnique({
      where: { uid },
      select: { id: true },
    })

    if (!doc) {
      throw new Error(`Document with UID ${uid} not found`)
    }

    await this.prismaClient.document.update({
      where: { id: doc.id },
      data: {
        documentType,
      },
    })
  }

  /**
   * Handle potential conflicts with existing PublicationIdentifiers
   * @param identifiers - The list of identifiers to check
   * @param currentDocumentRecordId - The ID of the current document record
   */
  private async handleIdentifierConflicts(
    identifiers: PublicationIdentifier[],
    currentDocumentRecordId: number,
  ): Promise<void> {
    const conflictingIdentifiers =
      (await this.prismaClient.publicationIdentifier.findMany({
        where: {
          OR: identifiers.map((identifier) => ({
            type: PublicationIdentifier.publicationIdentifierTypeFromString(
              identifier.type,
            ),
            value: identifier.value,
            documentRecordId: { not: currentDocumentRecordId },
          })),
        },
      })) ?? []

    if (conflictingIdentifiers.length > 0) {
      throw new Error(
        `Conflicting identifiers found: ${conflictingIdentifiers
          .map((id) => `${id.type}:${id.value}`)
          .join(', ')}`,
      )
    }
  }

  /**
   * Upsert PublicationIdentifier for a given document record
   * @param identifiers - The list of identifiers to upsert
   * @param documentRecordId - The ID of the document record
   * @param retries - The number of retries (to handle conflicts on upsert)
   */
  private async upsertIdentifiers(
    identifiers: PublicationIdentifier[],
    documentRecordId: number,
    retries = 0,
  ): Promise<void> {
    try {
      // Get existing identifiers
      const identifiersWithIds =
        (await this.prismaClient.publicationIdentifier.findMany({
          where: {
            OR: identifiers.map((identifier) => ({
              type: PublicationIdentifier.publicationIdentifierTypeFromString(
                identifier.type,
              ),
              value: identifier.value,
            })),
          },
        })) || []

      //Get unexisting identifiers
      const identifiersToCreate =
        identifiers.filter(
          (identifier) =>
            !identifiersWithIds.find(
              (id) =>
                id.type == identifier.type && id.value == identifier.value,
            ),
        ) || []

      // Insert new identifiers
      const newIdentifiers =
        await this.prismaClient.publicationIdentifier.createManyAndReturn({
          data: identifiersToCreate.map((identifier) => ({
            type: PublicationIdentifier.publicationIdentifierTypeFromString(
              identifier.type,
            ),
            value: identifier.value,
          })),
        })

      const identifiersIds = identifiersWithIds
        .concat(newIdentifiers)
        .map((identifier) => {
          return { id: identifier?.id }
        })

      // Insert new identifiers
      await this.prismaClient.documentRecord.update({
        where: { id: documentRecordId },
        data: {
          identifiers: {
            connect: identifiersIds,
          },
        },
      })
    } catch (error: unknown) {
      console.error('Error during identifier upsert:', error as Error)
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        if (retries < 3) {
          console.warn('Retrying identifier upsert...')
          await this.upsertIdentifiers(
            identifiers,
            documentRecordId,
            retries + 1,
          )
        } else {
          console.error('Failed to upsert identifiers after 3 retries')
        }
      } else {
        throw new Error(
          `Failed to upsert identifiers: ${(error as Error).message}`,
        )
      }
    }
  }
}
