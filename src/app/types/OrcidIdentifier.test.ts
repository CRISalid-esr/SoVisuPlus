import { describe, expect, it, jest } from '@jest/globals'
import { ORCIDIdentifier, OrcidScope } from '@/types/OrcidIdentifier'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

describe('ORCIDIdentifier', () => {
  describe('normalize', () => {
    it('keeps plain ORCID unchanged', () => {
      expect(ORCIDIdentifier.normalize('0000-0001-7990-9804')).toBe(
        '0000-0001-7990-9804',
      )
    })

    it('strips leading https://orcid.org/', () => {
      expect(
        ORCIDIdentifier.normalize('https://orcid.org/0000-0001-7990-9804'),
      ).toBe('0000-0001-7990-9804')
    })

    it('strips leading http://orcid.org/ (case-insensitive)', () => {
      expect(
        ORCIDIdentifier.normalize('http://ORCID.org/0000-0001-7990-9804'),
      ).toBe('0000-0001-7990-9804')
    })
  })

  describe('isOrcidScope', () => {
    it('returns true for known scopes', () => {
      expect(ORCIDIdentifier.isOrcidScope('/read-limited')).toBe(true)
      expect(ORCIDIdentifier.isOrcidScope('/person/update')).toBe(true)
      expect(ORCIDIdentifier.isOrcidScope('/activities/update')).toBe(true)
      expect(ORCIDIdentifier.isOrcidScope('/authenticate')).toBe(true)
    })

    it('returns false for unknown scopes', () => {
      expect(ORCIDIdentifier.isOrcidScope('/unknown')).toBe(false)
      expect(ORCIDIdentifier.isOrcidScope('read-limited')).toBe(false)
    })
  })

  describe('parseOrcidScope', () => {
    it('splits by whitespace and keeps only valid scopes', () => {
      const scopes = ORCIDIdentifier.parseOrcidScope(
        '/authenticate /read-limited /activities/update',
      )
      expect(scopes).toEqual([
        '/authenticate',
        '/read-limited',
        '/activities/update',
      ])
    })

    it('warns and drops unknown scopes', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

      const scopes = ORCIDIdentifier.parseOrcidScope(
        '/read-limited /mystery/scope /person/update',
      )

      expect(scopes).toEqual(['/read-limited', '/person/update'])
      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })

    it('returns empty list when scope string is blank', () => {
      expect(ORCIDIdentifier.parseOrcidScope('   ')).toEqual([])
    })
  })

  describe('type guards', () => {
    it('isOrcidIdentifierJson returns true when type=ORCID and oauth is non-null', () => {
      const json = {
        type: PersonIdentifierType.ORCID,
        value: '0000-0001-7990-9804',
        oauth: {
          scope: ['/read-limited'] as OrcidScope[],
          tokenType: 'bearer',
          obtainedAt: '2026-02-01T12:34:28.632Z',
          expiresAt: '2027-02-01T12:34:28.632Z',
          createdAt: '2026-02-01T12:34:28.632Z',
          updatedAt: '2026-02-01T12:34:28.632Z',
        },
      }

      expect(ORCIDIdentifier.isOrcidIdentifierJson(json)).toBe(true)
    })

    it('isOrcidIdentifierJson returns false when oauth is missing or null', () => {
      const jsonMissingOauth = {
        type: PersonIdentifierType.ORCID,
        value: '0000-0001-7990-9804',
      }
      const jsonNullOauth = {
        type: PersonIdentifierType.ORCID,
        value: '0000-0001-7990-9804',
        oauth: null,
      }

      expect(ORCIDIdentifier.isOrcidIdentifierJson(jsonMissingOauth)).toBe(
        false,
      )
      expect(ORCIDIdentifier.isOrcidIdentifierJson(jsonNullOauth)).toBe(false)
    })
  })

  describe('fromJson', () => {
    it('builds ORCIDIdentifier with oauth populated and dates converted', () => {
      const id = ORCIDIdentifier.fromJson({
        type: PersonIdentifierType.ORCID,
        value: '0000-0001-7990-9804',
        oauth: {
          scope: ['/read-limited', '/authenticate'],
          tokenType: 'bearer',
          obtainedAt: '2026-02-01T12:34:28.632Z',
          expiresAt: '2027-02-01T12:34:28.632Z',
          createdAt: '2026-02-01T12:34:28.632Z',
          updatedAt: '2026-02-01T12:34:28.632Z',
        },
      })

      expect(id.type).toBe(PersonIdentifierType.ORCID)
      expect(id.value).toBe('0000-0001-7990-9804')

      expect(id.oauth).toBeTruthy()
      expect(id.oauth?.tokenType).toBe('bearer')
      expect(id.oauth?.scope).toEqual(['/read-limited', '/authenticate'])

      expect(id.oauth?.obtainedAt).toBeInstanceOf(Date)
      expect(id.oauth?.expiresAt).toBeInstanceOf(Date)
      expect(id.oauth?.createdAt).toBeInstanceOf(Date)
      expect(id.oauth?.updatedAt).toBeInstanceOf(Date)
    })

    it('throws if called with non-ORCID type', () => {
      expect(() =>
        ORCIDIdentifier.fromJson({
          type: PersonIdentifierType.IDREF,
          value: '02725030X',
          oauth: null,
        }),
      ).toThrow(/ORCIDIdentifier\.fromJson called with type=/)
    })
  })

  describe('fromDB', () => {
    it('builds ORCIDIdentifier from DB identifier + orcidIdentifier relation', () => {
      const db = {
        type: PersonIdentifierType.ORCID,
        value: '0000-0001-7990-9804',
        orcidIdentifier: {
          id: 1,
          scope: '/authenticate /read-limited',
          tokenType: 'bearer',
          obtainedAt: new Date('2026-02-01T12:34:28.632Z'),
          expiresAt: new Date('2027-02-01T12:34:28.632Z'),
          createdAt: new Date('2026-02-01T12:34:28.632Z'),
          updatedAt: new Date('2026-02-01T12:34:28.632Z'),
        },
      }

      const id = ORCIDIdentifier.fromDB(db)

      expect(id.type).toBe(PersonIdentifierType.ORCID)
      expect(id.value).toBe('0000-0001-7990-9804')

      expect(id.oauth).toBeTruthy()
      expect(id.oauth?.tokenType).toBe('bearer')
      expect(id.oauth?.scope).toEqual(['/authenticate', '/read-limited'])
      expect(id.oauth?.obtainedAt.toISOString()).toBe(
        '2026-02-01T12:34:28.632Z',
      )
    })

    it('throws if called with non-ORCID type', () => {
      expect(() =>
        ORCIDIdentifier.fromDB({
          type: PersonIdentifierType.IDREF,
          value: '02725030X',
          orcidIdentifier: null,
        }),
      ).toThrow(/fromDB called with type=/)
    })

    it('throws if ORCID db identifier has no orcidIdentifier relation', () => {
      expect(() =>
        ORCIDIdentifier.fromDB({
          type: PersonIdentifierType.ORCID,
          value: '0000-0001-7990-9804',
          orcidIdentifier: null,
        }),
      ).toThrow(/no orcidIdentifier data present/)
    })
  })
})
