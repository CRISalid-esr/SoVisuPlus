import { PersonService } from '@/lib/services/PersonService'
import {
  idHalFormsToIdentifiers,
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import { ActionTargetType, ActionType } from '@/types/Action'
import { IdentifierConflictError } from '@/lib/daos/PersonDAO'

const mockCreateIdentifiers = jest.fn()
const mockUpsertHalIdentifiers = jest.fn()
const mockUpsertAuthenticatedOrcid = jest.fn()
const mockFindIdentifierValue = jest.fn()
const mockFindIdentifiers = jest.fn()
const mockDeleteIdentifier = jest.fn()
const mockIsAnyIdentifierHeldByAnotherPerson = jest.fn()
const mockFindAuthorByIdHal = jest.fn()

jest.mock('@/lib/daos/PersonDAO', () => {
  class IdentifierConflictError extends Error {
    constructor(
      public readonly reason = 'slot_taken',
      message = 'Identifier already exists',
    ) {
      super(message)
      this.name = 'IdentifierConflictError'
    }
  }
  return {
    IdentifierConflictError,
    PersonDAO: jest.fn().mockImplementation(() => ({
      createIdentifiers: mockCreateIdentifiers,
      upsertHalIdentifiers: mockUpsertHalIdentifiers,
      upsertAuthenticatedOrcidIdentifier: mockUpsertAuthenticatedOrcid,
      findIdentifierValue: mockFindIdentifierValue,
      findIdentifiers: mockFindIdentifiers,
      deleteIdentifier: mockDeleteIdentifier,
      isAnyIdentifierHeldByAnotherPerson:
        mockIsAnyIdentifierHeldByAnotherPerson,
    })),
  }
})

jest.mock('@/lib/services/AureHalAPIClient', () => ({
  ...jest.requireActual('@/lib/services/AureHalAPIClient'),
  AureHalAPIClient: jest.fn().mockImplementation(() => ({
    findAuthorByIdHal: mockFindAuthorByIdHal,
  })),
}))

const orcidOauth = () => ({
  accessToken: 'a',
  refreshToken: 'r',
  tokenType: 'bearer',
  scope: ['/authenticate' as const],
  obtainedAt: new Date('2026-01-01'),
  expiresAt: new Date('2026-06-01'),
})

/** [actionType, parameters] of the actions passed to a DAO write. */
const actionsOf = (mock: jest.Mock, argIndex: number) =>
  (
    mock.mock.calls[0][argIndex] as {
      actionType: string
      parameters: unknown
    }[]
  ).map((action) => [action.actionType, action.parameters])

describe('PersonService identifier operations', () => {
  let service: PersonService

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(false)
    service = new PersonService()
  })

  describe('addIdentifier (manual, non-authenticated)', () => {
    it('creates the identifier and records an ADD marked authenticated:false', async () => {
      mockCreateIdentifiers.mockResolvedValue(undefined)
      await service.addIdentifier(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idref, '123456789'),
      )

      // The ADD is recorded in the same transaction as the identifier
      expect(mockCreateIdentifiers).toHaveBeenCalledWith(
        [new PersonIdentifier(PersonIdentifierType.idref, '123456789', true)],
        'p1',
        [
          expect.objectContaining({
            actionType: ActionType.ADD,
            targetType: ActionTargetType.PERSON,
            path: 'identifiers',
            personUid: 'p1',
            parameters: {
              identifier: {
                type: 'idref',
                value: '123456789',
                authenticated: false,
              },
            },
          }),
        ],
      )
    })

    it('rethrows IdentifierConflictError and records no action', async () => {
      mockCreateIdentifiers.mockRejectedValue(new IdentifierConflictError())
      await expect(
        service.addIdentifier(
          'p1',
          new PersonIdentifier(PersonIdentifierType.idref, '123456789'),
        ),
      ).rejects.toBeInstanceOf(IdentifierConflictError)
    })

    it('does not look up AureHAL for a non-idHAL identifier', async () => {
      mockCreateIdentifiers.mockResolvedValue(undefined)
      await service.addIdentifier(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idref, '123456789'),
      )
      expect(mockFindAuthorByIdHal).not.toHaveBeenCalled()
      expect(mockIsAnyIdentifierHeldByAnotherPerson).not.toHaveBeenCalled()
    })

    it('checks both idHAL forms of the HAL account', async () => {
      mockFindAuthorByIdHal.mockResolvedValue({
        fullName_s: 'John Doe',
        idHal_s: 'john-doe',
        idHal_i: 12345,
      })
      mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(false)
      mockCreateIdentifiers.mockResolvedValue(undefined)

      await service.addIdentifier(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idhali, '12345'),
      )

      expect(mockFindAuthorByIdHal).toHaveBeenCalledWith('12345', 'idhali')
      expect(mockIsAnyIdentifierHeldByAnotherPerson).toHaveBeenCalledWith(
        'p1',
        idHalFormsToIdentifiers({
          idhals: 'john-doe',
          idhali: '12345',
        }),
      )
    })

    it('stores every idHAL form of the HAL account and records one ADD per form', async () => {
      mockFindAuthorByIdHal.mockResolvedValue({
        fullName_s: 'John Doe',
        idHal_s: 'john-doe',
        idHal_i: 12345,
      })
      mockCreateIdentifiers.mockResolvedValue(undefined)

      await service.addIdentifier(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe'),
      )

      expect(mockCreateIdentifiers).toHaveBeenCalledWith(
        [
          new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe', true),
          new PersonIdentifier(PersonIdentifierType.idhali, '12345', true),
        ],
        'p1',
        expect.any(Array),
      )
      expect(actionsOf(mockCreateIdentifiers, 2)).toEqual([
        [
          ActionType.ADD,
          {
            identifier: {
              type: 'idhals',
              value: 'john-doe',
              authenticated: false,
            },
          },
        ],
        [
          ActionType.ADD,
          {
            identifier: {
              type: 'idhali',
              value: '12345',
              authenticated: false,
            },
          },
        ],
      ])
    })

    it('rejects an idHAL whose other form belongs to another person', async () => {
      mockFindAuthorByIdHal.mockResolvedValue({
        fullName_s: 'John Doe',
        idHal_s: 'john-doe',
        idHal_i: 12345,
      })
      mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(true)

      const promise = service.addIdentifier(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idhali, '12345'),
      )

      await expect(promise).rejects.toBeInstanceOf(IdentifierConflictError)
      await expect(promise).rejects.toMatchObject({
        reason: 'used_by_another_person',
      })
      expect(mockCreateIdentifiers).not.toHaveBeenCalled()
    })

    it('checks only the entered form when AureHAL does not know the idHAL', async () => {
      mockFindAuthorByIdHal.mockResolvedValue(null)
      mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(false)
      mockCreateIdentifiers.mockResolvedValue(undefined)

      await service.addIdentifier(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe'),
      )

      expect(mockIsAnyIdentifierHeldByAnotherPerson).toHaveBeenCalledWith(
        'p1',
        idHalFormsToIdentifiers({
          idhals: 'john-doe',
        }),
      )
      expect(mockCreateIdentifiers).toHaveBeenCalledWith(
        [new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe', true)],
        'p1',
        expect.any(Array),
      )
    })

    it('does not block the add and logs when AureHAL is down', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFindAuthorByIdHal.mockRejectedValue(new Error('HTTP 503'))
      mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(false)
      mockCreateIdentifiers.mockResolvedValue(undefined)

      await service.addIdentifier(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe'),
      )

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AureHAL] lookup failed'),
        expect.any(Error),
      )
      expect(mockIsAnyIdentifierHeldByAnotherPerson).toHaveBeenCalledWith(
        'p1',
        idHalFormsToIdentifiers({
          idhals: 'john-doe',
        }),
      )
      expect(mockCreateIdentifiers).toHaveBeenCalledWith(
        [new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe', true)],
        'p1',
        expect.any(Array),
      )
      errorSpy.mockRestore()
    })
  })

  describe('authenticateOrcidIdentifier', () => {
    const identifier = () =>
      new ORCIDIdentifier('0000-0002-1825-0097', orcidOauth())

    it('records an ADD (authenticated) in the same transaction when no ORCID existed', async () => {
      mockFindIdentifierValue.mockResolvedValue(null)

      await service.authenticateOrcidIdentifier('p1', identifier())

      expect(mockUpsertAuthenticatedOrcid).toHaveBeenCalledWith(
        'p1',
        identifier(),
        [
          expect.objectContaining({
            actionType: ActionType.ADD,
            parameters: {
              identifier: {
                type: 'orcid',
                value: '0000-0002-1825-0097',
                authenticated: true,
              },
            },
          }),
        ],
      )
    })

    it('records an UPDATE (authenticated) when the ORCID already existed', async () => {
      mockFindIdentifierValue.mockResolvedValue('0000-0002-1825-0097')

      await service.authenticateOrcidIdentifier('p1', identifier())

      expect(actionsOf(mockUpsertAuthenticatedOrcid, 2)).toEqual([
        [ActionType.UPDATE, expect.anything()],
      ])
    })
  })

  describe('authenticateOrcidIdentifier conflicts', () => {
    it('rethrows IdentifierConflictError', async () => {
      mockFindIdentifierValue.mockResolvedValue(null)
      mockUpsertAuthenticatedOrcid.mockRejectedValue(
        new IdentifierConflictError('used_by_another_person'),
      )

      await expect(
        service.authenticateOrcidIdentifier(
          'p1',
          new ORCIDIdentifier('0000-0002-1825-0097', orcidOauth()),
        ),
      ).rejects.toMatchObject({ reason: 'used_by_another_person' })
    })
  })

  describe('authenticateHalIdentifier', () => {
    it('writes hal_login silently and records one ADD per idHAL form in the same transaction', async () => {
      mockFindIdentifiers.mockResolvedValue([])

      await service.authenticateHalIdentifier('p1', {
        halLogin: 'jdoe',
        forms: { idhals: 'john-doe', idhali: '12345' },
      })

      // hal_login + both idHAL forms upserted together, with their actions
      expect(mockUpsertHalIdentifiers).toHaveBeenCalledWith(
        'p1',
        [
          new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe'),
          new PersonIdentifier(PersonIdentifierType.idhali, '12345'),
        ],
        'jdoe',
        expect.any(Array),
      )
      // one outgoing message per idHAL form (hal_login is silent)
      expect(actionsOf(mockUpsertHalIdentifiers, 3)).toEqual([
        [
          ActionType.ADD,
          {
            identifier: {
              type: 'idhals',
              value: 'john-doe',
              authenticated: true,
            },
          },
        ],
        [
          ActionType.ADD,
          {
            identifier: { type: 'idhali', value: '12345', authenticated: true },
          },
        ],
      ])
    })

    it('records UPDATE for the stored form and ADD for the missing one', async () => {
      mockFindIdentifiers.mockResolvedValue([
        new PersonIdentifier(PersonIdentifierType.idhali, '12345'),
      ])

      await service.authenticateHalIdentifier('p1', {
        halLogin: 'jdoe',
        forms: { idhals: 'john-doe', idhali: '12345' },
      })

      expect(actionsOf(mockUpsertHalIdentifiers, 3)).toEqual([
        [
          ActionType.ADD,
          {
            identifier: {
              type: 'idhals',
              value: 'john-doe',
              authenticated: true,
            },
          },
        ],
        [
          ActionType.UPDATE,
          {
            identifier: { type: 'idhali', value: '12345', authenticated: true },
          },
        ],
      ])
    })

    it('stores only the form the HAL account has', async () => {
      mockFindIdentifiers.mockResolvedValue([])

      await service.authenticateHalIdentifier('p1', {
        halLogin: 'jdoe',
        forms: { idhali: '12345' },
      })

      expect(mockUpsertHalIdentifiers).toHaveBeenCalledWith(
        'p1',
        [new PersonIdentifier(PersonIdentifierType.idhali, '12345')],
        'jdoe',
        expect.any(Array),
      )
      expect(actionsOf(mockUpsertHalIdentifiers, 3)).toHaveLength(1)
    })
  })

  describe('authenticateHalIdentifier conflicts', () => {
    it('rejects an idHAL held by another person and writes nothing', async () => {
      mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(true)

      const promise = service.authenticateHalIdentifier('p1', {
        halLogin: 'jdoe',
        forms: { idhals: 'john-doe', idhali: '12345' },
      })

      await expect(promise).rejects.toMatchObject({
        reason: 'used_by_another_person',
      })
      // Both idHAL forms and the HAL login are checked
      expect(mockIsAnyIdentifierHeldByAnotherPerson).toHaveBeenCalledWith(
        'p1',
        [
          ...idHalFormsToIdentifiers({
            idhals: 'john-doe',
            idhali: '12345',
          }),
          new PersonIdentifier(PersonIdentifierType.hal_login, 'jdoe'),
        ],
      )
      expect(mockUpsertHalIdentifiers).not.toHaveBeenCalled()
    })
  })

  describe('removeIdentifier', () => {
    it('records no REMOVE when nothing is stored', async () => {
      mockFindIdentifiers.mockResolvedValue([])

      await service.removeIdentifier('p1', PersonIdentifierType.idref)

      expect(mockDeleteIdentifier).toHaveBeenCalledWith(
        'p1',
        PersonIdentifierType.idref,
        [],
      )
    })

    it('deletes and records a REMOVE carrying type and value in the same transaction', async () => {
      mockFindIdentifiers.mockResolvedValue([
        new PersonIdentifier(PersonIdentifierType.idref, '123456789'),
      ])

      await service.removeIdentifier('p1', PersonIdentifierType.idref)

      expect(mockFindIdentifiers).toHaveBeenCalledWith('p1', [
        PersonIdentifierType.idref,
      ])
      expect(actionsOf(mockDeleteIdentifier, 2)).toEqual([
        [ActionType.REMOVE, { type: 'idref', value: '123456789' }],
      ])
    })

    it('removes both idHAL forms with one REMOVE per stored form', async () => {
      mockFindIdentifiers.mockResolvedValue([
        new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe'),
        new PersonIdentifier(PersonIdentifierType.idhali, '12345'),
      ])

      await service.removeIdentifier('p1', PersonIdentifierType.idhals)

      expect(mockFindIdentifiers).toHaveBeenCalledWith('p1', [
        PersonIdentifierType.idhals,
        PersonIdentifierType.idhali,
      ])
      expect(actionsOf(mockDeleteIdentifier, 2)).toEqual([
        [ActionType.REMOVE, { type: 'idhals', value: 'john-doe' }],
        [ActionType.REMOVE, { type: 'idhali', value: '12345' }],
      ])
    })
  })
})
