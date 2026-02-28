export const getRuntimeEnv = () =>
  typeof window !== 'undefined' ? (window.env ?? {}) : {}
