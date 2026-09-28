import process from 'node:process'
import prisma from '@/lib/daos/prisma'
import { normalizeSearchText } from '@/utils/fuzzySearch/fuzzySearch'

/**
 * One-off repair after `normalizeSearchText` started stripping combining
 * marks: rows written by the previous implementation kept the diacritics of
 * decomposed (NFD) source values, so their `normalized*` column no longer
 * matches what the code would produce — they rank as typos, and on the
 * documents list (which matches with LIKE only) they cannot be found at all.
 *
 * Recomputes every row from its source column and writes back only where the
 * result differs, so a second run updates nothing. Deliberately not wired into
 * `docker-bootstrap-app.sh`: the startup backfill only fills NULLs and must
 * stay a no-op. Run once per database holding data, then delete this script
 * together with the backfill (see specs/feat-make-search-fuzzy/prompt.md).
 */

const BATCH_SIZE = 1000

const repair = async <Row extends { id: number }>(
  label: string,
  fetchPage: (skip: number, take: number) => Promise<Row[]>,
  sourceOf: (row: Row) => string | null,
  storedOf: (row: Row) => string | null,
  update: (id: number, normalized: string | null) => Promise<unknown>,
): Promise<number> => {
  let skip = 0
  let updated = 0
  for (;;) {
    const rows = await fetchPage(skip, BATCH_SIZE)
    if (rows.length === 0) break
    for (const row of rows) {
      const source = sourceOf(row)
      // a null source legitimately yields a null column (e.g. no acronym)
      const expected = source === null ? null : normalizeSearchText(source)
      if (expected !== storedOf(row)) {
        await update(row.id, expected)
        updated++
      }
    }
    skip += rows.length
  }
  console.log(`[renormalize] ${label}: ${updated} row(s) updated`)
  return updated
}

const main = async () => {
  const total =
    (await repair(
      'Person.normalizedName',
      (skip, take) =>
        prisma.person.findMany({
          skip,
          take,
          orderBy: { id: 'asc' },
          select: {
            id: true,
            displayName: true,
            firstName: true,
            lastName: true,
            normalizedName: true,
          },
        }),
      // mirrors Person.displayNameGuard()
      (row) =>
        row.displayName?.trim() ||
        `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
      (row) => row.normalizedName,
      (id, normalized) =>
        prisma.person.update({
          where: { id },
          data: { normalizedName: normalized },
        }),
    )) +
    (await repair(
      'DocumentTitle.normalizedValue',
      (skip, take) =>
        prisma.documentTitle.findMany({
          skip,
          take,
          orderBy: { id: 'asc' },
          select: { id: true, value: true, normalizedValue: true },
        }),
      (row) => row.value,
      (row) => row.normalizedValue,
      (id, normalized) =>
        prisma.documentTitle.update({
          where: { id },
          data: { normalizedValue: normalized },
        }),
    )) +
    (await repair(
      'Journal.normalizedTitle',
      (skip, take) =>
        prisma.journal.findMany({
          skip,
          take,
          orderBy: { id: 'asc' },
          select: { id: true, title: true, normalizedTitle: true },
        }),
      (row) => row.title,
      (row) => row.normalizedTitle,
      (id, normalized) =>
        prisma.journal.update({
          where: { id },
          data: { normalizedTitle: normalized },
        }),
    )) +
    (await repair(
      'OrganizationUnitLabel.normalizedValue',
      (skip, take) =>
        prisma.organizationUnitLabel.findMany({
          skip,
          take,
          orderBy: { id: 'asc' },
          select: { id: true, value: true, normalizedValue: true },
        }),
      (row) => row.value,
      (row) => row.normalizedValue,
      (id, normalized) =>
        prisma.organizationUnitLabel.update({
          where: { id },
          data: { normalizedValue: normalized },
        }),
    )) +
    (await repair(
      'OrganizationUnit.normalizedAcronym',
      (skip, take) =>
        prisma.organizationUnit.findMany({
          skip,
          take,
          orderBy: { id: 'asc' },
          select: { id: true, acronym: true, normalizedAcronym: true },
        }),
      (row) => row.acronym,
      (row) => row.normalizedAcronym,
      (id, normalized) =>
        prisma.organizationUnit.update({
          where: { id },
          data: { normalizedAcronym: normalized },
        }),
    ))

  console.log(`[renormalize] Done — ${total} row(s) updated in total.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[renormalize] Failed:', err?.message ?? err)
  process.exit(1)
})
