import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export const GET = async (req: NextRequest) => {
  try {
    const urlParams = req.nextUrl.searchParams
    const searchTerm = urlParams.get('searchTerm') || ''
    const page = parseInt(urlParams.get('page') || '1', 10)
    const pageSize = parseInt(urlParams.get('pageSize') || '10', 10)
    const lang = urlParams.get('searchLang') || 'en'
    const columnFilters = JSON.parse(urlParams.get('columnFilters') || '[]')
    const sorting = JSON.parse(urlParams.get('sorting') || '[]')

    const skip = (page - 1) * pageSize

    // Base query
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

    // Add search term filters
    if (searchTerm) {
      query = Prisma.sql`
        ${query} AND (
          (t.language = ${lang} AND t.value ILIKE ${`%${searchTerm}%`})
          OR (p."firstName" ILIKE ${`%${searchTerm}%`} OR p."lastName" ILIKE ${`%${searchTerm}%`})
        )
      `
    }

    // Add column filters
    columnFilters.forEach((filter: { id: string; value: string }) => {
      if (filter.id === 'titles') {
        query = Prisma.sql`
          ${query} AND (t.language = ${lang} AND t.value ILIKE ${`%${filter.value}%`})
        `
      } else if (filter.id === 'contributions') {
        query = Prisma.sql`
          ${query} AND (p."firstName" ILIKE ${`%${filter.value}%`} OR p."lastName" ILIKE ${`%${filter.value}%`})
        `
      }
    })

    // Add sorting
    if (sorting.length > 0) {
      const orderBy = sorting.map(
        (sort: { id: string; desc: boolean }) =>
          Prisma.sql`${Prisma.raw(sort.id)} ${sort.desc ? Prisma.raw('DESC') : Prisma.raw('ASC')}`,
      )
      query = Prisma.sql`${query} ORDER BY ${Prisma.join(orderBy, ', ')}`
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
      GROUP BY id, uid
      OFFSET ${skip} LIMIT ${pageSize}
    `

    console.log('Query:', query.sql)

    // Fetch documents with titles and contributions
    const documents: any[] = await prisma.$queryRaw(query)

    // Count total items
    const countQuery = Prisma.sql`
      SELECT COUNT(DISTINCT d.id) AS total
      FROM "Document" d
      LEFT JOIN "DocumentTitle" t ON t."documentId" = d.id
      LEFT JOIN "Contribution" c ON c."documentId" = d.id
      LEFT JOIN "Person" p ON p.id = c."personId"
      WHERE 1 = 1
    `

    const totalCount = await prisma.$queryRaw(
      searchTerm
        ? Prisma.sql`${countQuery} AND (
            (t.language = ${lang} AND t.value ILIKE ${`%${searchTerm}%`})
            OR (p."firstName" ILIKE ${`%${searchTerm}%`} OR p."lastName" ILIKE ${`%${searchTerm}%`})
          )`
        : countQuery,
    )

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
