import { AbstractDAO } from '@/lib/daos/AbstractDAO'
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

    const docs = await this.prismaClient.document.findMany({
      where: {
        contributions: {
          some: {
            person: {
              uid: { in: contributorUids },
            },
          },
        },
      },
      select: {
        publicationDateStart: true,
        publicationDate: true,
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
                normalizedName: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    const yearOf = (d: {
      publicationDateStart: Date | null
      publicationDate: string | null
    }): number | null => {
      if (d.publicationDateStart) return d.publicationDateStart.getUTCFullYear()
      if (d.publicationDate) {
        const m = d.publicationDate.match(/^(\d{4})/)
        if (m) {
          const y = Number(m[1])
          if (!Number.isNaN(y) && y > 0) return y
        }
      }
      return null
    }

    const out: DocumentForWordStreamAggregation[] = []

    for (const d of docs) {
      const year = yearOf(d)
      if (opts?.fromYear && year !== null && year < opts.fromYear) continue
      if (opts?.toYear && year !== null && year > opts.toYear) continue

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
