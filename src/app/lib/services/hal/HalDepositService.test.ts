import { HalDepositStatus, PersonIdentifierType } from '@prisma/client'
import { Person } from '@/types/Person'
import { PersonIdentifier } from '@/types/PersonIdentifier'
import { HalDeposit } from '@/types/HalDeposit'
import { Document } from '@/types/Document'
import { HalDepositDAO } from '@/lib/daos/HalDepositDAO'
import { DocumentDAO } from '@/lib/daos/DocumentDAO'
import { PersonDAO } from '@/lib/daos/PersonDAO'
import { HalDepositPackager } from './HalDepositPackager'
import { HalSwordClient } from './HalSwordClient'
import { HalDepositService, DepositNotifier } from './HalDepositService'

const NOW = new Date('2026-06-24T00:00:00.000Z')

const makeDeposit = (overrides: Partial<HalDeposit> = {}): HalDeposit =>
  ({
    id: 1,
    documentUid: 'doc-1',
    personUid: 'person-1',
    status: HalDepositStatus.pending,
    halId: null,
    halUrl: null,
    comment: null,
    lastError: null,
    retryCount: 0,
    ...overrides,
  }) as HalDeposit

const eligiblePerson = () =>
  new Person('person-1', false, null, 'M', 'Marie', 'Curie', [
    new PersonIdentifier(PersonIdentifierType.hal_login, 'mcurie'),
    new PersonIdentifier(PersonIdentifierType.idhals, 'marie-curie'),
  ])

const ACCEPT_BODY = '<entry><id>hal-1</id><hal:version>1</hal:version><link rel="alternate" href="https://hal.science/hal-1"/></entry>'

type Mocks = {
  deposits: jest.Mocked<HalDepositDAO>
  documents: jest.Mocked<DocumentDAO>
  persons: jest.Mocked<PersonDAO>
  packager: jest.Mocked<HalDepositPackager>
  sword: jest.Mocked<HalSwordClient>
  notifier: jest.Mocked<DepositNotifier>
}

const buildMocks = (): Mocks =>
  ({
    deposits: {
      findDuePending: jest.fn(),
      claimPending: jest.fn().mockResolvedValue(true),
      updateAfterDeposit: jest.fn().mockResolvedValue(makeDeposit()),
      registerFailure: jest.fn().mockResolvedValue(undefined),
      markError: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(makeDeposit()),
      findStaleRunning: jest.fn().mockResolvedValue([]),
      resetToPending: jest.fn().mockResolvedValue(undefined),
      findVerify: jest.fn().mockResolvedValue([]),
      findRefreshRequested: jest.fn().mockResolvedValue([]),
      clearRefreshRequest: jest.fn().mockResolvedValue(undefined),
      updateStatusFromHal: jest.fn().mockResolvedValue(makeDeposit()),
    } as unknown as jest.Mocked<HalDepositDAO>,
    documents: {
      fetchDocumentById: jest.fn().mockResolvedValue({} as Document),
    } as unknown as jest.Mocked<DocumentDAO>,
    persons: {
      fetchPersonByUid: jest.fn().mockResolvedValue(eligiblePerson()),
    } as unknown as jest.Mocked<PersonDAO>,
    packager: {
      package: jest
        .fn()
        .mockResolvedValue({ kind: 'xml', filePath: '/tmp/art.xml', contentType: 'text/xml' }),
    } as unknown as jest.Mocked<HalDepositPackager>,
    sword: {
      deposit: jest.fn(),
      getStatus: jest.fn(),
    } as unknown as jest.Mocked<HalSwordClient>,
    notifier: { notifyClients: jest.fn() },
  })

const buildService = (m: Mocks) =>
  new HalDepositService(
    m.deposits,
    m.documents,
    m.persons,
    m.packager,
    m.sword,
    m.notifier,
  )

