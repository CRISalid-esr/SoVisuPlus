import {
  PublicationIdentifierType as DbPublicationIdentifierType,
  PublicationIdentifier as DbPublicationIdentifier,
} from '@prisma/client'

export interface PublicationIdentifierJson {
  type: string
  value: string | null
}

export class PublicationIdentifier {
  constructor(
    public type: DbPublicationIdentifierType,
    public value: string | null,
  ) {}

  /**
   * Convert a string to a valid PublicationIdentifierType or return PublicationIdentifierType.unknown as default
   * @param typeString - The string representation of the publication identifier type
   * @returns A valid PublicationIdentifierType
   */
  static publicationIdentifierTypeFromString(
    typeString: string,
  ): DbPublicationIdentifierType {
    const convertedType = typeString as DbPublicationIdentifierType
    return Object.values(DbPublicationIdentifierType).includes(convertedType)
      ? convertedType
      : DbPublicationIdentifierType.unknown
  }

  static fromJSON(json: PublicationIdentifierJson) {
    return new PublicationIdentifier(
      this.publicationIdentifierTypeFromString(json.type),
      json.value,
    )
  }

  static fromDbIdentifier(publicationIdentifier: DbPublicationIdentifier) {
    return new PublicationIdentifier(
      publicationIdentifier.type,
      publicationIdentifier.value,
    )
  }
}
