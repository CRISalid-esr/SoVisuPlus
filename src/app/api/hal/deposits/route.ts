import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { getServerSession, Session } from 'next-auth'
import authOptions from '@/app/auth/auth_options'
import { DocumentService } from '@/lib/services/DocumentService'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { validateDepositEligibility } from '@/lib/services/hal/validateDepositEligibility'
import { halFilesDir } from '@/lib/services/hal/halUploadsRoot'
import { HalDepositFileInput } from '@/lib/daos/HalDepositDAO'

/**
 * Multipart manifest. `payload` is a JSON field; each described file is uploaded under its own
 * `field` name in the same form. The deposit is made on behalf of `personUid` (the perspective
 * person), which the server re-checks for the `deposit_hal` permission.
 */
interface DepositFileMeta {
  field: string
  isMain: boolean
  fileSource: string
  fileType: string
  visibility: string
  license: string | null
}
interface DepositPayload {
  documentUid: string
  personUid: string
  halDocumentType: string
  halDomains: string[]
  language: string
  files: DepositFileMeta[]
}

const bad = (error: string, reason?: string, status = 400) =>
  NextResponse.json({ error, ...(reason ? { reason } : {}) }, { status })

export const POST = async (request: Request) => {
  const session = (await getServerSession(authOptions)) as Session & {
    user: { username?: string }
  }
  if (!session?.user?.username) {
    return bad('User is not authenticated', undefined, 401)
  }

  const service = new DocumentService()

  let deposit: { id: number } | null = null
  try {
    const form = await request.formData()
    const raw = form.get('payload')
    if (typeof raw !== 'string') return bad('Missing payload')

    const payload = JSON.parse(raw) as DepositPayload
    if (
      !payload.documentUid ||
      !payload.personUid ||
      !payload.halDocumentType ||
      !payload.language ||
      !Array.isArray(payload.halDomains) ||
      payload.halDomains.length === 0
    ) {
      return bad('Invalid deposit payload')
    }

    // Authorization: deposit_hal on the perspective person.
    const person = await service.getPersonByUid(payload.personUid)
    if (!person) return bad('Person not found', undefined, 404)

    const ability = abilityFromAuthzContext(session.user.authz)
    if (!ability.can(PermissionAction.deposit_hal, person)) {
      return bad(
        'Not allowed to deposit on behalf of this person',
        undefined,
        403,
      )
    }

    const document = await service.fetchDocumentById(payload.documentUid)
    if (!document) return bad('Document not found', undefined, 404)

    // Eligibility gates (shared with the client form).
    const eligibility = validateDepositEligibility(
      document,
      person,
      payload.halDocumentType,
    )
    if (!eligibility.ok)
      return bad('Document is not eligible', eligibility.reason)

    // File-metadata invariants: at most one main file; a main file requires a license.
    const files = payload.files ?? []
    const mains = files.filter((f) => f.isMain)
    if (mains.length > 1) return bad('At most one main file is allowed')
    if (mains.length === 1 && !mains[0].license) {
      return bad('The main file requires a license')
    }

    // Create the deposit row first to get its id, then write files, then record file rows.
    deposit = await service.createHalDeposit({
      documentUid: payload.documentUid,
      personUid: payload.personUid,
      halDocumentType: payload.halDocumentType,
      halDomains: payload.halDomains,
      language: payload.language,
    })

    const fileInputs: HalDepositFileInput[] = []
    if (files.length > 0) {
      const dir = halFilesDir(deposit.id)
      await fs.promises.mkdir(dir, { recursive: true })
      for (const meta of files) {
        const file = form.get(meta.field)
        if (!(file instanceof File))
          return bad(`Missing file for ${meta.field}`)
        const fileName = path.basename(file.name)
        const filePath = path.join(dir, fileName)
        await fs.promises.writeFile(
          filePath,
          Buffer.from(await file.arrayBuffer()),
        )
        fileInputs.push({
          filePath,
          fileName,
          isMain: meta.isMain,
          mimeType: file.type || 'application/octet-stream',
          fileSource: meta.fileSource,
          fileType: meta.fileType,
          visibility: meta.visibility,
          license: meta.license,
        })
      }
    }

    const created = await service.attachDepositFiles(deposit.id, fileInputs)
    return NextResponse.json(created.toJson(), { status: 201 })
  } catch (error) {
    console.error('❌ Error creating HAL deposit:', error)
    // Roll back the DB row if it was created (orphan files are acceptable, orphan rows are not).
    if (deposit) {
      await service.deleteHalDeposit(deposit.id).catch(() => undefined)
    }
    return bad('Internal Server Error', undefined, 500)
  }
}
