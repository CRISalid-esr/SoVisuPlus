import { IdRefClient, IdRefRecord } from '@/lib/services/IdRefClient'

export type IdRefOtherIdentifier = {
  system: string
  value: string
}

export type IdRefPersonData = {
  lastName: string
  firstName: string
  description?: string
  otherIdentifiers: IdRefOtherIdentifier[]
  recentPublications: string[]
}

const getSubfields = (
  record: IdRefRecord,
  tag: string | number,
): Array<{ code: string | number; content: string | number }> => {
  const tagStr = String(tag)
  const field = record.record.datafield.find((f) => String(f.tag) === tagStr)
  if (!field || !field.subfield) return []
  return Array.isArray(field.subfield) ? field.subfield : [field.subfield]
}

const getAllSubfields = (
  record: IdRefRecord,
  tag: string | number,
): Array<Array<{ code: string | number; content: string | number }>> => {
  const tagStr = String(tag)
  return record.record.datafield
    .filter((f) => String(f.tag) === tagStr)
    .map((f) => {
      if (!f.subfield) return []
      return Array.isArray(f.subfield) ? f.subfield : [f.subfield]
    })
}

const subfield = (
  subfields: Array<{ code: string | number; content: string | number }>,
  code: string,
): string | undefined => {
  const item = subfields.find((s) => String(s.code) === code)
  return item ? String(item.content) : undefined
}

export class IdRefService {
  private client: IdRefClient

  constructor() {
    this.client = new IdRefClient()
  }

  async fetchPerson(id: string): Promise<IdRefPersonData> {
    const record = await this.client.fetchPerson(id)

    // TAG 200: name fields — a=last name, b=first name
    const nameSubfields = getSubfields(record, '200')
    const lastName = subfield(nameSubfields, 'a') ?? ''
    const firstName = subfield(nameSubfields, 'b') ?? ''

    // TAG 340: description/qualification
    const descSubfields = getSubfields(record, '340')
    const description = subfield(descSubfields, 'a')

    // TAG 035: other identifiers — a=value, 2=system name
    const otherIdentifiers: IdRefOtherIdentifier[] = getAllSubfields(
      record,
      '035',
    )
      .map((subs) => {
        const value = subfield(subs, 'a')
        const system = subfield(subs, '2')
        return value && system ? { system, value } : null
      })
      .filter((x): x is IdRefOtherIdentifier => x !== null)

    // TAG 810: publication references (last 5)
    const publications = getAllSubfields(record, '810')
      .map((subs) => subfield(subs, 'a'))
      .filter((s): s is string => s !== undefined)
      .slice(-5)

    return {
      lastName,
      firstName,
      description,
      otherIdentifiers,
      recentPublications: publications,
    }
  }
}
