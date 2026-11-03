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
      createIdentifiers: mockCreateIdentifiers,
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
      mockCreateIdentifiers.mockResolvedValue(undefined)
      await service.addIdentifier(
        'p1',
        new PersonIdentifier(PersonIdentifierType.idref, '123456789'),
      )

      expect(mockCreateIdentifiers).toHaveBeenCalledTimes(1)
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
      mockCreateIdentifiers.mockRejectedValue(new IdentifierConflictError())
      await expect(
        service.addIdentifier(
          'p1',
          new PersonIdentifier(PersonIdentifierType.idref, '123456789'),
        ),
      ).rejects.toBeInstanceOf(IdentifierConflictError)
      expect(mockCreateAction).not.toHaveBeenCalled()
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
      )
      expect(
        mockCreateAction.mock.calls.map(([action]) => [
          action.actionType,
          action.parameters,
        ]),
      ).toEqual([
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
      expect(mockCreateAction).not.toHaveBeenCalled()
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
      )
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
    it('writes hal_login silently and emits one ADD per idHAL form', async () => {
      mockFindIdentifierValue.mockResolvedValue(null)

      await service.authenticateHalIdentifier('p1', {
        halLogin: 'jdoe',
        forms: { idhals: 'john-doe', idhali: '12345' },
      })

      // hal_login + both idHAL forms upserted together
      expect(mockUpsertHalIdentifiers).toHaveBeenCalledWith(
        'p1',
        [
          new PersonIdentifier(PersonIdentifierType.idhals, 'john-doe'),
          new PersonIdentifier(PersonIdentifierType.idhali, '12345'),
        ],
        'jdoe',
      )
      // one outgoing message per idHAL form (hal_login is silent)
      expect(mockCreateAction).toHaveBeenCalledTimes(2)
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
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: ActionType.ADD,
          parameters: {
            identifier: {
              type: 'idhali',
              value: '12345',
              authenticated: true,
            },
          },
        }),
      )
    })

    it('emits UPDATE for the stored form and ADD for the missing one', async () => {
      mockFindIdentifierValue.mockImplementation(
        async (_uid: string, type: PersonIdentifierType) =>
          type === PersonIdentifierType.idhali ? '12345' : null,
      )

      await service.authenticateHalIdentifier('p1', {
        halLogin: 'jdoe',
        forms: { idhals: 'john-doe', idhali: '12345' },
      })

      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: ActionType.UPDATE,
          parameters: {
            identifier: { type: 'idhali', value: '12345', authenticated: true },
          },
        }),
      )
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

    it('stores only the form the HAL account has', async () => {
      mockFindIdentifierValue.mockResolvedValue(null)

      await service.authenticateHalIdentifier('p1', {
        halLogin: 'jdoe',
        forms: { idhali: '12345' },
      })

      expect(mockUpsertHalIdentifiers).toHaveBeenCalledWith(
        'p1',
        [new PersonIdentifier(PersonIdentifierType.idhali, '12345')],
        'jdoe',
      )
      expect(mockCreateAction).toHaveBeenCalledTimes(1)
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
      expect(mockCreateAction).not.toHaveBeenCalled()
    })
  })

  describe('removeIdentifier', () => {
    it('emits no REMOVE when nothing is stored', async () => {
      mockFindIdentifierValue.mockResolvedValue(null)

      await service.removeIdentifier('p1', PersonIdentifierType.idref)

      expect(mockDeleteIdentifier).toHaveBeenCalled()
      expect(mockCreateAction).not.toHaveBeenCalled()
    })

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

    it('removes both idHAL forms with one REMOVE per stored form', async () => {
      mockFindIdentifierValue.mockImplementation(
        async (_uid: string, type: PersonIdentifierType) =>
          type === PersonIdentifierType.idhals ? 'john-doe' : '12345',
      )

      await service.removeIdentifier('p1', PersonIdentifierType.idhals)

      expect(mockDeleteIdentifier).toHaveBeenCalledWith(
        'p1',
        PersonIdentifierType.idhals,
      )
      expect(
        mockCreateAction.mock.calls.map(([action]) => [
          action.actionType,
          action.parameters,
        ]),
      ).toEqual([
        [ActionType.REMOVE, { type: 'idhals', value: 'john-doe' }],
        [ActionType.REMOVE, { type: 'idhali', value: '12345' }],
      ])
    })

    it('emits no REMOVE for an idHAL form that is not stored', async () => {
      mockFindIdentifierValue.mockImplementation(
        async (_uid: string, type: PersonIdentifierType) =>
          type === PersonIdentifierType.idhali ? '12345' : null,
      )

      await service.removeIdentifier('p1', PersonIdentifierType.idhali)

      expect(mockCreateAction).toHaveBeenCalledTimes(1)
      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: ActionType.REMOVE,
          parameters: { type: 'idhali', value: '12345' },
        }),
      )
    })
  })
})