describe('HalDepositService.processDuePendingDeposits', () => {
  it('skips a deposit it cannot claim (lock held by another worker)', async () => {
    const m = buildMocks()
    m.deposits.findDuePending.mockResolvedValue([makeDeposit()])
    m.deposits.claimPending.mockResolvedValue(false)

    await buildService(m).processDuePendingDeposits(NOW)

    expect(m.sword.deposit).not.toHaveBeenCalled()
    expect(m.notifier.notifyClients).not.toHaveBeenCalled()
  })

  it('marks a 202 response as accept and broadcasts', async () => {
    const m = buildMocks()
    m.deposits.findDuePending.mockResolvedValue([makeDeposit()])
    m.sword.deposit.mockResolvedValue({ status: 202, body: ACCEPT_BODY })
    m.deposits.updateAfterDeposit.mockResolvedValue(
      makeDeposit({ status: HalDepositStatus.accept, halId: 'hal-1' }),
    )

    await buildService(m).processDuePendingDeposits(NOW)

    expect(m.deposits.updateAfterDeposit).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: HalDepositStatus.accept, halId: 'hal-1' }),
    )
    expect(m.notifier.notifyClients).toHaveBeenCalledTimes(1)
  })

  it('marks a 201 response as verify', async () => {
    const m = buildMocks()
    m.deposits.findDuePending.mockResolvedValue([makeDeposit()])
    m.sword.deposit.mockResolvedValue({ status: 201, body: ACCEPT_BODY })

    await buildService(m).processDuePendingDeposits(NOW)

    expect(m.deposits.updateAfterDeposit).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: HalDepositStatus.verify }),
    )
  })

  it('treats a 5xx as retryable: backoff + retryCount++, stays pending', async () => {
    const m = buildMocks()
    m.deposits.findDuePending.mockResolvedValue([makeDeposit({ retryCount: 0 })])
    m.sword.deposit.mockResolvedValue({ status: 503, body: 'down' })

    await buildService(m).processDuePendingDeposits(NOW)

    expect(m.deposits.registerFailure).toHaveBeenCalledWith(
      1,
      1,
      new Date(NOW.getTime() + 1 * 60_000), // 2^0 = 1 min
      expect.stringContaining('503'),
    )
    expect(m.deposits.markError).not.toHaveBeenCalled()
  })

  it('treats a 400 as terminal: error state, no retry', async () => {
    const m = buildMocks()
    m.deposits.findDuePending.mockResolvedValue([makeDeposit()])
    m.sword.deposit.mockResolvedValue({ status: 400, body: 'invalid TEI' })

    await buildService(m).processDuePendingDeposits(NOW)

    expect(m.deposits.markError).toHaveBeenCalledWith(
      1,
      expect.stringContaining('400'),
    )
    expect(m.deposits.registerFailure).not.toHaveBeenCalled()
  })

  it('surfaces the HAL summary and verbose description on a rejected deposit', async () => {
    const m = buildMocks()
    m.deposits.findDuePending.mockResolvedValue([makeDeposit()])
    m.sword.deposit.mockResolvedValue({
      status: 400,
      body: `<?xml version="1.0" encoding="utf-8"?>
<sword:error xmlns:sword="http://purl.org/net/sword/error/" xmlns="http://www.w3.org/2005/Atom">
  <summary>Some parameters sent with the request were not understood</summary>
  <sword:verboseDescription>{"duplicate-entry":"halshs-00654062"}</sword:verboseDescription>
</sword:error>`,
    })

    await buildService(m).processDuePendingDeposits(NOW)

    expect(m.deposits.markError).toHaveBeenCalledWith(
      1,
      'Some parameters sent with the request were not understood\n{"duplicate-entry":"halshs-00654062"}',
    )
  })

  it('treats a thrown network error as retryable', async () => {
    const m = buildMocks()
    m.deposits.findDuePending.mockResolvedValue([makeDeposit()])
    m.sword.deposit.mockRejectedValue(new Error('ECONNREFUSED'))

    await buildService(m).processDuePendingDeposits(NOW)

    expect(m.deposits.registerFailure).toHaveBeenCalledWith(
      1,
      1,
      expect.any(Date),
      expect.stringContaining('ECONNREFUSED'),
    )
  })

  it('fails terminally when the document is missing', async () => {
    const m = buildMocks()
    m.deposits.findDuePending.mockResolvedValue([makeDeposit()])
    m.documents.fetchDocumentById.mockResolvedValue(null)

    await buildService(m).processDuePendingDeposits(NOW)

    expect(m.deposits.markError).toHaveBeenCalledWith(1, 'Document not found')
    expect(m.sword.deposit).not.toHaveBeenCalled()
  })

  it('fails terminally when the person lacks HAL identifiers', async () => {
    const m = buildMocks()
    m.deposits.findDuePending.mockResolvedValue([makeDeposit()])
    m.persons.fetchPersonByUid.mockResolvedValue(
      new Person('person-1', false, null, 'N', 'No', 'Hal', []),
    )

    await buildService(m).processDuePendingDeposits(NOW)

    expect(m.deposits.markError).toHaveBeenCalledWith(
      1,
      expect.stringContaining('HAL identifiers'),
    )
    expect(m.sword.deposit).not.toHaveBeenCalled()
  })

  it('applies the exponential backoff schedule (caps at 240 min)', async () => {
    const cases: [number, number][] = [
      [0, 1],
      [5, 32],
      [8, 240],
    ]
    for (const [retryCount, expectedMin] of cases) {
      const m = buildMocks()
      m.deposits.findDuePending.mockResolvedValue([makeDeposit({ retryCount })])
      m.sword.deposit.mockResolvedValue({ status: 500, body: 'x' })

      await buildService(m).processDuePendingDeposits(NOW)

      expect(m.deposits.registerFailure).toHaveBeenCalledWith(
        1,
        retryCount + 1,
        new Date(NOW.getTime() + expectedMin * 60_000),
        expect.any(String),
      )
    }
  })
})

