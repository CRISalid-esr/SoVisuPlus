import { Trans } from '@lingui/react/macro'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { IconButton, Typography } from '@mui/material'
import { Box } from '@mui/system'
import { useRouter, useSearchParams } from 'next/navigation'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import * as Lingui from '@lingui/core'

const DocumentDetailsHeader = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentPerspective, connectedUser } = useStore((state) => state.user)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode

  const backToPublicationList = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('tab')
    router.push(`/${lang}/documents?${params.toString()}`)
  }

  return (
    <Box
      mb={3}
      onClick={() => backToPublicationList()}
      sx={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <IconButton>
        <ArrowBackIcon />
      </IconButton>
      <Typography>
        {connectedUser?.person?.uid !== currentPerspective?.uid ? (
          <>
            <Trans>document_details_page_back_to_publications</Trans> :{' '}
            {currentPerspective?.getDisplayName(lang) || ''}
          </>
        ) : (
          <Trans>document_details_page_back_to_my_publications</Trans>
        )}
      </Typography>
    </Box>
  )
}

export default DocumentDetailsHeader
