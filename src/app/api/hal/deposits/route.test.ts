/**
 * @jest-environment node
 *
 * Focuses on the route mechanics that are new ground in this codebase: multipart `formData()`
 * parsing, writing uploaded `File`s to disk, and the create/attach/rollback flow. Auth, ability
 * and the service layer are mocked so this is a fast unit test (no DB).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/auth/auth_options', () => ({ __esModule: true, default: {} }))
jest.mock('@/app/auth/ability')
jest.mock('@/lib/services/hal/validateDepositEligibility')
jest.mock('@/lib/services/DocumentService')

import { getServerSession } from 'next-auth'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { validateDepositEligibility } from '@/lib/services/hal/validateDepositEligibility'
import { DocumentService } from '@/lib/services/DocumentService'
import { POST } from './route'

const mockGetServerSession = getServerSession as jest.Mock
const mockAbilityFrom = abilityFromAuthzContext as jest.Mock
const mockValidate = validateDepositEligibility as jest.Mock
const MockDocumentService = DocumentService as unknown as jest.Mock

const can = jest.fn()
const service = {
  getPersonByUid: jest.fn(),
  fetchDocumentById: jest.fn(),
  createHalDeposit: jest.fn(),
  attachDepositFiles: jest.fn(),
  deleteHalDeposit: jest.fn(),
}

let root: string

const basePayload = {
  documentUid: 'doc-1',
  personUid: 'person-1',
  halDocumentType: 'ART',
  halDomains: ['shs.hisphilso'],
  language: 'en',
  files: [] as unknown[],
}

const buildRequest = (payload: unknown, file?: File) => {
  const form = new FormData()
  form.set('payload', JSON.stringify(payload))
  if (file) form.set('file0', file)
  return new Request('http://localhost/api/hal/deposits', {
    method: 'POST',
    body: form,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'hal-route-'))
  process.env.HAL_UPLOADS_ROOT = root

  mockGetServerSession.mockResolvedValue({ user: { username: 'u', authz: {} } })
  mockAbilityFrom.mockReturnValue({ can })
  can.mockReturnValue(true)
  mockValidate.mockReturnValue({ ok: true })
  MockDocumentService.mockImplementation(() => service)
  service.getPersonByUid.mockResolvedValue({ uid: 'person-1' })
  service.fetchDocumentById.mockResolvedValue({ uid: 'doc-1' })
  service.createHalDeposit.mockResolvedValue({ id: 42 })
  service.attachDepositFiles.mockResolvedValue({ toJson: () => ({ id: 42 }) })
  service.deleteHalDeposit.mockResolvedValue(undefined)
})

afterEach(() => {
  delete process.env.HAL_UPLOADS_ROOT
  fs.rmSync(root, { recursive: true, force: true })
})

describe('POST /api/hal/deposits', () => {
  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await POST(buildRequest(basePayload))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the user has neither deposit_hal nor deposit_hal_unauthenticated', async () => {
    can.mockReturnValue(false)
    const res = await POST(buildRequest(basePayload))
    expect(res.status).toBe(403)
    expect(service.createHalDeposit).not.toHaveBeenCalled()
  })

  it('allows the deposit via deposit_hal_unauthenticated and passes the waiver to eligibility', async () => {
    can.mockImplementation(
      (action: string) => action === 'deposit_hal_unauthenticated',
    )
    const res = await POST(buildRequest(basePayload))
    expect(res.status).not.toBe(403)
    expect(mockValidate).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'ART',
      expect.objectContaining({ allowUnauthenticated: true }),
    )
  })

  it('returns 400 with the reason when the document is ineligible', async () => {
    mockValidate.mockReturnValue({ ok: false, reason: 'missing_journal' })
    const res = await POST(buildRequest(basePayload))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ reason: 'missing_journal' })
  })

  it('creates the deposit, writes the uploaded file and records it (201)', async () => {
    const file = new File([Buffer.from('PDF')], 'doc.pdf', {
      type: 'application/pdf',
    })
    const payload = {
      ...basePayload,
      files: [
        {
          field: 'file0',
          isMain: true,
          fileSource: 'author',
          fileType: 'file',
          visibility: 'now',
          license: 'cc-by',
        },
      ],
    }

    const res = await POST(buildRequest(payload, file))

    expect(res.status).toBe(201)
    const onDisk = path.join(root, 'hal-files', '42', 'doc.pdf')
    expect(fs.existsSync(onDisk)).toBe(true)
    expect(fs.readFileSync(onDisk, 'utf-8')).toBe('PDF')
    expect(service.attachDepositFiles).toHaveBeenCalledWith(42, [
      expect.objectContaining({
        fileName: 'doc.pdf',
        isMain: true,
        fileSource: 'author',
        fileType: 'file',
        license: 'cc-by',
        filePath: onDisk,
      }),
    ])
  })

  it('rejects more than one main file', async () => {
    const payload = {
      ...basePayload,
      files: [
        {
          field: 'a',
          isMain: true,
          fileSource: 'author',
          fileType: 'file',
          visibility: 'now',
          license: 'cc-by',
        },
        {
          field: 'b',
          isMain: true,
          fileSource: 'author',
          fileType: 'file',
          visibility: 'now',
          license: 'cc-by',
        },
      ],
    }
    const res = await POST(buildRequest(payload))
    expect(res.status).toBe(400)
  })

  it('requires a license on the main file', async () => {
    const payload = {
      ...basePayload,
      files: [
        {
          field: 'file0',
          isMain: true,
          fileSource: 'author',
          fileType: 'file',
          visibility: 'now',
          license: null,
        },
      ],
    }
    const res = await POST(buildRequest(payload, new File(['x'], 'm.pdf')))
    expect(res.status).toBe(400)
  })

  it('rolls back the deposit row when a post-creation step throws', async () => {
    service.attachDepositFiles.mockRejectedValue(new Error('db down'))
    const payload = {
      ...basePayload,
      files: [
        {
          field: 'file0',
          isMain: true,
          fileSource: 'author',
          fileType: 'file',
          visibility: 'now',
          license: 'cc-by',
        },
      ],
    }
    const res = await POST(buildRequest(payload, new File(['x'], 'm.pdf')))
    expect(res.status).toBe(500)
    expect(service.deleteHalDeposit).toHaveBeenCalledWith(42)
  })
})
