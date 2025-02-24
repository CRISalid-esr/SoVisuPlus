import useStore from '@/stores/global_store'
import { Trans } from '@lingui/macro'
import EditIcon from '@mui/icons-material/Edit'
import { Box, Button, Chip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const DocumentDetailsCardAuthors = () => {
  const theme = useTheme()
  const { selectedDocument = null } = useStore((state) => state.document)

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
        <Trans>document_details_page_authors_row_label</Trans>
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
        {selectedDocument?.contributions.map((contribution, index) => (
          <Chip
            key={index}
            sx={{
              borderRadius: theme.utils.pxToRem(4),
              backgroundColor: 'rgba(0, 106, 97, 0.10)',
              letterSpacing: '0.1px',
              lineHeight: theme.typography.lineHeight.lineHeight20px,
              fontWeight: theme.typography.fontWeightRegular,
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(14),
            }}
            label={contribution.person.displayName}
          />
        ))}
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
          <Trans>document_details_page_authors_row_update_author</Trans>
        </Button>
      </Box>
    </>
  )
}

export default DocumentDetailsCardAuthors
