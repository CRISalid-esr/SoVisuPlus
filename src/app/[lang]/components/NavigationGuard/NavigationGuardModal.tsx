import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { t } from '@lingui/core/macro'

interface NavigationGuardModalProps {
  open: boolean
  /** Discard unsaved changes and continue navigating. */
  onLeave: () => void
  /** Stay on the page to save from the banner. */
  onStay: () => void
}

const NavigationGuardModal = ({
  open,
  onLeave,
  onStay,
}: NavigationGuardModalProps) => (
  <Dialog open={open} onClose={onStay}>
    <DialogTitle>
      {t`documents_details_page_authors_tab_nav_guard_title`}
    </DialogTitle>
    <DialogContent>
      <DialogContentText>
        {t`documents_details_page_authors_tab_nav_guard_message`}
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onStay}>
        {t`documents_details_page_authors_tab_nav_guard_stay`}
      </Button>
      <Button color='error' onClick={onLeave}>
        {t`documents_details_page_authors_tab_nav_guard_leave`}
      </Button>
    </DialogActions>
  </Dialog>
)

export default NavigationGuardModal
