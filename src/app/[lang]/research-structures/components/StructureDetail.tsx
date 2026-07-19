'use client'

import { t } from '@lingui/core/macro'
import * as Lingui from '@lingui/core'
import {
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { nationalTypeLabel } from '@/app/[lang]/components/organizationTypeLabels'
import { StructureRow } from './directoryRows'
import RateBar from './RateBar'
import StructureMembersTable from './StructureMembersTable'

const Kpi = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <Paper variant='outlined' sx={{ p: 2, flex: 1, minWidth: 140 }}>
    <Typography variant='caption' color='text.secondary'>
      {label}
    </Typography>
    <Box sx={{ mt: 0.5 }}>{children}</Box>
  </Paper>
)

/**
 * Right panel of the Arborescence view: header, KPIs, direct children and
 * members of the selected structure.
 */
const StructureDetail = ({
  row,
  onNavigate,
  onSelectChild,
}: {
  row: StructureRow
  onNavigate: (row: StructureRow) => void
  onSelectChild: (nodeId: string) => void
}) => {
  const theme = useTheme()
  const typeLabel = nationalTypeLabel(Lingui.i18n, row.nationalType)
  const children = row.subRows ?? []

  return (
    <Stack spacing={3}>
      <Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant='h5'>{row.acronym}</Typography>
          {typeLabel && <Chip label={typeLabel} size='small' />}
          {row.external && (
            <Chip
              label={t`research_structures_chip_external`}
              size='small'
              variant='outlined'
              color='warning'
            />
          )}
        </Box>
        {row.name !== row.acronym && (
          <Typography variant='subtitle1' color='text.secondary'>
            {row.name}
          </Typography>
        )}
        {row.institutionNames.length > 0 && (
          <Typography variant='body2' sx={{ mt: 0.5 }}>
            {t`research_structures_column_institutions`} :{' '}
            {row.institutionNames.join(', ')}
          </Typography>
        )}
        {row.slug && (
          <Button
            size='small'
            variant='outlined'
            sx={{ mt: 1.5 }}
            onClick={() => onNavigate(row)}
          >
            {t`research_structures_dashboard_link`}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Kpi label={t`research_structures_column_members`}>
          <Typography variant='h6'>
            {row.membersCount.toLocaleString(Lingui.i18n.locale)}
          </Typography>
        </Kpi>
        <Kpi label={t`research_structures_column_publications`}>
          <Typography variant='h6'>
            {row.publicationsCount > 0
              ? row.publicationsCount.toLocaleString(Lingui.i18n.locale)
              : '—'}
          </Typography>
        </Kpi>
        <Kpi label='OA'>
          <RateBar value={row.oaRate} color={theme.palette.success.main} />
        </Kpi>
        <Kpi label='HAL'>
          <RateBar value={row.halRate} color={theme.palette.primary.main} />
        </Kpi>
      </Box>

      {children.length > 0 && (
        <Box>
          <Typography variant='h6' sx={{ mb: 1 }}>
            {t`research_structures_detail_children`} ({children.length})
          </Typography>
          <List
            dense
            disablePadding
            sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
          >
            {children.map((child) => (
              <ListItemButton
                key={child.uid}
                divider
                onClick={() => onSelectChild(child.uid)}
              >
                <ListItemText
                  primary={child.acronym}
                  secondary={
                    child.name !== child.acronym ? child.name : undefined
                  }
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      )}

      <Box>
        <Typography variant='h6' sx={{ mb: 1 }}>
          {t`research_structures_members_title`}
        </Typography>
        {/* Keyed by structure so pagination/sorting reset on selection change */}
        <StructureMembersTable
          key={row.originalUid ?? row.uid}
          structureUid={row.originalUid ?? row.uid}
        />
      </Box>
    </Stack>
  )
}

export default StructureDetail
