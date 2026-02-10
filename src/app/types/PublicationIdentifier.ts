import {
  PublicationIdentifierType,
  PublicationIdentifier as DbPublicationIdentifier,
} from '@prisma/client'

export const publicationIdentifierStringToType: Record<
  string,
  PublicationIdentifierType
> = {
  hal: PublicationIdentifierType.HAL,
  doi: PublicationIdentifierType.DOI,
  open_alex: PublicationIdentifierType.OPENALEX,
  uri: PublicationIdentifierType.URI,
  sudoc_ppn: PublicationIdentifierType.SUDOCPPN,
  nnt: PublicationIdentifierType.NNT,
  prodinra: PublicationIdentifierType.PRODINRA,
  wos: PublicationIdentifierType.WOS,
  pmid: PublicationIdentifierType.PMID,
  arxiv: PublicationIdentifierType.ARXIV,
  ppn: PublicationIdentifierType.PPN,
  pubmed: PublicationIdentifierType.PUBMED,
  pii: PublicationIdentifierType.PII,
  pubmedcentral: PublicationIdentifierType.PUBMEDCENTRAL,
  ird: PublicationIdentifierType.IRD,
  sciencespo: PublicationIdentifierType.SCIENCESPO,
  ineris: PublicationIdentifierType.INERIS,
  unknown: PublicationIdentifierType.UNKNOWN,
}

export const publicationIdentifierTypeToString: Record<
  PublicationIdentifierType,
  string
> = {
  HAL: 'HAL',
  DOI: 'DOI',
  OPENALEX: 'OPENALEX',
  URI: 'URI',
  SUDOCPPN: 'SUDOC-PPN',
  NNT: 'NNT',
  PRODINRA: 'PRODINRA',
  WOS: 'WOS',
  PMID: 'PMID',
  ARXIV: 'ARXIV',
  PPN: 'PPN',
  PUBMED: 'PUBMED',
  PII: 'PII',
  PUBMEDCENTRAL: 'PUBMEDCENTRAL',
  IRD: 'IRD',
  SCIENCESPO: 'SCIENCESPO',
  INERIS: 'INERIS',
  UNKNOWN: 'UNKNOWN',
}

export interface PublicationIdentifierJson {
  type: string
  value: string | null
}

export class PublicationIdentifier {
  constructor(
    public type: PublicationIdentifierType,
    public value: string | null,
  ) {}

  /**
   * Convert a string to a valid PublicationIdentifierType or return PublicationIdentifierType.UNKNOWN as default
   * @param typeString - The string representation of the publication identifier type
   * @returns A valid PublicationIdentifierType
   */
  static publicationIdentifierTypeFromString(
    typeString: string,
  ): PublicationIdentifierType {
    const convertedType = publicationIdentifierStringToType[typeString]
    return convertedType ? convertedType : PublicationIdentifierType.UNKNOWN
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
