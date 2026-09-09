import { Stack } from '@mui/material'
import { AureHalStructureDoc } from '@/lib/services/AureHalAPIClient'
import { HalAffiliationType } from '../lib/affiliationType'
import { WorkingAffiliation } from '../lib/types'
import AffiliationCard from './AffiliationCard'
import AddHalAffiliationAccordion from './AddHalAffiliationAccordion'

interface AffiliationPanelProps {
  affiliations: WorkingAffiliation[]
  disabled?: boolean
  readOnly?: boolean
  /** false for a brand-new contributor with no HAL profile selected yet. */
  canAddAffiliation: boolean
  onRemoveAffiliation: (affiliationLocalId: string) => void
  onReplaceAffiliation: (
    affiliationLocalId: string,
    doc: AureHalStructureDoc,
  ) => void
  onChangeAffiliationType: (
    affiliationLocalId: string,
    type: HalAffiliationType | null,
  ) => void
  onAddAffiliation: (doc: AureHalStructureDoc) => void
}

const AffiliationPanel = ({
  affiliations,
  disabled,
  readOnly,
  canAddAffiliation,
  onRemoveAffiliation,
  onReplaceAffiliation,
  onChangeAffiliationType,
  onAddAffiliation,
}: AffiliationPanelProps) => (
  <Stack spacing={1}>
    {affiliations.map((aff) => (
      <AffiliationCard
        key={aff.localId}
        affiliation={aff}
        disabled={disabled}
        readOnly={readOnly}
        onRemove={onRemoveAffiliation}
        onSelectStructure={onReplaceAffiliation}
        onChangeType={onChangeAffiliationType}
      />
    ))}
    {!readOnly && (
      <AddHalAffiliationAccordion
        disabled={disabled || !canAddAffiliation}
        onAddStructure={onAddAffiliation}
      />
    )}
  </Stack>
)

export default AffiliationPanel
