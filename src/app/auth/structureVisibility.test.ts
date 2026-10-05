const mockFetchVisibilityState = jest.fn()

jest.mock('@/lib/services/OrganizationUnitService', () => ({
  OrganizationUnitService: jest.fn().mockImplementation(() => ({
    fetchVisibilityState: mockFetchVisibilityState,
  })),
}))

import { isHiddenPerspective } from '@/app/auth/structureVisibility'

describe('isHiddenPerspective', () => {
  beforeEach(() => {
    mockFetchVisibilityState.mockReset()
  })

  it('never treats a person as hidden', async () => {
    expect(await isHiddenPerspective('person-1', 'person')).toBe(false)
    expect(mockFetchVisibilityState).not.toHaveBeenCalled()
  })

  it('is true for an effectively hidden structure', async () => {
    mockFetchVisibilityState.mockResolvedValue({
      uid: 'ru1',
      hidden: false,
      hiddenEffective: true,
    })

    expect(await isHiddenPerspective('ru1', 'research_unit')).toBe(true)
  })

  it('is false for a visible or unknown structure', async () => {
    mockFetchVisibilityState.mockResolvedValueOnce({
      uid: 'ru1',
      hidden: false,
      hiddenEffective: false,
    })
    mockFetchVisibilityState.mockResolvedValueOnce(null)

    expect(await isHiddenPerspective('ru1', 'research_unit')).toBe(false)
    expect(await isHiddenPerspective('nope', 'research_unit')).toBe(false)
  })
})
