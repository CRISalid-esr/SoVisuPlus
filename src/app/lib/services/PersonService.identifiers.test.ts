import { PersonService } from '@/lib/services/PersonService'
import {
  idHalFormsToIdentifiers,
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import { ActionTargetType, ActionType } from '@/types/Action'
import { IdentifierConflictError } from '@/lib/daos/PersonDAO'

const mockCreateIdentifier = jest.fn()
const mockUpsertIdentifier = jest.fn()
const mockUpsertHalIdentifiers = jest.fn()
const mockUpsertOrcidExt = jest.fn()
const mockFindIdentifierValue = jest.fn()
const mockDeleteIdentifier = jest.fn()
const mockCreateAction = jest.fn()
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
      createIdentifier: mockCreateIdentifier,
      upsertIdentifier: mockUpsertIdentifier,
      upsertHalIdentifiers: mockUpsertHalIdentifiers,
      upsertOrcidIdentifierExtension: mockUpsertOrcidExt,
      findIdentifierValue: mockFindIdentifierValue,
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

jest.mock('@/lib/daos/ActionDAO', () => ({
  ActionDAO: jest.fn().mockImplementation(() => ({
    createAction: mockCreateAction,
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

describe('PersonService identifier operations', () => {
  let service: PersonService

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(false)
    service = new PersonService()
  })

  describe('addIdentifier (manual, non-authenticated)', () => {
    it('creates the identifier and records an ADD marked authenticated:false', async () => {
      mockCreateIdentifier.mockResolvedValue({ id: 1 })
      await service.addIdentifier(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idref, '123456789'),
      )

      expect(mockCreateIdentifier).toHaveBeenCalledTimes(1)
      expect(mockCreateAction).toHaveBeenCalledWith(
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
      )
    })

    it('rethrows IdentifierConflictError and records no action', async () => {
      mockCreateIdentifier.mockRejectedValue(new IdentifierConflictError())
      await expect(
        service.addIdentifier(
          'p1',
          new PersonIdentifier(PersonIdentifierType.idref, '123456789'),
        ),
      ).rejects.toBeInstanceOf(IdentifierConflictError)
      expect(mockCreateAction).not.toHaveBeenCalled()
    })

    it('does not look up AureHAL for a non-idHAL identifier', async () => {
      mockCreateIdentifier.mockResolvedValue({ id: 1 })
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
      mockCreateIdentifier.mockResolvedValue({ id: 1 })

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
      expect(mockCreateIdentifier).toHaveBeenCalledTimes(1)
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
      expect(mockCreateIdentifier).not.toHaveBeenCalled()
      expect(mockCreateAction).not.toHaveBeenCalled()
    })

    it('checks only the entered form when AureHAL does not know the idHAL', async () => {
      mockFindAuthorByIdHal.mockResolvedValue(null)
      mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(false)
      mockCreateIdentifier.mockResolvedValue({ id: 1 })

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
      expect(mockCreateIdentifier).toHaveBeenCalledTimes(1)
    })

    it('does not block the add and logs when AureHAL is down', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFindAuthorByIdHal.mockRejectedValue(new Error('HTTP 503'))
      mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(false)
      mockCreateIdentifier.mockResolvedValue({ id: 1 })

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
      expect(mockCreateIdentifier).toHaveBeenCalledTimes(1)
      errorSpy.mockRestore()
    })
  })

  describe('authenticateOrcidIdentifier', () => {
    const identifier = () =>
      new ORCIDIdentifier('0000-0002-1825-0097', orcidOauth())

    it('emits ADD (authenticated) when no ORCID existed', async () => {
      mockFindIdentifierValue.mockResolvedValue(null)
      mockUpsertIdentifier.mockResolvedValue({ id: 7 })

      await service.authenticateOrcidIdentifier('p1', identifier())

      expect(mockUpsertOrcidExt).toHaveBeenCalledWith(7, expect.anything())
      expect(mockCreateAction).toHaveBeenCalledWith(
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
      )
    })

    it('emits UPDATE (authenticated) when the ORCID already existed', async () => {
      mockFindIdentifierValue.mockResolvedValue('0000-0002-1825-0097')
      mockUpsertIdentifier.mockResolvedValue({ id: 7 })

      await service.authenticateOrcidIdentifier('p1', identifier())

      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ActionType.UPDATE }),
      )
    })
  })

  describe('authenticateOrcidIdentifier conflicts', () => {
    it('rethrows IdentifierConflictError and records no action', async () => {
      mockFindIdentifierValue.mockResolvedValue(null)
      mockUpsertIdentifier.mockRejectedValue(
        new IdentifierConflictError('used_by_another_person'),
      )

      await expect(
        service.authenticateOrcidIdentifier(
          'p1',
          new ORCIDIdentifier('0000-0002-1825-0097', orcidOauth()),
        ),
      ).rejects.toMatchObject({ reason: 'used_by_another_person' })
      expect(mockUpsertOrcidExt).not.toHaveBeenCalled()
      expect(mockCreateAction).not.toHaveBeenCalled()
    })
  })

  describe('authenticateHalIdentifier', () => {
    it('writes hal_login silently and emits a single ADD for the idHAL', async () => {
      mockFindIdentifierValue.mockResolvedValue(null)

      await service.authenticateHalIdentifier('p1', {
        type: PersonIdentifierType.idhals,
        value: 'john-doe',
        halLogin: 'jdoe',
        forms: { idhals: 'john-doe', idhali: '12345' },
      })

      // hal_login + idHAL upserted together
      expect(mockUpsertHalIdentifiers).toHaveBeenCalledWith(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe'),
        'jdoe',
      )
      // but only ONE outgoing message, for the idHAL (hal_login is silent)
      expect(mockCreateAction).toHaveBeenCalledTimes(1)
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: ActionType.ADD,
          parameters: {
            identifier: {
              type: 'idhals',
              value: 'john-doe',
              authenticated: true,
            },
          },
        }),
      )
    })

    it('emits UPDATE when the idHAL already existed', async () => {
      mockFindIdentifierValue.mockResolvedValue('john-doe')

      await service.authenticateHalIdentifier('p1', {
        type: PersonIdentifierType.idhals,
        value: 'john-doe',
        halLogin: 'jdoe',
        forms: { idhals: 'john-doe', idhali: '12345' },
      })

      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ActionType.UPDATE }),
      )
    })
  })

  describe('authenticateHalIdentifier conflicts', () => {
    it('rejects an idHAL held by another person and writes nothing', async () => {
      mockIsAnyIdentifierHeldByAnotherPerson.mockResolvedValue(true)

      const promise = service.authenticateHalIdentifier('p1', {
        type: PersonIdentifierType.idhals,
        value: 'john-doe',
        halLogin: 'jdoe',
        forms: { idhals: 'john-doe', idhali: '12345' },
      })

      await expect(promise).rejects.toMatchObject({
        reason: 'used_by_another_person',
      })
      expect(mockIsAnyIdentifierHeldByAnotherPerson).toHaveBeenCalledWith(
        'p1',
        idHalFormsToIdentifiers({
          idhals: 'john-doe',
          idhali: '12345',
        }),
      )
      expect(mockUpsertHalIdentifiers).not.toHaveBeenCalled()
      expect(mockCreateAction).not.toHaveBeenCalled()
    })
  })

  describe('removeIdentifier', () => {
    it('deletes and emits a REMOVE carrying type and value', async () => {
      mockFindIdentifierValue.mockResolvedValue('123456789')

      await service.removeIdentifier('p1', PersonIdentifierType.idref)

      expect(mockDeleteIdentifier).toHaveBeenCalledWith(
        'p1',
        PersonIdentifierType.idref,
      )
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: ActionType.REMOVE,
          parameters: { type: PersonIdentifierType.idref, value: '123456789' },
        }),
      )
    })
  })
})
