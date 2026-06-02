import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  Typography,
} from '@mui/material'
import { Add, ExpandMore } from '@mui/icons-material'
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
  <Accordion
    disabled={disabled}
    disableGutters
    elevation={0}
    square
    sx={{
      border: '1px dashed',
      borderColor: 'grey.400',
      borderRadius: 1,
      backgroundColor: 'transparent',
      '&::before': { display: 'none' },
    }}
  >
    <AccordionSummary expandIcon={<ExpandMore />}>
      <Stack direction='row' spacing={1} alignItems='center'>
        <Add fontSize='small' sx={{ color: 'primary.main' }} />
        <Typography
          variant='body2'
          sx={{ fontWeight: 700, color: 'primary.main' }}
        >
          {t`documents_details_page_authors_tab_add_hal_affiliation`}
        </Typography>
      </Stack>
    </AccordionSummary>
    <AccordionDetails>
      <HalStructureAutocomplete onSelectStructure={onAddStructure} />
    </AccordionDetails>
  </Accordion>
)

export default AddHalAffiliationAccordion
