import path from 'node:path'

/**
 * Resolves the on-disk locations for HAL deposit files. Both the web process (which writes
 * uploaded attachments) and the listener process (which reads them and writes the generated
 * TEI/ZIP) must agree on these paths — they run from potentially different working directories
 * but share the same mounted volumes. The root is therefore env-driven and resolved to an
 * absolute path once.
 *
 * Layout:
 *   <root>/hal-files/<depositId>/<filename>   — user-uploaded attachments
 *   <root>/hal-tei/<depositId>/art.xml|art.zip — generated TEI and archive
 */
export const halUploadsRoot = (): string =>
  path.resolve(process.env.HAL_UPLOADS_ROOT ?? path.join(process.cwd(), 'uploads'))

/** Directory holding a deposit's uploaded attachment files. */
export const halFilesDir = (depositId: number): string =>
  path.join(halUploadsRoot(), 'hal-files', String(depositId))

/** Directory holding a deposit's generated TEI / ZIP artifacts. */
export const halTeiDir = (depositId: number): string =>
  path.join(halUploadsRoot(), 'hal-tei', String(depositId))
