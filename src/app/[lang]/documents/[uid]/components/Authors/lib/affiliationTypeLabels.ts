import { t } from '@lingui/core/macro'
import { HalAffiliationType } from './affiliationType'

/**
 * Translated label for a HAL affiliation type. Each branch is a static `t`
 * literal so the LinguiJS extractor picks it up (no dynamic ids). Call from
 * render so it re-evaluates on locale change.
 */
export function halAffiliationTypeLabel(type: HalAffiliationType): string {
  switch (type) {
    case 'institution':
      return t`documents_details_page_authors_tab_affiliation_type_institution`
    case 'department':
      return t`documents_details_page_authors_tab_affiliation_type_department`
    case 'regrouplaboratory':
      return t`documents_details_page_authors_tab_affiliation_type_regrouplaboratory`
    case 'laboratory':
      return t`documents_details_page_authors_tab_affiliation_type_laboratory`
    case 'researchteam':
      return t`documents_details_page_authors_tab_affiliation_type_researchteam`
  }
}
