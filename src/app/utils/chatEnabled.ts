/**
 * Deployment kill switch for the AI chat assistant. The chat is on unless `CHAT_ENABLED` is exactly
 * `false` (case-insensitive, surrounding spaces ignored). Server-side only; the other conditions
 * (`CRISALID_AGENTS_API_URL` set, a chat config resolved) still apply on top of it.
 */
export const isChatEnabledByEnv = (): boolean =>
  process.env.CHAT_ENABLED?.trim().toLowerCase() !== 'false'
