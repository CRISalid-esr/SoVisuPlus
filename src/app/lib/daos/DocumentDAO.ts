import { DocumentWithRelations as DbDocument } from '@/prisma-schema/extended-client'
import {
  Concept as DbConcept,
  DocumentState,
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
import QueryMode = Prisma.QueryMode

interface FetchDocumentsFromDBParams {
  searchTerm: string
  searchLang: string
  page: number
  pageSize: number
  columnFilters: { id: string; value: string | string[] }[]
  sorting: { id: string; desc: boolean }[]
  contributorUids: string[]
  halCollectionCodes: string[]
  areHalCollectionCodesOmitted: boolean
}

interface CountDocumentsFromDBParams {
  searchTerm: string
  searchLang: string
  columnFilters: { id: string; value: string | string[] }[]
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
            contributions: { include: { person: true } },
            records: true,
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
            journal: journalId ? { connect: { id: journalId } } : undefined,
            volume,
            issue,
            pages,
          },
          include: {
            titles: true,
            abstracts: true,
            subjects: { include: { labels: true } },
            contributions: { include: { person: true } },
            records: true,
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
            records: true,
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
          await this.prismaClient.documentRecord.upsert({
            where: { uid: record.uid },
            update: {
              platform: {
                set: getBibliographicPlatformDbValue(record.platform),
              },
              titles: record.titles.map((title) => title.toJson()),
              url: record.url,
              halCollectionCodes: record.halCollectionCodes || [],
              halSubmitType: record.halSubmitType,
              // in case the record was not previously linked to this document :
              document: { connect: { id: dbDocument.id } },
            },
            create: {
              uid: record.uid,
              platform: getBibliographicPlatformDbValue(record.platform),
              titles: record.titles.map((title) => title.toJson()),
              url: record.url,
              halCollectionCodes: record.halCollectionCodes || [],
              halSubmitType: record.halSubmitType,
              documentId: dbDocument.id,
            },
          })
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
    columnFilters: { id: string; value: string | string[] }[]
    contributorUids: string[]
    halCollectionCodes: string[]
    areHalCollectionCodesOmitted: boolean
  }): Prisma.DocumentWhereInput {
    const publicationListRolesFilter: string[] =
      process.env.PUBLICATION_LIST_ROLES_FILTER?.split(',') || []

    const perspectiveRolesFilter: string[] =
      process.env.PERSPECTIVES_ROLES_FILTER?.split(',') || []

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
            person: true,
          },
        },
        records: true,
        journal: {
          include: {
            identifiers: true,
          },
        },
      },
    })

    const totalItems = await this.prismaClient.document.count({ where })

    return {
      documents: dbDocuments.map((dbDocument) => {
        return Document.fromDbDocument(dbDocument)
      }),
      totalItems,
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
            person: {
              include: {
                identifiers: true,
                memberships: {
                  include: {
                    researchStructure: true,
                  },
                },
              },
            },
          },
        },
        records: true,
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
}
