import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'

export type PersonIdentifierJson = {
  type: DbPersonIdentifierType | string
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

  getLabel(): string {
    switch (this.type) {
      case DbPersonIdentifierType.ORCID:
        return 'ORCID'
      case DbPersonIdentifierType.IDREF:
        return 'IdRef'
      case DbPersonIdentifierType.ID_HAL_S:
      case DbPersonIdentifierType.ID_HAL_I:
        return 'HAL'
      case DbPersonIdentifierType.HAL_LOGIN:
        return 'HAL_LOGIN'
      case DbPersonIdentifierType.SCOPUS_EID:
        return 'Scopus'
      case DbPersonIdentifierType.EPPN:
        return 'EPPN'
      case DbPersonIdentifierType.LOCAL:
        return 'Local'
      default:
        return this.type
    }
  }

  getIcon(): string {
    switch (this.type) {
      case DbPersonIdentifierType.ORCID:
        return '/icons/orcid.png'
      case DbPersonIdentifierType.IDREF:
        return '/icons/idref.png'
      case DbPersonIdentifierType.ID_HAL_S:
      case DbPersonIdentifierType.ID_HAL_I:
      case DbPersonIdentifierType.HAL_LOGIN:
        return '/icons/hal.png'
      case DbPersonIdentifierType.SCOPUS_EID:
        return '/icons/scopus.png'
      default:
        return '/icons/id.png' // fallback icon
    }
  }

  getUrl(): string | null {
    const v = this.value.trim()
    if (!v) return null

    switch (this.type) {
      case DbPersonIdentifierType.IDREF:
        return `https://www.idref.fr/${encodeURIComponent(v)}`

      case DbPersonIdentifierType.ORCID: {
        // accept stored as full URL or plain ORCID
        const cleaned = v.replace(/^https?:\/\/orcid\.org\//i, '')
        return `https://orcid.org/${encodeURIComponent(cleaned)}`
      }

      case DbPersonIdentifierType.ID_HAL_S:
        return `https://aurehal.archives-ouvertes.fr/person/browse?critere=${encodeURIComponent(
          `idHal_s:"${v}"`,
        )}`

      case DbPersonIdentifierType.ID_HAL_I:
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
    switch (type.trim().toLowerCase()) {
      case 'local':
        return DbPersonIdentifierType.LOCAL
      case 'orcid':
        return DbPersonIdentifierType.ORCID
      case 'idref':
        return DbPersonIdentifierType.IDREF
      case 'scopus_eid':
        return DbPersonIdentifierType.SCOPUS_EID
      case 'id_hal':
      case 'id_hal_s':
        return DbPersonIdentifierType.ID_HAL_S
      case 'id_hal_i':
        return DbPersonIdentifierType.ID_HAL_I
      case 'hal_login':
        return DbPersonIdentifierType.HAL_LOGIN
      case 'eppn':
        return DbPersonIdentifierType.EPPN
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
}

export { DbPersonIdentifierType as PersonIdentifierType }
