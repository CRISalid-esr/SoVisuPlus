/**
 * HAL deposit licence codes (as used by the deposit form) → the `@target` URI emitted in
 * `publicationStmt/availability/licence/@target` of the AOfr TEI.
 *
 * The six Creative Commons 4.0 URIs are stable. ETALAB and Copyright are NOT yet resolved:
 * the spec flags them as open (Copyright likely emits no `<licence>` element at all). Until
 * confirmed against HAL's licence reference list, `licenceTargetFor` returns `null` for them,
 * and the packager omits the `<licence>` element rather than emit a wrong URI.
 */

export type HalLicenseCode =
  | 'cc-by'
  | 'cc-by-sa'
  | 'cc-by-nc'
  | 'cc-by-nc-sa'
  | 'cc-by-nd'
  | 'cc-by-nc-nd'
  | 'etalab'
  | 'copyright'

const CC_TARGETS: Record<string, string> = {
  'cc-by': 'http://creativecommons.org/licenses/by/4.0/',
  'cc-by-sa': 'http://creativecommons.org/licenses/by-sa/4.0/',
  'cc-by-nc': 'http://creativecommons.org/licenses/by-nc/4.0/',
  'cc-by-nc-sa': 'http://creativecommons.org/licenses/by-nc-sa/4.0/',
  'cc-by-nd': 'http://creativecommons.org/licenses/by-nd/4.0/',
  'cc-by-nc-nd': 'http://creativecommons.org/licenses/by-nc-nd/4.0/',
}

/**
 * Resolve a licence code to its TEI `@target` URI, or `null` when no `<licence>` element
 * should be emitted (unset, or a not-yet-resolved ETALAB/Copyright code).
 */
export const licenceTargetFor = (
  code: string | null | undefined,
): string | null => {
  if (!code) return null
  // TODO(#838 follow-up): resolve ETALAB / Copyright @target against HAL's licence ref list.
  return CC_TARGETS[code] ?? null
}
