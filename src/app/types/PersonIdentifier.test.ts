// file: src/app/types/__tests__/PersonIdentifier.test.ts
import { describe, expect, it } from '@jest/globals'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'

describe('PersonIdentifier', () => {
  describe('typeFromString', () => {
    it('maps known string values to PersonIdentifierType', () => {
      expect(PersonIdentifier.typeFromString('local')).toBe(
        PersonIdentifierType.LOCAL,
      )
      expect(PersonIdentifier.typeFromString('orcid')).toBe(
        PersonIdentifierType.ORCID,
      )
      expect(PersonIdentifier.typeFromString('idref')).toBe(
        PersonIdentifierType.IDREF,
      )
      expect(PersonIdentifier.typeFromString('scopus_eid')).toBe(
        PersonIdentifierType.SCOPUS_EID,
      )
      expect(PersonIdentifier.typeFromString('id_hal')).toBe(
        PersonIdentifierType.ID_HAL_S,
      )
      expect(PersonIdentifier.typeFromString('id_hal_s')).toBe(
        PersonIdentifierType.ID_HAL_S,
      )
      expect(PersonIdentifier.typeFromString('id_hal_i')).toBe(
        PersonIdentifierType.ID_HAL_I,
      )
      expect(PersonIdentifier.typeFromString('eppn')).toBe(
        PersonIdentifierType.EPPN,
      )
    })

    it('is case-insensitive and trims spaces', () => {
      expect(PersonIdentifier.typeFromString(' LOCAL ')).toBe(
        PersonIdentifierType.LOCAL,
      )
      expect(PersonIdentifier.typeFromString('Orcid')).toBe(
        PersonIdentifierType.ORCID,
      )
      expect(PersonIdentifier.typeFromString('IDREF')).toBe(
        PersonIdentifierType.IDREF,
      )
      expect(PersonIdentifier.typeFromString(' Scopus_EID ')).toBe(
        PersonIdentifierType.SCOPUS_EID,
      )
      expect(PersonIdentifier.typeFromString(' Id_Hal_S ')).toBe(
        PersonIdentifierType.ID_HAL_S,
      )
      expect(PersonIdentifier.typeFromString(' Id_Hal_I ')).toBe(
        PersonIdentifierType.ID_HAL_I,
      )
    })

    it('throws for unknown identifier types', () => {
      expect(() => PersonIdentifier.typeFromString('unknown')).toThrowError(
        'Unknown identifier type: unknown',
      )
      expect(() => PersonIdentifier.typeFromString('random_type')).toThrowError(
        'Unknown identifier type: random_type',
      )
    })
  })

  describe('constructor', () => {
    it('trims value', () => {
      const id = new PersonIdentifier(PersonIdentifierType.IDREF, ' 02725030X ')
      expect(id.value).toBe('02725030X')
    })

    it('throws if value is empty after trimming', () => {
      expect(
        () => new PersonIdentifier(PersonIdentifierType.ORCID, '   '),
      ).toThrowError('Identifier value is required')
    })
  })

  describe('fromJson', () => {
    it('accepts json type as string and uses typeFromString', () => {
      const id = PersonIdentifier.fromJson({
        type: 'orcid',
        value: '0000-0002',
      })
      expect(id.type).toBe(PersonIdentifierType.ORCID)
      expect(id.value).toBe('0000-0002')
    })

    it('accepts json type as enum', () => {
      const id = PersonIdentifier.fromJson({
        type: PersonIdentifierType.IDREF,
        value: '02725030X',
      })
      expect(id.type).toBe(PersonIdentifierType.IDREF)
      expect(id.value).toBe('02725030X')
    })
  })

  describe('getLabel', () => {
    it('returns expected labels', () => {
      expect(
        new PersonIdentifier(PersonIdentifierType.ORCID, 'x').getLabel(),
      ).toBe('ORCID')

      expect(
        new PersonIdentifier(PersonIdentifierType.IDREF, 'x').getLabel(),
      ).toBe('IdRef')

      expect(
        new PersonIdentifier(PersonIdentifierType.ID_HAL_S, 'x').getLabel(),
      ).toBe('HAL')

      expect(
        new PersonIdentifier(PersonIdentifierType.ID_HAL_I, 'x').getLabel(),
      ).toBe('HAL')

      expect(
        new PersonIdentifier(PersonIdentifierType.SCOPUS_EID, 'x').getLabel(),
      ).toBe('Scopus')
    })
  })

  describe('getIcon', () => {
    it('returns expected icon paths', () => {
      expect(
        new PersonIdentifier(PersonIdentifierType.ORCID, 'x').getIcon(),
      ).toBe('/icons/orcid.png')

      expect(
        new PersonIdentifier(PersonIdentifierType.IDREF, 'x').getIcon(),
      ).toBe('/icons/idref.png')

      expect(
        new PersonIdentifier(PersonIdentifierType.ID_HAL_S, 'x').getIcon(),
      ).toBe('/icons/hal.png')

      expect(
        new PersonIdentifier(PersonIdentifierType.ID_HAL_I, 'x').getIcon(),
      ).toBe('/icons/hal.png')

      expect(
        new PersonIdentifier(PersonIdentifierType.SCOPUS_EID, 'x').getIcon(),
      ).toBe('/icons/scopus.png')
    })
  })

  describe('getUrl', () => {
    it('builds IdRef URL', () => {
      const id = new PersonIdentifier(PersonIdentifierType.IDREF, '02725030X')
      expect(id.getUrl()).toBe('https://www.idref.fr/02725030X')
    })

    it('builds ORCID URL from plain id', () => {
      const id = new PersonIdentifier(
        PersonIdentifierType.ORCID,
        '0009-0005-6080-0215',
      )
      expect(id.getUrl()).toBe('https://orcid.org/0009-0005-6080-0215')
    })

    it('builds ORCID URL from full URL value', () => {
      const id = new PersonIdentifier(
        PersonIdentifierType.ORCID,
        'https://orcid.org/0009-0005-6080-0215',
      )
      expect(id.getUrl()).toBe('https://orcid.org/0009-0005-6080-0215')
    })

    it('builds AureHAL URL for ID_HAL_S with proper encoding', () => {
      const id = new PersonIdentifier(
        PersonIdentifierType.ID_HAL_S,
        'violaine-sebillotte-cuchet',
      )
      expect(id.getUrl()).toBe(
        'https://aurehal.archives-ouvertes.fr/person/browse?critere=' +
          encodeURIComponent('idHal_s:"violaine-sebillotte-cuchet"'),
      )
    })

    it('builds AureHAL URL for ID_HAL_I with proper encoding', () => {
      const id = new PersonIdentifier(PersonIdentifierType.ID_HAL_I, '12345')
      expect(id.getUrl()).toBe(
        'https://aurehal.archives-ouvertes.fr/person/browse?critere=' +
          encodeURIComponent('idHal_i:"12345"'),
      )
    })

    it('returns null for unsupported types', () => {
      expect(
        new PersonIdentifier(PersonIdentifierType.LOCAL, 'x').getUrl(),
      ).toBeNull()
      expect(
        new PersonIdentifier(PersonIdentifierType.EPPN, 'x').getUrl(),
      ).toBeNull()
      expect(
        new PersonIdentifier(PersonIdentifierType.SCOPUS_EID, 'x').getUrl(),
      ).toBeNull()
    })
  })
  describe('fromDB', () => {
    it('creates a PersonIdentifier from DB fields (type, value)', () => {
      const dbIdentifier = {
        type: PersonIdentifierType.IDREF,
        value: ' 02725030X ',
        // DB-only fields omitted by signature:
        // id, personId, orcidIdentifier
      }

      const id = PersonIdentifier.fromDB(dbIdentifier)

      expect(id).toBeInstanceOf(PersonIdentifier)
      expect(id.type).toBe(PersonIdentifierType.IDREF)

      expect(id.value).toBe('02725030X')
    })
  })
})
