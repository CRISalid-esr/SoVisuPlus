import useStore from '@/stores/global_store'
import { Trans } from '@lingui/macro'
import EditIcon from '@mui/icons-material/Edit'
import { Avatar, Box, Button, Chip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
// Make sure to import your enums/metadata for bibliographic platforms
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'

const DocumentDetailsCardSources = () => {
  const theme = useTheme()
  const { selectedDocument = null } = useStore((state) => state.document)

  // Ordered platforms as in your datatable cell
  const orderedPlatforms = Object.values(BibliographicPlatform)

  return (
    <>
      <Typography
        sx={{
          color: theme.palette.primary.main,
          fontSize: theme.utils.pxToRem(14),
          fontStyle: 'normal',
          fontWeight: theme.typography[500],
          lineHeight: 'normal',
          letterSpacing: '0.1px',
        }}
      >
        <Trans>document_details_page_sources_row_label</Trans>
      </Typography>
      <Box />
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: theme.spacing(1),
          alignItems: 'center',
        }}
      >
        {orderedPlatforms.reduce<JSX.Element[]>((acc, platform) => {
          const record = selectedDocument?.records.find(
            (record) => record.platform === platform,
          )
          if (record) {
            const metadata = BibliographicPlatformMetadata[record.platform]
            acc.push(
              <Chip
                sx={{
                  borderRadius: theme.utils.pxToRem(4),
                  backgroundColor: 'rgba(0, 106, 97, 0.10)',
                  letterSpacing: '0.1px',
                  lineHeight: theme.typography.lineHeight.lineHeight20px,
                  fontWeight: theme.typography.fontWeightRegular,
                  color: theme.palette.primary.main,
                  fontSize: theme.utils.pxToRem(14),
                }}
                key={record.platform}
                avatar={<Avatar src={metadata?.icon || '/icons/default.png'} />}
                label={record.platform}
                clickable
                color='primary'
                onClick={() => {
                  if (record.url) {
                    window.open(record.url, '_blank')
                  }
                }}
                variant='outlined'
              />,
            )
          }
          return acc
        }, [])}
        <Button
          variant='contained'
          sx={{
            color: theme.palette.onSecondaryContainer,
            boxShadow: 'none',
            backgroundColor: theme.palette.lightSecondaryContainer,
            fontSize: theme.utils.pxToRem(14),
            fontStyle: 'normal',
            fontWeight: theme.typography[500],
            lineHeight: theme.typography.lineHeight.lineHeight20px,
            letterSpacing: '0.1px',
          }}
          startIcon={<EditIcon />}
        >
          <Trans>document_details_page_sources_row_update_source</Trans>
        </Button>
      </Box>
    </>
  )
}

export default DocumentDetailsCardSources
