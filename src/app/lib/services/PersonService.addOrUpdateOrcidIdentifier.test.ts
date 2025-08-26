import { PersonService } from '@/lib/services/PersonService'

const mockFetchPeople = jest.fn()
const mockUpsertIdentifier = jest.fn()
const mockCreateAction = jest.fn()

jest.mock('@/lib/daos/PersonDAO', () => {
  return {
    PersonDAO: jest.fn().mockImplementation(() => ({
      fetchPeople: mockFetchPeople,
      upsertIdentifier: mockUpsertIdentifier,
    })),
  }
})

jest.mock('@/lib/daos/ActionDAO', () => {
  return {
    ActionDAO: jest.fn().mockImplementation(() => ({
      createAction: mockCreateAction,
    })),
  }
})

describe('PersonService.addOrUpdateOrcidIdentifier', () => {
  let service: PersonService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new PersonService()
  })

  it('should upsert an ORCID identifier and record an ADD action', async () => {
    const personUid = 'person-123'
    const orcid = '0000-0002-1825-0097'
    mockUpsertIdentifier.mockResolvedValue(undefined)
    mockCreateAction.mockResolvedValue(undefined)

    await service.addOrUpdateOrcidIdentifier(personUid, orcid)

    expect(mockUpsertIdentifier).toHaveBeenCalledTimes(1)
    expect(mockUpsertIdentifier).toHaveBeenCalledWith(
      { type: 'ORCID', value: orcid },
      personUid,
    )

    expect(mockCreateAction).toHaveBeenCalledTimes(1)
    expect(mockCreateAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: expect.anything(), // ActionType.ADD (enum value)
        targetType: expect.anything(), // ActionTargetType.PERSON (enum value)
        targetUid: personUid,
        path: 'identifiers',
        parameters: { identifier: { type: 'ORCID', value: orcid } },
        personUid,
      }),
    )
  })

  it('should throw a service error if upsertIdentifier fails', async () => {
    const personUid = 'person-123'
    const orcid = '0000-0002-1825-0097'
    mockUpsertIdentifier.mockRejectedValue(new Error('DB failure'))

    await expect(
      service.addOrUpdateOrcidIdentifier(personUid, orcid),
    ).rejects.toThrow(
      `Error adding/updating identifier (type=ORCID, value=${orcid}, personUid=${personUid}) in service`,
    )

    expect(mockCreateAction).not.toHaveBeenCalled()
  })
})
