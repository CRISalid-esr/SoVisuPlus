import { DocumentWithRelations as DbDocument } from '@/prisma-schema/extended-client'
import { Person as DbPerson, Prisma } from '@prisma/client'
import { Document } from '@/types/Document'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { PersonDAO } from './PersonDAO'
import { getBibliographicPlatformDbValue } from '@/types/BibliographicPlatform'
import QueryMode = Prisma.QueryMode

interface FetchDocumentsFromDBParams {
  searchTerm: string
  searchLang: string
  page: number
  pageSize: number
  columnFilters: { id: string; value: string }[]
  sorting: { id: string; desc: boolean }[]
  contributorUid: string | null
}

export class DocumentDAO extends AbstractDAO {
  /**
   * Create or update a Document record in the database
   * @param document - The Document object to create or update
   * @returns The created or updated Document record
   */
  public async createOrUpdateDocument(document: Document): Promise<DbDocument> {
    const { uid, titles, abstracts, contributions, records } = document

    try {
      let dbDocument = (await this.prismaClient.document.findUnique({
        where: { uid: uid },
        include: {
          titles: true, // Include related titles
          abstracts: true, // Include related abstracts
        },
      })) as DbDocument | null

      if (!dbDocument) {
        dbDocument = (await this.prismaClient.document.create({
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
          },
          include: {
            titles: true, // Include related titles
            abstracts: true, // Include related abstracts
          },
        })) as DbDocument
      } else {
        dbDocument = (await this.prismaClient.document.update({
          where: { uid: uid },
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
          },
          include: {
            titles: true, // Include related titles
            abstracts: true, // Include related abstracts
          },
        })) as DbDocument
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

      for (const record of records) {
        try {
          await this.prismaClient.documentRecord.upsert({
            where: {
              uid: record.uid,
            },
            update: {
              platform: {
                set: getBibliographicPlatformDbValue(record.platform),
              },
              titles: record.titles.map((title) => title.toJson()),
              url: record.url,
            },
            create: {
              uid: record.uid,
              platform: getBibliographicPlatformDbValue(record.platform),
              titles: record.titles.map((title) => title.toJson()),
              url: record.url,
              documentId: dbDocument.id, // Link to document
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

  public async fetchDocumentsFromDB({
    searchTerm,
    searchLang,
    page,
    pageSize,
    columnFilters,
    sorting,
    contributorUid,
  }: FetchDocumentsFromDBParams): Promise<{
    documents: DbDocument[]
    totalItems: number
  }> {
    const skip = (page - 1) * pageSize

    const publicationListRolesFilter =
      process.env.PUBLICATION_LIST_ROLES_FILTER?.split(',') || []

    // find the index of the search lang in the array of process.env.NEXT_PUBLIC_SUPPORTED_LOCALES
    const searchLangIndex =
      process.env.NEXT_PUBLIC_SUPPORTED_LOCALES?.split(',').indexOf(
        searchLang,
      ) || 0
    const sortingTitleFieldName = `title_locale_${searchLangIndex}`

    let where: Prisma.DocumentWhereInput = {}

    if (publicationListRolesFilter.length > 0) {
      where = {
        contributions: {
          some: {
            roles: {
              hasSome: publicationListRolesFilter,
            },
          },
        },
      }
    }

    if (searchTerm) {
      where = {
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
        ],
      }
    }

    columnFilters.forEach((filter) => {
      if (filter.id === 'titles') {
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

      if (filter.id === 'abstracts') {
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

      if (filter.id === 'contributions') {
        where = {
          ...where,
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
            AND: dateConditions,
          }
        }
      }
      if (filter.id === 'type' && Array.isArray(filter.value)) {
        where = {
          ...where,
          documentType: {
            in: filter.value,
          },
        }
      }
    })

    if (contributorUid) {
      where = {
        ...where,
        contributions: {
          some: {
            person: {
              uid: contributorUid,
            },
          },
        },
      }
    }

    const orderBy: Prisma.DocumentOrderByWithRelationInput[] = sorting.map(
      (sort) => {
        if (sort.id === 'contributions') {
          return {
            contributions: {
              _count: sort.desc ? 'desc' : 'asc',
            },
          }
        }

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

        return { [sort.id]: sort.desc ? 'desc' : 'asc' }
      },
    )

    const documents = await this.prismaClient.document.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      include: {
        titles: true,
        abstracts: true,
        contributions: {
          include: {
            person: true,
          },
        },
        records: true,
      },
    })

    const totalItems = await this.prismaClient.document.count({ where })

    return {
      documents,
      totalItems,
    }
  }
}
