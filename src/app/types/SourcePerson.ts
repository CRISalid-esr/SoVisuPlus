import { SourcePerson as DbSourcePerson } from '@prisma/client'

export interface SourcePersonJson {
  uid: string
  name: string
  source: string
  sourceId: string | null
}

export class SourcePerson {
  constructor(
    public uid: string,
    public name: string,
    public source: string,
    public sourceId: string | null,
  ) {}

  static fromJson(json: SourcePersonJson): SourcePerson {
    return new SourcePerson(json.uid, json.name, json.source, json.sourceId)
  }

  static fromDbSourcePerson(sourcePerson: DbSourcePerson): SourcePerson {
    return new SourcePerson(
      sourcePerson.uid,
      sourcePerson.name,
      sourcePerson.source,
      sourcePerson.sourceId,
    )
  }
}
