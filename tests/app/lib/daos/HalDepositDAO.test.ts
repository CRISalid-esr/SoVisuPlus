import { HalDepositDAO } from '@/lib/daos/HalDepositDAO'
import { HalDepositStatus } from '@prisma/client'
import prisma from '@/lib/daos/prisma'

const DOC_UID = 'local-hal-doc'
const PERSON_UID = 'local-hal-person'

const baseDepositParams = {
  documentUid: DOC_UID,
  personUid: PERSON_UID,
  halDocumentType: 'ART',
  halDomains: ['shs.hisphilso'],
  language: 'en',
}

describe('HalDepositDAO Integration Tests', () => {
  let dao: HalDepositDAO

  beforeAll(() => {
    dao = new HalDepositDAO()
  })

  beforeEach(async () => {
    await prisma.document.create({ data: { uid: DOC_UID } })
    await prisma.person.create({ data: { uid: PERSON_UID } })
  })

  afterEach(async () => {
    await prisma.halDepositFile.deleteMany()
    await prisma.halDeposit.deleteMany()
    await prisma.document.deleteMany()
    await prisma.person.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  test('createDeposit stores metadata, resolves uids, defaults to pending', async () => {
    const deposit = await dao.createDeposit(baseDepositParams)

    expect(deposit.id).toEqual(expect.any(Number))
    expect(deposit.documentUid).toBe(DOC_UID)
    expect(deposit.personUid).toBe(PERSON_UID)
    expect(deposit.status).toBe(HalDepositStatus.pending)
    expect(deposit.halDomains).toEqual(['shs.hisphilso'])
    expect(deposit.retryCount).toBe(0)
    expect(deposit.files).toHaveLength(0)
  })

  test('addFiles attaches files to the deposit', async () => {
    const created = await dao.createDeposit(baseDepositParams)
    const withFiles = await dao.addFiles(created.id, [
      {
        filePath: `uploads/hal-files/${created.id}/doc.pdf`,
        fileName: 'doc.pdf',
        isMain: true,
        mimeType: 'application/pdf',
        fileSource: 'author',
        fileType: 'file',
        visibility: 'now',
        license: 'cc-by',
      },
    ])

    expect(withFiles.files).toHaveLength(1)
    expect(withFiles.files[0]).toMatchObject({
      fileName: 'doc.pdf',
      isMain: true,
      fileSource: 'author',
      fileType: 'file',
      license: 'cc-by',
    })
  })

  test('claimPending acts as a lock: first claim wins, second fails', async () => {
    const deposit = await dao.createDeposit(baseDepositParams)
    const now = new Date()

    const first = await dao.claimPending(deposit.id, now)
    const second = await dao.claimPending(deposit.id, now)

    expect(first).toBe(true)
    expect(second).toBe(false)

    const reloaded = await dao.findById(deposit.id)
    expect(reloaded?.status).toBe(HalDepositStatus.running)
    expect(reloaded?.startedAt).not.toBeNull()
  })

  test('findDuePending returns pending rows whose retry window elapsed, not future ones', async () => {
    const now = new Date()
    const past = new Date(now.getTime() - 60_000)
    const future = new Date(now.getTime() + 60_000)

    const dueNull = await dao.createDeposit(baseDepositParams)
    const duePast = await dao.createDeposit(baseDepositParams)
    const notDue = await dao.createDeposit(baseDepositParams)

    await dao.registerFailure(duePast.id, 1, past, 'transient')
    await dao.registerFailure(notDue.id, 1, future, 'transient')

    const due = await dao.findDuePending(now)
    const dueIds = due.map((d) => d.id)

    expect(dueIds).toContain(dueNull.id)
    expect(dueIds).toContain(duePast.id)
    expect(dueIds).not.toContain(notDue.id)
  })

  test('updateAfterDeposit records SWORD result and resets retry bookkeeping', async () => {
    const deposit = await dao.createDeposit(baseDepositParams)
    await dao.registerFailure(
      deposit.id,
      2,
      new Date(Date.now() + 60_000),
      'boom',
    )

    const updated = await dao.updateAfterDeposit(deposit.id, {
      halId: 'hal-123',
      halPassword: 'secret',
      halVersion: 1,
      halUrl: 'https://hal.science/hal-123',
      status: HalDepositStatus.accept,
    })

    expect(updated.status).toBe(HalDepositStatus.accept)
    expect(updated.halId).toBe('hal-123')
    expect(updated.retryCount).toBe(0)
    expect(updated.nextRetryAt).toBeNull()
    expect(updated.lastError).toBeNull()
  })

  test('markError moves the deposit to the terminal error state', async () => {
    const deposit = await dao.createDeposit(baseDepositParams)
    await dao.markError(deposit.id, 'invalid TEI')

    const reloaded = await dao.findById(deposit.id)
    expect(reloaded?.status).toBe(HalDepositStatus.error)
    expect(reloaded?.lastError).toBe('invalid TEI')
    expect(reloaded?.nextRetryAt).toBeNull()
  })

  test('refresh request lifecycle: set, find, clear', async () => {
    const deposit = await dao.createDeposit(baseDepositParams)
    await dao.updateStatusFromHal(deposit.id, HalDepositStatus.verify, null)
    await dao.requestRefresh(deposit.id, new Date())

    const requested = await dao.findRefreshRequested()
    expect(requested.map((d) => d.id)).toContain(deposit.id)

    await dao.clearRefreshRequest(deposit.id)
    const afterClear = await dao.findRefreshRequested()
    expect(afterClear.map((d) => d.id)).not.toContain(deposit.id)
  })

  test('findLatestByDocumentUid returns the most recently updated deposit', async () => {
    const first = await dao.createDeposit(baseDepositParams)
    const second = await dao.createDeposit(baseDepositParams)
    // Touch `first` after `second` so it becomes the most recently updated.
    await dao.updateStatusFromHal(first.id, HalDepositStatus.verify, null)

    const latest = await dao.findLatestByDocumentUid(DOC_UID)
    expect(latest?.id).toBe(first.id)
    expect(second.id).not.toBe(first.id)
  })
})
