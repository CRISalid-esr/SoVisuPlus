import { Prisma } from '@prisma/client'
import { AbstractDAO } from '@/lib/daos/AbstractDAO'
import { batchPageArgs, fetchInBatches } from '@/lib/daos/fetchInBatches'
import { Concept } from '@/types/Concept'
import { Literal } from '@/types/Literal'
import { Person } from '@/types/Person'

export type WordStreamConcept = Pick<Concept, 'uid' | 'uri' | 'prefLabels'>
export type WordStreamCoAuthors = Pick<
  Person,
  'uid' | 'displayName' | 'firstName' | 'lastName'
>

export type DocumentForWordStreamAggregation = {
  year: number | null
  subjects: WordStreamConcept[]
  coauthors: WordStreamCoAuthors[]
}

export class DocumentAggregateDAO extends AbstractDAO {
  /**
   * Extract raw fields needed for wordstream-like aggregates, per document,
   * for one or many contributors (persons). No grouping/counts/language selection here.
   */
  async fetchDocsForPersonAggregation(
    contributorUids: string[],
    opts?: { fromYear?: number; toYear?: number },
  ): Promise<DocumentForWordStreamAggregation[]> {
    if (!Array.isArray(contributorUids) || contributorUids.length === 0) {
      return []
    }

    const where: Prisma.DocumentWhereInput = {
      publicationDateStart: {
        not: null,
        ...(opts?.fromYear && {
          gte: new Date(Date.UTC(opts.fromYear, 0, 1)),
        }),
        ...(opts?.toYear && {
          lt: new Date(Date.UTC(opts.toYear + 1, 0, 1)),
        }),
      },
      contributions: {
        some: {
          person: {
            uid: { in: contributorUids },
          },
        },
      },
    }

    const docs = await fetchInBatches((cursorId, batchSize) =>
      this.prismaClient.document.findMany({
        where,
        select: {
          id: true,
          publicationDateStart: true,
          subjects: {
            select: {
              uid: true,
              uri: true,
              labels: { select: { language: true, value: true, type: true } },
            },
          },
          contributions: {
            select: {
              person: {
                select: {
                  uid: true,
                  displayName: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        ...batchPageArgs(cursorId, batchSize),
      }),
    )

    const out: DocumentForWordStreamAggregation[] = []

    for (const d of docs) {
      // Never null: the where clause requires publicationDateStart.
      const year = d.publicationDateStart!.getUTCFullYear()

      // exclude ALL queried contributors from coauthors
      const coauthors: WordStreamCoAuthors[] = (d.contributions || [])
        .map((c) => c.person)
        .filter((p) => !!p && !contributorUids.includes(p.uid))
        .map((p) => ({
          uid: p.uid,
          displayName: p.displayName,
          firstName: p.firstName || '',
          lastName: p.lastName || '',
        }))

      // keep only PREF labels, convert to Literal
      const subjects: WordStreamConcept[] = (d.subjects || []).map((s) => ({
        uid: s.uid,
        uri: s.uri,
        prefLabels: s.labels
          .filter((l) => l.type === 'PREF')
          .map((l) => Literal.fromDbLiteral(l)),
      }))

      out.push({ year, subjects, coauthors })
    }

    return out
  }
}
