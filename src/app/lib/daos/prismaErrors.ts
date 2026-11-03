/** A Prisma unique-constraint violation (P2002) and the fields it hit. */
export type UniqueConstraintError = {
  code: 'P2002'
  meta?: { target?: unknown }
}

/**
 * True for a Prisma unique-constraint violation. Checked on the error code,
 * not with `instanceof PrismaClientKnownRequestError`: in the Next.js server
 * bundle the class imported from `@prisma/client/runtime/library` is not the
 * one the client throws, so `instanceof` is always false there.
 */
export const isUniqueConstraintError = (
  error: unknown,
): error is UniqueConstraintError =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2002'
