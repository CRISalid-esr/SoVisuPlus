import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'
import { PersonIdentifierWithRelations as DBPersonIdentifier } from '@/prisma-schema/extended-client'

export type PersonIdentifierJson = {
  type: string
  value: string
}

export class PersonIdentifier {
  constructor(
    public type: DbPersonIdentifierType,
    public value: string,
  ) {
    this.value = this.value.trim()
    if (!this.value) {
      throw new Error('Identifier value is required')
    }
  }

  static getLabelForType(type: DbPersonIdentifierType): string {
    switch (type) {
      case DbPersonIdentifierType.orcid:
        return 'ORCID'
      case DbPersonIdentifierType.idref:
        return 'IdRef'
      case DbPersonIdentifierType.idhals:
      case DbPersonIdentifierType.idhali:
        return 'HAL'
      case DbPersonIdentifierType.hal_login:
        return 'HAL_LOGIN'
      case DbPersonIdentifierType.scopus:
        return 'Scopus'
      case DbPersonIdentifierType.eppn:
        return 'EPPN'
      case DbPersonIdentifierType.local:
        return 'Local'
      default:
        return type
    }
  }

  getLabel(): string {
    return PersonIdentifier.getLabelForType(this.type)
  }

  getIcon(): string {
    switch (this.type) {
      case DbPersonIdentifierType.orcid:
        return '/icons/orcid.png'
      case DbPersonIdentifierType.idref:
        return '/icons/idref.png'
      case DbPersonIdentifierType.idhals:
      case DbPersonIdentifierType.idhali:
      case DbPersonIdentifierType.hal_login:
        return '/icons/hal.png'
      case DbPersonIdentifierType.scopus:
        return '/icons/scopus.png'
      default:
        return '/icons/id.png' // fallback icon
    }
  }

  getUrl(): string | null {
    const v = this.value.trim()
    if (!v) return null

    switch (this.type) {
      case DbPersonIdentifierType.idref:
        return `https://www.idref.fr/${encodeURIComponent(v)}`

      case DbPersonIdentifierType.orcid: {
        // accept stored as full URL or plain ORCID
        const cleaned = v.replace(/^https?:\/\/orcid\.org\//i, '')
        return `https://orcid.org/${encodeURIComponent(cleaned)}`
      }

      case DbPersonIdentifierType.idhals:
        return `https://aurehal.archives-ouvertes.fr/person/browse?critere=${encodeURIComponent(
          `idHal_s:"${v}"`,
        )}`

      case DbPersonIdentifierType.idhali:
        return `https://aurehal.archives-ouvertes.fr/person/browse?critere=${encodeURIComponent(
          `idHal_i:"${v}"`,
        )}`

      default:
        return null
    }
  }

  toJson(): PersonIdentifierJson {
    return {
      type: this.type,
      value: this.value,
    }
  }

  static typeFromString(type: string): DbPersonIdentifierType {
    switch (type.trim()) {
      case 'local':
        return DbPersonIdentifierType.local
      case 'orcid':
        return DbPersonIdentifierType.orcid
      case 'idref':
        return DbPersonIdentifierType.idref
      case 'scopus':
        return DbPersonIdentifierType.scopus
      case 'idhals':
        return DbPersonIdentifierType.idhals
      case 'idhali':
        return DbPersonIdentifierType.idhali
      case 'eppn':
        return DbPersonIdentifierType.eppn
      case 'hal_login':
        return DbPersonIdentifierType.hal_login
      default:
        throw new Error(`Unknown identifier type: ${type}`)
    }
  }

  static fromJson(json: PersonIdentifierJson): PersonIdentifier {
    const type =
      typeof json.type === 'string'
        ? PersonIdentifier.typeFromString(json.type)
        : json.type
    return new PersonIdentifier(type, json.value)
  }

  static fromDB(
    identifier: Omit<DBPersonIdentifier, 'id' | 'personId' | 'orcidIdentifier'>,
  ): PersonIdentifier {
    return new PersonIdentifier(identifier.type, identifier.value)
  }
}

export { DbPersonIdentifierType as PersonIdentifierType }
