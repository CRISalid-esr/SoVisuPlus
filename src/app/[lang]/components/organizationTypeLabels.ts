import { msg } from '@lingui/core/macro'
import type { I18n, MessageDescriptor } from '@lingui/core'

/**
 * Display labels for the national organization types (the managed French
 * "cadre de référence" vocabulary). The list evolves upstream: unknown codes
 * fall back to the raw code until a translation is added here.
 *
 * Static `msg` entries only — the Lingui extractor cannot see dynamic ids.
 */
const NATIONAL_TYPE_LABELS: Record<string, MessageDescriptor> = {
  UNIV: msg`organization_national_type_univ`,
  EPE: msg`organization_national_type_epe`,
  EPST: msg`organization_national_type_epst`,
  GE: msg`organization_national_type_ge`,
  COMUE: msg`organization_national_type_comue`,
  UMR: msg`organization_national_type_umr`,
  UAR: msg`organization_national_type_uar`,
  UR: msg`organization_national_type_ur`,
  IRL: msg`organization_national_type_irl`,
  UFR: msg`organization_national_type_ufr`,
  FAC: msg`organization_national_type_fac`,
  ED: msg`organization_national_type_ed`,
  TEAM: msg`organization_national_type_team`,
  THEME: msg`organization_national_type_theme`,
}

/**
 * Translate a national organization type code for display.
 * @returns the translated label, the raw code for unknown values, or null
 */
export const nationalTypeLabel = (
  i18n: I18n,
  code: string | null | undefined,
): string | null => {
  if (!code) {
    return null
  }
  const descriptor = NATIONAL_TYPE_LABELS[code]
  return descriptor ? i18n._(descriptor) : code
}
