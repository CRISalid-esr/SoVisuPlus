import { z } from 'zod'

const SubfieldItemSchema = z.object({
  code: z.union([z.string(), z.number()]),
  content: z.union([z.string(), z.number()]),
})

const DatafieldSchema = z.object({
  tag: z.union([z.string(), z.number()]),
  subfield: z
    .union([SubfieldItemSchema, z.array(SubfieldItemSchema)])
    .optional(),
})

export const IdRefRecordSchema = z.object({
  record: z.object({
    datafield: z.array(DatafieldSchema),
  }),
})

export type IdRefRecord = z.infer<typeof IdRefRecordSchema>

export class IdRefClient {
  private readonly baseUrl = 'https://www.idref.fr'

  async fetchPerson(id: string): Promise<IdRefRecord> {
    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(id)}.json`,
      {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      },
    )

    if (response.status === 404) {
      const err = new Error('Not found') as Error & { status: number }
      err.status = 404
      throw err
    }

    if (!response.ok) {
      const err = new Error(
        `IdRef service error: ${response.status}`,
      ) as Error & { status: number }
      err.status = response.status
      throw err
    }

    const json = await response.json()
    return IdRefRecordSchema.parse(json)
  }
}
