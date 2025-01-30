import { DocumentWithRelations as DbDocument } from '@/prisma-schema/extended-client'
import { Person as DbPerson } from '@prisma/client'
import { Document } from '@/types/Document'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { PersonDAO } from './PersonDAO'
import { Prisma } from '@prisma/client'

interface FetchDocumentsFromDBParams {
  searchTerm: string
  page: number
  pageSize: number
  lang: string
  columnFilters: any[]
  sorting: any[]
}

export class DocumentDAO extends AbstractDAO {
  /**
   * Create or update a Document record in the database
   * @param document - The Document object to create or update
   * @returns The created or updated Document record
   */
  public async createOrUpdateDocument(document: Document): Promise<DbDocument> {
    const { uid, titles, abstracts, contributions } = document

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
          data: { uid: uid },
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
          // don't discard the whole document if a person fails to create/update
          // just skip this contribution
          continue
        }

        const { id: personId } = person
        const { id: documentId } = dbDocument
        await this.prismaClient.contribution.create({
          data: {
            personId,
            documentId,
            role: 'AUTHOR', // You can dynamically determine the role if necessary
          },
        })
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
    page,
    pageSize,
    lang,
    columnFilters,
    sorting,
  }: FetchDocumentsFromDBParams): Promise<DbDocument[]> {
    const skip = (page - 1) * pageSize

    const languagePriority = ['fr', 'en', 'es', 'it']
    const langOrder = [
      lang,
      ...languagePriority.filter((language) => language !== lang),
    ]

    let query = Prisma.sql`
      SELECT d.id,
        d.uid,
        p."firstName" AS contributor_firstName, p."lastName" AS contributor_lastName,
        p."id" AS contributor_id, p."uid" AS contributor_uid, p."email" AS contributor_email,
        c."role" as role, c."id" as contribution_id,
        t.value AS title_value, t.language AS title_language, t.id AS title_id
      FROM "Document" d
      LEFT JOIN "DocumentTitle" t ON t."documentId" = d.id
      LEFT JOIN "Contribution" c ON c."documentId" = d.id
      LEFT JOIN "Person" p ON p.id = c."personId"
      WHERE 1 = 1
    `

    if (searchTerm) {
      const languageSearchConditions = langOrder.map((language) => {
        return Prisma.sql`
          (t.language = ${language} AND t.value ILIKE ${`%${searchTerm}%`})
        `
      })

      query = Prisma.sql`
        ${query} AND (
          ${Prisma.join(languageSearchConditions, ' OR ')}
          OR (p."firstName" ILIKE ${`%${searchTerm}%`} OR p."lastName" ILIKE ${`%${searchTerm}%`})
        )
      `
    }

    columnFilters.forEach((filter: { id: string; value: string }) => {
      if (filter.id === 'titles') {
        query = Prisma.sql`
          ${query} AND (
            ${Prisma.join(
              langOrder.map(
                (language) => Prisma.sql`
                  (t.language = ${language} AND t.value ILIKE ${`%${filter.value}%`})
                `,
              ),
              ' OR ',
            )}
          )
        `
      } else if (filter.id === 'contributions') {
        query = Prisma.sql`
          ${query} AND (p."firstName" ILIKE ${`%${filter.value}%`} OR p."lastName" ILIKE ${`%${filter.value}%`})
        `
      }
    })

    let orderQuery = Prisma.empty
    sorting.forEach((sort: { id: string; desc: boolean }) => {
      if (sort.id === 'contributions') {
        orderQuery = Prisma.sql`
          ORDER BY 
            NULLIF(contributor_firstName, '') IS NULL ASC, contributor_firstName ${sort.desc ? Prisma.raw('DESC') : Prisma.raw('ASC')} NULLS LAST, 
            NULLIF(contributor_lastName, '') IS NULL ASC, contributor_lastName ${sort.desc ? Prisma.raw('DESC') : Prisma.raw('ASC')} NULLS LAST
        `
      } else if (sort.id === 'titles') {
        const orderClauses = langOrder.map((language) => {
          return Prisma.raw(`
            NULLIF(title_value, '') IS NULL ASC,
            title_language = '${language}' DESC,
            title_language != '${language}' ASC
          `)
        })
        orderQuery = Prisma.sql`
          ORDER BY 
            ${Prisma.join(orderClauses, ', ')}, 
            title_value ${sort.desc ? Prisma.raw('DESC') : Prisma.raw('ASC')} NULLS LAST
        `
      }
    })

    query = Prisma.sql`
      WITH grouped_documents AS (
        ${query}
      )
      SELECT
        id, 
        uid,
        ARRAY_AGG(DISTINCT JSONB_BUILD_OBJECT(
          'id', title_id, 'language', title_language, 'value', title_value
        )) AS titles,
        ARRAY_AGG(DISTINCT JSONB_BUILD_OBJECT(
          'id', contribution_id, 'role', role, 'person', JSONB_BUILD_OBJECT(
            'id', contributor_id, 'firstName', contributor_firstName,
            'lastName', contributor_lastName, 'uid', contributor_uid, 'email', contributor_email
          )
        )) AS contributions
      FROM grouped_documents
      GROUP BY id, uid ,title_value ,contributor_firstName, contributor_lastName,title_language
      ${orderQuery}
      OFFSET ${skip} LIMIT ${pageSize}
    `

    const documents: any[] = await this.prismaClient
      .$queryRaw(query)
      .catch((error) => {
        console.error(error)
        return []
      })

    const countQuery = Prisma.sql`
      SELECT COUNT(DISTINCT d.id) AS total
      FROM "Document" d
      LEFT JOIN "DocumentTitle" t ON t."documentId" = d.id
      LEFT JOIN "Contribution" c ON c."documentId" = d.id
      LEFT JOIN "Person" p ON p.id = c."personId"
      WHERE 1 = 1
    `

    const languageSearchConditions = langOrder.map((language) => {
      return Prisma.sql`
        (t.language = ${language} AND t.value ILIKE ${`%${searchTerm}%`})
      `
    })

    const totalCount = await this.prismaClient.$queryRaw(
      searchTerm
        ? Prisma.sql`${countQuery} AND (
            ${Prisma.join(languageSearchConditions, ' OR ')}
            OR (p."firstName" ILIKE ${`%${searchTerm}%`} OR p."lastName" ILIKE ${`%${searchTerm}%`})
          )`
        : countQuery,
    )

    return { documents, totalItems: parseInt(totalCount[0].total, 10) }
  }
}
