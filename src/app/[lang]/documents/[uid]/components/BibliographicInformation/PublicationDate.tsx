'use client'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Trans as TransNode } from '@lingui/react'
import * as Lingui from '@lingui/core'
import useStore from '@/stores/global_store'
import {
  Box,
  Button,
  IconButton,
  Popover,
  Stack,
  Step,
  StepButton,
  Stepper,
  Tooltip,
  Typography,
} from '@mui/material'
import EditCalendarIcon from '@mui/icons-material/EditCalendar'
import { YearCalendar } from '@mui/x-date-pickers/YearCalendar'
import { MonthCalendar } from '@mui/x-date-pickers/MonthCalendar'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import dayjs, { Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Can } from '@casl/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import {
  DatePrecision,
  formatPublicationDate,
  parsePublicationDate,
  serializePublicationDate,
} from '@/utils/publicationDate'

const STEPS = ['year', 'month', 'day'] as const

// Custom step icon: a numbered dot, teal for reached (current + previous) steps
// and grey for not-yet-reached ones. Rendering a node (rather than a number)
// also suppresses MUI's default completed checkmark.
const StepDot = ({ n, reached }: { n: number; reached: boolean }) => (
  <Box
    sx={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.75rem',
      fontWeight: 500,
      bgcolor: reached ? 'primary.main' : 'rgba(0, 0, 0, 0.38)',
      color: 'common.white',
    }}
  >
    {n}
  </Box>
)

const PublicationDate = ({
  setAlert,
}: {
  setAlert?: ({
    open,
    success,
    message,
  }: {
    open: boolean
    success: boolean
    message: React.ReactNode
  }) => void
}) => {
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  const { selectedDocument } = useStore((state) => state.document)
  const modifyPublicationDate = useStore(
    (state) => state.document.modifyPublicationDate,
  )
  const locale = Lingui.i18n.locale

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [value, setValue] = useState<Dayjs | null>(null)
  const [precision, setPrecision] = useState<DatePrecision>('year')
  const [activeStep, setActiveStep] = useState<DatePrecision>('year')

  const precisionIndex = STEPS.indexOf(precision)
  const activeIndex = STEPS.indexOf(activeStep)

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    const parsed = parsePublicationDate(
      selectedDocument?.publicationDate ?? null,
    )
    setValue(parsed.day)
    setPrecision(parsed.day ? parsed.precision : 'year')
    setActiveStep(parsed.day ? parsed.precision : 'year')
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => setAnchorEl(null)

  const handleApply = async () => {
    if (!value) return handleClose()
    const response = await modifyPublicationDate(
      serializePublicationDate(value, precision),
    )
    setAlert?.({
      open: true,
      success: !!response?.success,
      message: response?.success ? (
        <TransNode id='document_details_page_publication_date_update_success' />
      ) : (
        <TransNode id='document_details_page_publication_date_update_failure' />
      ),
    })
    handleClose()
  }

  // Step navigation: a previous/current step drops the deeper levels (keeping
  // the landed level's value); the immediate next step adds a fresh level.
  const canGoTo = (i: number) =>
    i <= precisionIndex || (i === precisionIndex + 1 && value != null)

  const goToStep = (i: number) => {
    if (!canGoTo(i)) return
    setActiveStep(STEPS[i])
    if (i <= precisionIndex) setPrecision(STEPS[i])
  }

  // Per-level picks — set the component, confirm the level, then auto-advance
  // to the next (still-blank) step.
  const onYearPick = (picked: Dayjs) => {
    setValue((prev) => (prev ?? picked).year(picked.year()))
    setPrecision('year')
    setActiveStep('month')
  }
  const onMonthPick = (picked: Dayjs) => {
    setValue((prev) => (prev ?? picked).month(picked.month()))
    setPrecision('month')
    setActiveStep('day')
  }
  const onDayPick = (picked: Dayjs | null) => {
    if (!picked) return
    setValue(picked)
    setPrecision('day')
  }

  // The active grid shows a selected value only when the level is confirmed;
  // a freshly added (deeper) level renders blank.
  const shown = activeIndex <= precisionIndex ? value : null
  const referenceDate = value ?? dayjs()

  const displayValue = selectedDocument?.publicationDate
    ? formatPublicationDate(selectedDocument.publicationDate, locale)
    : t`documents_page_publication_date_column_no_date_available`

  const editLabel = t`document_details_page_publication_date_row_edit_button`

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Typography>{displayValue}</Typography>
      <Can
        I={PermissionAction.update}
        a={selectedDocument}
        field='publicationDate'
        ability={ability}
      >
        <Tooltip title={editLabel}>
          <span>
            <IconButton
              aria-label={editLabel}
              disabled={selectedDocument?.isFrozen ?? false}
              onClick={handleOpen}
              sx={{
                color: 'primary.main',
                border: '1px solid',
                borderColor: '#6F7977',
                borderRadius: '100px',
              }}
            >
              <EditCalendarIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Popover
          open={!!anchorEl}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { sx: { p: 2 } } }}
        >
          <Stack spacing={1.5} sx={{ minWidth: 300 }}>
            <Typography variant='subtitle2'>
              <Trans>document_details_page_publication_date_select_label</Trans>
            </Typography>

            {/* Steps: next adds a deeper level, previous removes deeper levels */}
            <Stepper nonLinear activeStep={activeIndex} alternativeLabel>
              {STEPS.map((step, i) => (
                <Step key={step}>
                  <StepButton
                    onClick={() => goToStep(i)}
                    disabled={!canGoTo(i)}
                    icon={<StepDot n={i + 1} reached={i <= activeIndex} />}
                    sx={{
                      '& .MuiStepLabel-label': {
                        color: i <= activeIndex ? 'text.primary' : 'text.disabled',
                      },
                    }}
                  >
                    {step === 'year' && (
                      <Trans>
                        document_details_page_publication_date_step_year
                      </Trans>
                    )}
                    {step === 'month' && (
                      <Trans>
                        document_details_page_publication_date_step_month
                      </Trans>
                    )}
                    {step === 'day' && (
                      <Trans>
                        document_details_page_publication_date_step_day
                      </Trans>
                    )}
                  </StepButton>
                </Step>
              ))}
            </Stepper>

            {/* One single-level grid at a time — no auto-advance, no view arrow */}
            <Box>
              {activeStep === 'year' && (
                <YearCalendar
                  value={shown}
                  referenceDate={referenceDate}
                  onChange={onYearPick}
                />
              )}
              {activeStep === 'month' && (
                <MonthCalendar
                  value={shown}
                  referenceDate={referenceDate}
                  onChange={onMonthPick}
                />
              )}
              {activeStep === 'day' && (
                <DateCalendar
                  views={['day']}
                  value={shown}
                  referenceDate={referenceDate}
                  onChange={onDayPick}
                  disableHighlightToday
                  slotProps={{
                    previousIconButton: { sx: { display: 'none' } },
                    nextIconButton: { sx: { display: 'none' } },
                  }}
                  sx={{
                    '& .MuiPickersDay-root.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'common.white',
                      '&:hover, &:focus': {
                        backgroundColor: 'primary.main',
                      },
                    },
                  }}
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={handleClose}>
                <Trans>document_details_page_cancel_button</Trans>
              </Button>
              <Button
                variant='contained'
                onClick={handleApply}
                disabled={!value}
              >
                <Trans>document_details_page_apply_button</Trans>
              </Button>
            </Box>
          </Stack>
        </Popover>
      </Can>
    </Box>
  )
}

export default PublicationDate
