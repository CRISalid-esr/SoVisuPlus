import { startHalDepositPoller } from './startHalDepositPoller'
import { HalDepositService } from '@/lib/services/hal/HalDepositService'

describe('startHalDepositPoller', () => {
  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('runs startup recovery and drives the service loops', async () => {
    jest.useFakeTimers()
    const service = {
      recoverStaleDeposits: jest.fn().mockResolvedValue(undefined),
      processDuePendingDeposits: jest.fn().mockResolvedValue(undefined),
      processRefreshRequests: jest.fn().mockResolvedValue(undefined),
      pollVerifyDeposits: jest.fn().mockResolvedValue(undefined),
    }

    startHalDepositPoller(service as unknown as HalDepositService)
    await jest.advanceTimersByTimeAsync(0) // flush the immediately-invoked loop bodies

    // Startup crash recovery releases everything (threshold 0) ...
    expect(service.recoverStaleDeposits).toHaveBeenCalledWith(0)
    // ... and the short loop runs the periodic stale guard + pending + refresh work ...
    expect(service.recoverStaleDeposits).toHaveBeenCalledWith()
    expect(service.processDuePendingDeposits).toHaveBeenCalled()
    expect(service.processRefreshRequests).toHaveBeenCalled()
    // ... while the long loop polls verify deposits.
    expect(service.pollVerifyDeposits).toHaveBeenCalled()
  })
})