describe('HalDepositService.recoverStaleDeposits', () => {
  it('resets running deposits to pending with a backoff time', async () => {
    const m = buildMocks()
    m.deposits.findStaleRunning.mockResolvedValue([
      makeDeposit({ id: 7, status: HalDepositStatus.running, retryCount: 2 }),
    ])

    await buildService(m).recoverStaleDeposits(10, NOW)

    expect(m.deposits.findStaleRunning).toHaveBeenCalledWith(
      new Date(NOW.getTime() - 10 * 60_000),
    )
    expect(m.deposits.resetToPending).toHaveBeenCalledWith(
      7,
      new Date(NOW.getTime() + 4 * 60_000), // 2^2
    )
  })
})

describe('HalDepositService.processRefreshRequests', () => {
  it('updates and broadcasts on a changed status, always clearing the flag', async () => {
    const m = buildMocks()
    m.deposits.findRefreshRequested.mockResolvedValue([
      makeDeposit({ id: 9, status: HalDepositStatus.verify, halId: 'hal-9' }),
    ])
    m.sword.getStatus.mockResolvedValue({
      status: 200,
      body: '<document><status>accept</status><comment></comment></document>',
    })

    await buildService(m).processRefreshRequests()

    expect(m.deposits.updateStatusFromHal).toHaveBeenCalledWith(
      9,
      HalDepositStatus.accept,
      null,
    )
    expect(m.notifier.notifyClients).toHaveBeenCalledTimes(1)
    expect(m.deposits.clearRefreshRequest).toHaveBeenCalledWith(9)
  })

  it('does not update when the status is unchanged, but still clears the flag', async () => {
    const m = buildMocks()
    m.deposits.findRefreshRequested.mockResolvedValue([
      makeDeposit({ id: 9, status: HalDepositStatus.verify, halId: 'hal-9' }),
    ])
    m.sword.getStatus.mockResolvedValue({
      status: 200,
      body: '<document><status>verify</status><comment></comment></document>',
    })

    await buildService(m).processRefreshRequests()

    expect(m.deposits.updateStatusFromHal).not.toHaveBeenCalled()
    expect(m.deposits.clearRefreshRequest).toHaveBeenCalledWith(9)
  })
})

describe('HalDepositService.pollVerifyDeposits', () => {
  it('promotes a verify deposit when HAL reports accept', async () => {
    const m = buildMocks()
    m.deposits.findVerify.mockResolvedValue([
      makeDeposit({ id: 5, status: HalDepositStatus.verify, halId: 'hal-5' }),
    ])
    m.sword.getStatus.mockResolvedValue({
      status: 200,
      body: '<document><status>accept</status></document>',
    })

    await buildService(m).pollVerifyDeposits()

    expect(m.deposits.updateStatusFromHal).toHaveBeenCalledWith(
      5,
      HalDepositStatus.accept,
      null,
    )
    expect(m.notifier.notifyClients).toHaveBeenCalledTimes(1)
  })
})
