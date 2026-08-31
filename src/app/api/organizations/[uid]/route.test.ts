/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('@/app/auth/ability', () => ({ hasUnscopedPermission: jest.fn() }))
jest.mock('@/lib/services/OrganizationUnitService')

import { getServerSession } from 'next-auth'
import { hasUnscopedPermission } from '@/app/auth/ability'
import { OrganizationUnitService } from '@/lib/services/OrganizationUnitService'
import { PATCH } from './route'

const mockGetServerSession = getServerSession as jest.Mock
const mockHasUnscopedPermission = hasUnscopedPermission as jest.Mock
const MockService = OrganizationUnitService as unknown as jest.Mock

const setHidden = jest.fn()

const request = (body: unknown) =>
  ({ json: async () => body }) as unknown as Request

const context = (uid = 'local-lab') => ({ params: Promise.resolve({ uid }) })

describe('PATCH /api/organizations/[uid]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    MockService.mockImplementation(() => ({ setHidden }))
    mockGetServerSession.mockResolvedValue({ user: { username: 'jdupont' } })
    mockHasUnscopedPermission.mockReturnValue(true)
    setHidden.mockResolvedValue({
      uid: 'local-lab',
      hidden: true,
      hiddenEffective: true,
    })
  })

  it('hides the structure and returns the resulting flags', async () => {
    const response = await PATCH(request({ hidden: true }), context())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      uid: 'local-lab',
      hidden: true,
      hiddenEffective: true,
    })
    expect(setHidden).toHaveBeenCalledWith('local-lab', true)
  })

  it('rejects an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await PATCH(request({ hidden: true }), context())

    expect(response.status).toBe(401)
    expect(setHidden).not.toHaveBeenCalled()
  })

  it('rejects a caller without the structure_manager permission', async () => {
    mockHasUnscopedPermission.mockReturnValue(false)

    const response = await PATCH(request({ hidden: true }), context())

    expect(response.status).toBe(403)
    expect(setHidden).not.toHaveBeenCalled()
  })

  it('rejects a non-boolean hidden value', async () => {
    const response = await PATCH(request({ hidden: 'yes' }), context())

    expect(response.status).toBe(400)
    expect(setHidden).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown structure', async () => {
    setHidden.mockResolvedValue(null)

    const response = await PATCH(request({ hidden: false }), context('nope'))

    expect(response.status).toBe(404)
  })
})
