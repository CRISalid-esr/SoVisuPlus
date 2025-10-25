import { Trans } from '@lingui/react/macro'
import useStore from '@/stores/global_store'
import EditIcon from '@mui/icons-material/Edit'
import { Box, Button, Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Person } from '@/types/Person'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import * as Lingui from '@lingui/core'

const Authors = () => {
  const theme = useTheme()
  const { selectedDocument = null } = useStore((state) => state.document)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { uid } = useParams<{ uid: string }>()
  const lang = Lingui.i18n.locale

  const goToAuthorsTab = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'authors')
    router.push(`/${lang}/documents/${uid}?${params.toString()}`)
  }

  const handleInternalAuthorClick = (author: Person) => {
    if (!author || !author.slug) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('perspective', author.slug)
    params.delete('tab')
    router.push(`/${lang}/documents?${params.toString()}`)
  }

  return (
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
          onClick={() => {
            if (!contribution.person.external) {
              handleInternalAuthorClick(contribution.person)
            }
          }}
          sx={{
            borderRadius: theme.utils.pxToRem(4),
            backgroundColor: contribution.person.external
              ? theme.palette.lightSecondaryContainer
              : theme.palette.primary.main,
            letterSpacing: '0.1px',
            lineHeight: theme.typography.lineHeight.lineHeight20px,
            fontWeight: theme.typography.fontWeightRegular,
            color: contribution.person.external
              ? theme.palette.getContrastText(theme.palette.secondary.dark)
              : theme.palette.primary.contrastText,
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.85,
            },
            fontSize: theme.utils.pxToRem(14),
          }}
          label={contribution.person.displayName}
        />
      ))}
      <Button
        variant='outlined'
        startIcon={<EditIcon />}
        onClick={goToAuthorsTab}
      >
        <Trans>document_details_page_authors_row_update_author</Trans>
      </Button>
    </Box>
  )
}

export default Authors
