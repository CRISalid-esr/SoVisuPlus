import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export const GET = async (req: NextRequest) => {
  try {
    const urlParams = req.nextUrl.searchParams
    const searchTerm = urlParams.get('searchTerm') || ''
    const page = parseInt(urlParams.get('page') || '1', 10)
    const pageSize = parseInt(urlParams.get('pageSize') || '10', 10)
    const lang = urlParams.get('searchLang') || 'fr'
    const columnFilters = JSON.parse(urlParams.get('columnFilters') || '[]')
    const sorting = JSON.parse(urlParams.get('sorting') || '[]')

    const skip = (page - 1) * pageSize

    // Define language priority order
    const languagePriority = ['fr', 'en', 'es', 'it'] // Default languages
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

    // Apply searchTerm filter (dynamically handle fallback languages)
    if (searchTerm) {
      // Construct the search condition for each language in langOrder
      const languageSearchConditions = langOrder.map((language) => {
        return Prisma.sql`
          (t.language = ${language} AND t.value ILIKE ${`%${searchTerm}%`})
        `
      })

      // Combine all language search conditions with OR
      query = Prisma.sql`
        ${query} AND (
          ${Prisma.join(languageSearchConditions, ' OR ')}
          OR (p."firstName" ILIKE ${`%${searchTerm}%`} OR p."lastName" ILIKE ${`%${searchTerm}%`})
        )
      `
    }

    // Apply column filters (with title filtering also considering fallback languages)
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

    // Apply sorting (using dynamic language order)
    let orderQuery = Prisma.empty
    if (sorting.length > 0) {
      const orderClauses = langOrder.map((language) => {
        return Prisma.raw(`
          NULLIF(title_value, '') IS NULL ASC,
          title_language = '${language}' DESC,
          title_language != '${language}' ASC
        `)
      })
      console.log('sorting[0].desc:', sorting[0].desc)
      orderQuery = Prisma.sql`ORDER BY ${Prisma.join(orderClauses, ', ')}, title_value ${sorting[0].desc ? Prisma.raw('DESC') : Prisma.raw('ASC')} NULLS LAST`
    }

    // Group by document and collect related titles and contributions
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

    console.log('=>', query.sql)
    console.log('=>', query.values)

    const documents: any[] = await prisma.$queryRaw(query).catch((error) => {
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

    const totalCount = await prisma.$queryRaw(
      searchTerm
        ? Prisma.sql`${countQuery} AND (
            ${Prisma.join(languageSearchConditions, ' OR ')}
            OR (p."firstName" ILIKE ${`%${searchTerm}%`} OR p."lastName" ILIKE ${`%${searchTerm}%`})
          )`
        : countQuery,
    )

    console.log('totalCount[0].total:', parseInt(totalCount[0].total, 10))

    return NextResponse.json({
      documents: documents,
      totalItems: parseInt(totalCount[0].total, 10),
      page,
      limit: pageSize,
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Error fetching documents' },
      { status: 500 },
    )
  }
}
