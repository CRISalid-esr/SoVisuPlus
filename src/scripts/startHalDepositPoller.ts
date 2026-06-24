import { HalDepositService } from '@/lib/services/hal/HalDepositService'

/** How often pending deposits and on-demand refreshes are processed. */
const SHORT_INTERVAL_MS = 8_000
/** How often `verify` deposits are polled in the background (HAL moderation is slow). */
const LONG_INTERVAL_MS = 60 * 60 * 1000

/**
 * Fourth listener subsystem: a thin scheduler that drives the HAL deposit lifecycle. It owns no
 * business logic — it only times calls into `HalDepositService`, mirroring how
 * `startChangePoller` delegates to `ActionDispatchService`. Broadcasts reach the web clients via
 * the static `WebSocketNotifier`, which is already attached by the WebSocket server started in
 * the same listener process.
 */
export const startHalDepositPoller = (
  service: HalDepositService = new HalDepositService(),
): void => {
  // Crash recovery: release every deposit a previous run left mid-submission (running → pending).
  service
    .recoverStaleDeposits(0)
    .catch((err) =>
      console.error('❌ HAL deposit startup recovery failed:', err),
    )

  const shortLoop = async () => {
    try {
      await service.recoverStaleDeposits() // 10-min stale guard
      await service.processDuePendingDeposits()
      await service.processRefreshRequests()
    } catch (err) {
      console.error('❌ HAL deposit poller error:', err)
    } finally {
      setTimeout(shortLoop, SHORT_INTERVAL_MS)
    }
  }

  const longLoop = async () => {
    try {
      await service.pollVerifyDeposits()
    } catch (err) {
      console.error('❌ HAL deposit verify poller error:', err)
    } finally {
      setTimeout(longLoop, LONG_INTERVAL_MS)
    }
  }

  shortLoop()
  longLoop()
}
