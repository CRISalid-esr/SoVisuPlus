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
        PersonIdentifierType.local,
      )
      expect(PersonIdentifier.typeFromString('orcid')).toBe(
        PersonIdentifierType.orcid,
      )
      expect(PersonIdentifier.typeFromString('idref')).toBe(
        PersonIdentifierType.idref,
      )
      expect(PersonIdentifier.typeFromString('scopus')).toBe(
        PersonIdentifierType.scopus,
      )
      expect(PersonIdentifier.typeFromString('idhals')).toBe(
        PersonIdentifierType.idhals,
      )
      expect(PersonIdentifier.typeFromString('idhali')).toBe(
        PersonIdentifierType.idhali,
      )
      expect(PersonIdentifier.typeFromString('eppn')).toBe(
        PersonIdentifierType.eppn,
      )
    })

    it('trims spaces', () => {
      expect(PersonIdentifier.typeFromString(' local ')).toBe(
        PersonIdentifierType.local,
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
      const id = new PersonIdentifier(PersonIdentifierType.idref, ' 02725030X ')
      expect(id.value).toBe('02725030X')
    })

    it('throws if value is empty after trimming', () => {
      expect(
        () => new PersonIdentifier(PersonIdentifierType.orcid, '   '),
      ).toThrowError('Identifier value is required')
    })
  })

  describe('fromJson', () => {
    it('accepts json type as string and uses typeFromString', () => {
      const id = PersonIdentifier.fromJson({
        type: 'orcid',
        value: '0000-0002',
      })
      expect(id.type).toBe(PersonIdentifierType.orcid)
      expect(id.value).toBe('0000-0002')
    })

    it('accepts json type as enum', () => {
      const id = PersonIdentifier.fromJson({
        type: PersonIdentifierType.idref,
        value: '02725030X',
      })
      expect(id.type).toBe(PersonIdentifierType.idref)
      expect(id.value).toBe('02725030X')
    })
  })

  describe('getLabel', () => {
    it('returns expected labels', () => {
      expect(
        new PersonIdentifier(PersonIdentifierType.orcid, 'x').getLabel(),
      ).toBe('ORCID')

      expect(
        new PersonIdentifier(PersonIdentifierType.idref, 'x').getLabel(),
      ).toBe('IdRef')

      expect(
        new PersonIdentifier(PersonIdentifierType.idhals, 'x').getLabel(),
      ).toBe('HAL')

      expect(
        new PersonIdentifier(PersonIdentifierType.idhali, 'x').getLabel(),
      ).toBe('HAL')

      expect(
        new PersonIdentifier(PersonIdentifierType.scopus, 'x').getLabel(),
      ).toBe('Scopus')
    })
  })

  describe('getIcon', () => {
    it('returns expected icon paths', () => {
      expect(
        new PersonIdentifier(PersonIdentifierType.orcid, 'x').getIcon(),
      ).toBe('/icons/orcid.png')

      expect(
        new PersonIdentifier(PersonIdentifierType.idref, 'x').getIcon(),
      ).toBe('/icons/idref.png')

      expect(
        new PersonIdentifier(PersonIdentifierType.idhals, 'x').getIcon(),
      ).toBe('/icons/hal.png')

      expect(
        new PersonIdentifier(PersonIdentifierType.idhali, 'x').getIcon(),
      ).toBe('/icons/hal.png')

      expect(
        new PersonIdentifier(PersonIdentifierType.scopus, 'x').getIcon(),
      ).toBe('/icons/scopus.png')
    })
  })

  describe('getUrl', () => {
    it('builds IdRef URL', () => {
      const id = new PersonIdentifier(PersonIdentifierType.idref, '02725030X')
      expect(id.getUrl()).toBe('https://www.idref.fr/02725030X')
    })

    it('builds ORCID URL from plain id', () => {
      const id = new PersonIdentifier(
        PersonIdentifierType.orcid,
        '0009-0005-6080-0215',
      )
      expect(id.getUrl()).toBe('https://orcid.org/0009-0005-6080-0215')
    })

    it('builds ORCID URL from full URL value', () => {
      const id = new PersonIdentifier(
        PersonIdentifierType.orcid,
        'https://orcid.org/0009-0005-6080-0215',
      )
      expect(id.getUrl()).toBe('https://orcid.org/0009-0005-6080-0215')
    })

    it('builds AureHAL URL for ID_HAL_S with proper encoding', () => {
      const id = new PersonIdentifier(
        PersonIdentifierType.idhals,
        'violaine-sebillotte-cuchet',
      )
      expect(id.getUrl()).toBe(
        'https://aurehal.archives-ouvertes.fr/person/browse?critere=' +
          encodeURIComponent('idHal_s:"violaine-sebillotte-cuchet"'),
      )
    })

    it('builds AureHAL URL for ID_HAL_I with proper encoding', () => {
      const id = new PersonIdentifier(PersonIdentifierType.idhali, '12345')
      expect(id.getUrl()).toBe(
        'https://aurehal.archives-ouvertes.fr/person/browse?critere=' +
          encodeURIComponent('idHal_i:"12345"'),
      )
    })

    it('returns null for unsupported types', () => {
      expect(
        new PersonIdentifier(PersonIdentifierType.local, 'x').getUrl(),
      ).toBeNull()
      expect(
        new PersonIdentifier(PersonIdentifierType.eppn, 'x').getUrl(),
      ).toBeNull()
      expect(
        new PersonIdentifier(PersonIdentifierType.scopus, 'x').getUrl(),
      ).toBeNull()
    })
  })
  describe('fromDB', () => {
    it('creates a PersonIdentifier from DB fields (type, value)', () => {
      const dbIdentifier = {
        type: PersonIdentifierType.idref,
        value: ' 02725030X ',
        // DB-only fields omitted by signature:
        // id, personId, orcidIdentifier
      }

      const id = PersonIdentifier.fromDB(dbIdentifier)

      expect(id).toBeInstanceOf(PersonIdentifier)
      expect(id.type).toBe(PersonIdentifierType.idref)

      expect(id.value).toBe('02725030X')
    })
  })
})
