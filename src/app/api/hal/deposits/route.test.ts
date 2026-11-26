/**
 * @jest-environment node
 *
 * Focuses on the route mechanics that are new ground in this codebase: multipart `formData()`
 * parsing, writing uploaded `File`s to disk, and the create/cleanup flow. Auth, ability
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
  createHalDepositWithFiles: jest.fn(),
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
  service.createHalDepositWithFiles.mockResolvedValue({
    toJson: () => ({ id: 42 }),
  })
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
    expect(await res.json()).toMatchObject({ reason: 'not_authenticated' })
  })

  it('returns 403 when the user has neither deposit_hal nor deposit_hal_unauthenticated', async () => {
    can.mockReturnValue(false)
    const res = await POST(buildRequest(basePayload))
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ reason: 'forbidden' })
    expect(service.createHalDepositWithFiles).not.toHaveBeenCalled()
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
    // The upload directory is keyed by a random key, not by the deposit id
    const [uploadKey] = fs.readdirSync(path.join(root, 'hal-files'))
    const onDisk = path.join(root, 'hal-files', uploadKey, 'doc.pdf')
    expect(fs.readFileSync(onDisk, 'utf-8')).toBe('PDF')
    expect(service.createHalDepositWithFiles).toHaveBeenCalledWith(
      expect.objectContaining({ documentUid: 'doc-1', personUid: 'person-1' }),
      [
        expect.objectContaining({
          fileName: 'doc.pdf',
          isMain: true,
          fileSource: 'author',
          fileType: 'file',
          license: 'cc-by',
          filePath: onDisk,
        }),
      ],
    )
  })

  it('rejects an announced file missing from the upload, before any write', async () => {
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
    const res = await POST(buildRequest(payload))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({
      reason: 'file_missing_from_upload',
    })
    expect(service.createHalDepositWithFiles).not.toHaveBeenCalled()
    expect(fs.existsSync(path.join(root, 'hal-files'))).toBe(false)
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
    expect(await res.json()).toMatchObject({ reason: 'multiple_main_files' })
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
    expect(await res.json()).toMatchObject({
      reason: 'main_file_license_required',
    })
  })

  it('rejects when a required conditional field is missing (COUV without book title)', async () => {
    const res = await POST(
      buildRequest({ ...basePayload, halDocumentType: 'COUV', files: [] }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({
      reason: 'missing_field:bookTitle',
    })
    expect(service.createHalDepositWithFiles).not.toHaveBeenCalled()
  })

  it('rejects a THESE/HDR deposit that has no main file', async () => {
    const res = await POST(
      buildRequest({
        ...basePayload,
        halDocumentType: 'THESE',
        institution: 'Univ',
        supervisor: 'Advisor',
        files: [],
      }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ reason: 'missing_main_file' })
  })

  it('passes conditional metadata through to createHalDeposit', async () => {
    const payload = {
      ...basePayload,
      halDocumentType: 'COMM',
      conferenceTitle: 'My Conf',
      conferenceCity: 'Prague',
      conferenceStartDate: '2016-01',
      conferenceCountry: 'CZ',
      files: [],
    }
    const res = await POST(buildRequest(payload))
    expect(res.status).toBe(201)
    expect(service.createHalDepositWithFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        halDocumentType: 'COMM',
        conferenceTitle: 'My Conf',
        conferenceCity: 'Prague',
        conferenceStartDate: '2016-01',
        conferenceCountry: 'CZ',
      }),
      [],
    )
  })

  it('removes the written files when the deposit cannot be created', async () => {
    service.createHalDepositWithFiles.mockRejectedValue(new Error('db down'))
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
    expect(await res.json()).toMatchObject({ reason: 'internal_error' })
    expect(fs.readdirSync(path.join(root, 'hal-files'))).toEqual([])
  })
})
