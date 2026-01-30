import { PublicationIdentifier as DbPublicationIdentifier } from '@prisma/client'

export interface PublicationIdentifierJson {
  type: string
  value: string | null
}

export class PublicationIdentifier {
  constructor(
    public type: string,
    public value: string | null,
  ) {}

  static fromJSON(json: PublicationIdentifierJson) {
    return new PublicationIdentifier(json.type, json.value)
  }

  static fromDbIdentifier(publicationIdentifier: DbPublicationIdentifier) {
    return new PublicationIdentifier(
      publicationIdentifier.type,
      publicationIdentifier.value,
    )
  }
}
