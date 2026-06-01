import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from '@mui/material'
import { ExpandMore } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { AureHalStructureDoc } from '@/lib/services/AureHalAPIClient'
import HalStructureAutocomplete from './HalStructureAutocomplete'

interface AddHalAffiliationAccordionProps {
  /** Disabled until a HAL author / "Add contributor" option is chosen (brand-new). */
  disabled?: boolean
  onAddStructure: (doc: AureHalStructureDoc) => void
}

const AddHalAffiliationAccordion = ({
  disabled,
  onAddStructure,
}: AddHalAffiliationAccordionProps) => (
  <Accordion disabled={disabled} disableGutters elevation={0} square>
    <AccordionSummary expandIcon={<ExpandMore />}>
      <Typography variant='body2'>
        {t`documents_details_page_authors_tab_add_hal_affiliation`}
      </Typography>
    </AccordionSummary>
    <AccordionDetails>
      <HalStructureAutocomplete onSelectStructure={onAddStructure} />
    </AccordionDetails>
  </Accordion>
)

export default AddHalAffiliationAccordion
