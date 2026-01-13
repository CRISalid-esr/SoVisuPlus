import { Box, Divider, Tooltip, Typography } from '@mui/material'
import { t } from '@lingui/core/macro'

type PublicationTooltipProps = {
  data: {
    year: number
    total: number
    oa: number
    details: Record<string, number>
  }
}

const PublicationTooltip = ({ data }: PublicationTooltipProps) => {
  return (
    <Tooltip title={''}>
      <Box>
        <Typography
          fontWeight={'bold'}
          sx={{
            borderBottom: '1px solid #eee',
            paddingBottom: '5px',
            marginBottom: '5px',
          }}
        >
          {t`dashboard_page_publication_by_year_graph_tooltip_year` +
            ' ' +
            data.year}
        </Typography>
        <Typography sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {t`dashboard_page_publication_by_year_graph_tooltip_total` +
            ' ' +
            data.total}
        </Typography>
        <Typography
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            color: '#91cc75',
          }}
        >
          {t`dashboard_page_publication_by_year_graph_open_access` +
            ' ' +
            data.oa +
            ' (' +
            ((data.oa / data.total) * 100).toFixed(2) +
            '%)'}
        </Typography>
        <Divider />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr, 1fr',
            gap: '5px',
            marginTop: '10px',
            fontSize: '11px',
          }}
        >
          {Object.entries(data.details).map(([key, value]) => {
            return (
              <Box
                key={key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row',
                }}
              >
                <Typography>{key}:</Typography>
                <Typography fontWeight={'bold'}>{value}</Typography>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Tooltip>
  )
}

export default PublicationTooltip
