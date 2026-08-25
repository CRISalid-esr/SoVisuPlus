'use client'
import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import * as Lingui from '@lingui/core'
import {
  Box,
  Button,
  IconButton,
  Popover,
  Stack,
  Step,
  StepButton,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import EditCalendarIcon from '@mui/icons-material/EditCalendar'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { YearCalendar } from '@mui/x-date-pickers/YearCalendar'
import { MonthCalendar } from '@mui/x-date-pickers/MonthCalendar'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import dayjs, { Dayjs } from 'dayjs'
import {
  DatePrecision,
  formatPublicationDate,
  parsePublicationDate,
  serializePublicationDate,
} from '@/utils/publicationDate'

const STEPS = ['year', 'month', 'day'] as const

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

interface PartialDateFieldProps {
  /** Partial ISO 8601 value (`YYYY` / `YYYY-MM` / `YYYY-MM-DD`) or null. */
  value: string | null
  onChange: (value: string | null) => void
  label?: string
  required?: boolean
  error?: boolean
  disabled?: boolean
}

/**
 * Controlled partial-precision date field (year → month → day), reusing the publication-date
 * precision utilities. Unlike `BibliographicInformation/PublicationDate`, this reads/writes a
 * `value`/`onChange` pair instead of the document store, so it can back deposit form fields
 * such as the conference start date.
 */
const PartialDateField = ({
  value,
  onChange,
  label,
  required,
  error,
  disabled,
}: PartialDateFieldProps) => {
  const locale = Lingui.i18n.locale
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [draft, setDraft] = useState<Dayjs | null>(null)
  const [precision, setPrecision] = useState<DatePrecision>('year')
  const [activeStep, setActiveStep] = useState<DatePrecision>('year')

  const precisionIndex = STEPS.indexOf(precision)
  const activeIndex = STEPS.indexOf(activeStep)

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    const parsed = parsePublicationDate(value)
    setDraft(parsed.day)
    setPrecision(parsed.day ? parsed.precision : 'year')
    setActiveStep(parsed.day ? parsed.precision : 'year')
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => setAnchorEl(null)

  const handleApply = () => {
    onChange(draft ? serializePublicationDate(draft, precision) : null)
    handleClose()
  }

  const clearSelection = () => {
    setDraft(null)
    setPrecision('year')
    setActiveStep('year')
  }

  const canGoTo = (i: number) =>
    i <= precisionIndex || (i === precisionIndex + 1 && draft != null)

  const goToStep = (i: number) => {
    if (!canGoTo(i)) return
    setActiveStep(STEPS[i])
    if (i <= precisionIndex) setPrecision(STEPS[i])
  }

  const onYearPick = (picked: Dayjs) => {
    setDraft((prev) => (prev ?? picked).year(picked.year()))
    setPrecision('year')
    setActiveStep('month')
  }
  const onMonthPick = (picked: Dayjs) => {
    setDraft((prev) => (prev ?? picked).month(picked.month()))
    setPrecision('month')
    setActiveStep('day')
  }
  const onDayPick = (picked: Dayjs | null) => {
    if (!picked) return
    setDraft(picked)
    setPrecision('day')
  }

  const shown = activeIndex <= precisionIndex ? draft : null
  const referenceDate = draft ?? dayjs()

  const displayValue = value
    ? formatPublicationDate(value, locale)
    : t`hal_deposit_field_conference_start_date_empty`

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TextField
        size='small'
        label={label}
        required={required}
        error={error}
        value={displayValue}
        slotProps={{ input: { readOnly: true } }}
        onClick={disabled ? undefined : handleOpen}
        sx={{ flex: 1, cursor: disabled ? 'default' : 'pointer' }}
      />
      <Tooltip title={t`hal_deposit_field_conference_start_date_edit`}>
        <span>
          <IconButton
            aria-label={t`hal_deposit_field_conference_start_date_edit`}
            disabled={disabled}
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography variant='subtitle2'>
              <Trans>hal_deposit_field_conference_start_date_select</Trans>
            </Typography>
            <Tooltip title={t`hal_deposit_field_conference_start_date_remove`}>
              <span>
                <IconButton
                  aria-label={t`hal_deposit_field_conference_start_date_remove`}
                  size='small'
                  color='error'
                  disabled={!draft}
                  onClick={clearSelection}
                >
                  <DeleteOutlineIcon fontSize='small' />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Stepper nonLinear activeStep={activeIndex} alternativeLabel>
            {STEPS.map((step, i) => (
              <Step key={step}>
                <StepButton
                  onClick={() => goToStep(i)}
                  disabled={!canGoTo(i)}
                  icon={<StepDot n={i + 1} reached={i <= activeIndex} />}
                  sx={{
                    '& .MuiStepLabel-label': {
                      color:
                        i <= activeIndex ? 'text.primary' : 'text.disabled',
                    },
                  }}
                >
                  {step === 'year' && (
                    <Trans>
                      hal_deposit_field_conference_start_date_step_year
                    </Trans>
                  )}
                  {step === 'month' && (
                    <Trans>
                      hal_deposit_field_conference_start_date_step_month
                    </Trans>
                  )}
                  {step === 'day' && (
                    <Trans>
                      hal_deposit_field_conference_start_date_step_day
                    </Trans>
                  )}
                </StepButton>
              </Step>
            ))}
          </Stepper>

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
                    '&:hover, &:focus': { backgroundColor: 'primary.main' },
                  },
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>
              <Trans>document_details_page_cancel_button</Trans>
            </Button>
            <Button variant='contained' onClick={handleApply}>
              <Trans>document_details_page_apply_button</Trans>
            </Button>
          </Box>
        </Stack>
      </Popover>
    </Box>
  )
}

export default PartialDateField
