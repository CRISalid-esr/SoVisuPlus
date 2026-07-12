import { PersonService } from '@/lib/services/PersonService'
import {
  PersonIdentifier,
  PersonIdentifierType,
} from '@/types/PersonIdentifier'
import { ORCIDIdentifier } from '@/types/OrcidIdentifier'
import { ActionTargetType, ActionType } from '@/types/Action'
import { IdentifierConflictError } from '@/lib/daos/PersonDAO'

const mockCreateIdentifier = jest.fn()
const mockUpsertIdentifier = jest.fn()
const mockUpsertOrcidExt = jest.fn()
const mockFindIdentifierValue = jest.fn()
const mockDeleteIdentifier = jest.fn()
const mockCreateAction = jest.fn()

jest.mock('@/lib/daos/PersonDAO', () => {
  class IdentifierConflictError extends Error {
    constructor(message = 'Identifier already exists') {
      super(message)
      this.name = 'IdentifierConflictError'
    }
  }
  return {
    IdentifierConflictError,
    PersonDAO: jest.fn().mockImplementation(() => ({
      createIdentifier: mockCreateIdentifier,
      upsertIdentifier: mockUpsertIdentifier,
      upsertOrcidIdentifierExtension: mockUpsertOrcidExt,
      findIdentifierValue: mockFindIdentifierValue,
      deleteIdentifier: mockDeleteIdentifier,
    })),
  }
})

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

  describe('authenticateHalIdentifier', () => {
    it('writes hal_login silently and emits a single ADD for the idHAL', async () => {
      mockFindIdentifierValue.mockResolvedValue(null)
      mockUpsertIdentifier.mockResolvedValue({ id: 1 })

      await service.authenticateHalIdentifier('p1', {
        type: PersonIdentifierType.idhals,
        value: 'john-doe',
        halLogin: 'jdoe',
      })

      // hal_login + idHAL upserted
      expect(mockUpsertIdentifier).toHaveBeenCalledTimes(2)
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
      mockUpsertIdentifier.mockResolvedValue({ id: 1 })

      await service.authenticateHalIdentifier('p1', {
        type: PersonIdentifierType.idhals,
        value: 'john-doe',
        halLogin: 'jdoe',
      })

      expect(mockCreateAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ActionType.UPDATE }),
      )
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
