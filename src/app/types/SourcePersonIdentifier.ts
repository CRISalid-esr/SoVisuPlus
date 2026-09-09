import { SourcePersonIdentifierType as DbSourcePersonIdentifierType } from '@prisma/client'
import { SourcePersonIdentifier as DbSourcePersonIdentifier } from '@prisma/client'

export type SourcePersonIdentifierJson = {
  type: string
  value: string
}

export class SourcePersonIdentifier {
  constructor(
    public type: DbSourcePersonIdentifierType,
    public value: string,
  ) {
    this.value = this.value.trim()
    if (!this.value) {
      throw new Error('Identifier value is required')
    }
  }

  static getLabelForType(type: DbSourcePersonIdentifierType): string {
    switch (type) {
      case DbSourcePersonIdentifierType.openalex:
        return 'OpenAlex'
      case DbSourcePersonIdentifierType.idref:
        return 'IdRef'
      case DbSourcePersonIdentifierType.orcid:
        return 'ORCID'
      case DbSourcePersonIdentifierType.idhals:
      case DbSourcePersonIdentifierType.idhali:
        return 'HAL'
      case DbSourcePersonIdentifierType.isni:
        return 'ISNI'
      case DbSourcePersonIdentifierType.viaf:
        return 'VIAF'
      case DbSourcePersonIdentifierType.googlescholar:
        return 'Google Scholar'
      case DbSourcePersonIdentifierType.researcherid:
        return 'ResearcherID'
      default:
        return type
    }
  }

  getLabel(): string {
    return SourcePersonIdentifier.getLabelForType(this.type)
  }

  getIcon(): string {
    switch (this.type) {
      case DbSourcePersonIdentifierType.orcid:
        return '/icons/orcid.png'
      case DbSourcePersonIdentifierType.idref:
        return '/icons/idref.png'
      case DbSourcePersonIdentifierType.idhals:
      case DbSourcePersonIdentifierType.idhali:
        return '/icons/hal.png'
      default:
        return '/icons/id.png' // fallback icon
    }
  }

  getUrl(): string | null {
    const v = this.value.trim()
    if (!v) return null

    switch (this.type) {
      case DbSourcePersonIdentifierType.openalex:
        return `https://openalex.org/${encodeURIComponent(v)}`

      case DbSourcePersonIdentifierType.idref:
        return `https://www.idref.fr/${encodeURIComponent(v)}`

      case DbSourcePersonIdentifierType.orcid: {
        // accept stored as full URL or plain ORCID
        const cleaned = v.replace(/^https?:\/\/orcid\.org\//i, '')
        return `https://orcid.org/${encodeURIComponent(cleaned)}`
      }

      case DbSourcePersonIdentifierType.idhals:
        return `https://aurehal.archives-ouvertes.fr/person/browse?critere=${encodeURIComponent(
          `idHal_s:"${v}"`,
        )}`

      case DbSourcePersonIdentifierType.idhali:
        return `https://aurehal.archives-ouvertes.fr/person/browse?critere=${encodeURIComponent(
          `idHal_i:"${v}"`,
        )}`

      case DbSourcePersonIdentifierType.isni:
        return `https://isni.org/isni/${encodeURIComponent(v)}`

      case DbSourcePersonIdentifierType.viaf:
        return `https://viaf.org/viaf/${encodeURIComponent(v)}`

      default:
        return null
    }
  }

  toJson(): SourcePersonIdentifierJson {
    return {
      type: this.type,
      value: this.value,
    }
  }

  static typeFromString(type: string): DbSourcePersonIdentifierType {
    switch (type.trim()) {
      case 'openalex':
        return DbSourcePersonIdentifierType.openalex
      case 'idref':
        return DbSourcePersonIdentifierType.idref
      case 'orcid':
        return DbSourcePersonIdentifierType.orcid
      case 'idhals':
        return DbSourcePersonIdentifierType.idhals
      case 'idhali':
        return DbSourcePersonIdentifierType.idhali
      case 'isni':
        return DbSourcePersonIdentifierType.isni
      case 'viaf':
        return DbSourcePersonIdentifierType.viaf
      case 'googlescholar':
        return DbSourcePersonIdentifierType.googlescholar
      case 'researcherid':
        return DbSourcePersonIdentifierType.researcherid
      default:
        throw new Error(`Unknown identifier type: ${type}`)
    }
  }

  static fromJson(json: SourcePersonIdentifierJson): SourcePersonIdentifier {
    const type =
      typeof json.type === 'string'
        ? SourcePersonIdentifier.typeFromString(json.type)
        : json.type
    return new SourcePersonIdentifier(type, json.value)
  }

  static fromDB(
    identifier: Omit<DbSourcePersonIdentifier, 'id' | 'sourcePersonId'>,
  ): SourcePersonIdentifier {
    return new SourcePersonIdentifier(identifier.type, identifier.value)
  }
}

export { DbSourcePersonIdentifierType as SourcePersonIdentifierType }
