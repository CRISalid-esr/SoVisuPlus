import { PublicationIdentifier as DbPublicationIdentifier } from '@prisma/client'

export interface PublicationIdentifierJson {
  uid: string
  type: string
  value: string | null
}

export class PublicationIdentifier {
  constructor(
    public uid: string,
    public type: string,
    public value: string | null,
  ) {}

  static fromJSON(json: PublicationIdentifierJson) {
    return new PublicationIdentifier(json.uid, json.type, json.value)
  }

  static fromDbIdentifier(publicationIdentifier: DbPublicationIdentifier) {
    return new PublicationIdentifier(
      publicationIdentifier.uid,
      publicationIdentifier.type,
      publicationIdentifier.value,
    )
  }
}
