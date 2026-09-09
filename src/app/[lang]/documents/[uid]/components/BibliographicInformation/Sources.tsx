import { Trans } from '@lingui/react/macro'
import useStore from '@/stores/global_store'
import * as Lingui from '@lingui/core'
import EditIcon from '@mui/icons-material/Edit'
import { Avatar, Box, Button, Chip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
// Make sure to import your enums/metadata for bibliographic platforms
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ReactElement, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'

const Sources = () => {
  const theme = useTheme()
  const { selectedDocument = null } = useStore((state) => state.document)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { uid } = useParams<{ uid: string }>()
  const lang = Lingui.i18n.locale

  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  // Visible to editors — anyone who can update the document — regardless of the
  // document state. The button only navigates to the Sources tab.
  const canEdit = !!(
    selectedDocument && ability.can(PermissionAction.update, selectedDocument)
  )

  const goToSourcesTab = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'sources')
    router.push(`/${lang}/documents/${uid}?${params.toString()}`)
  }

  const orderedPlatforms = Object.values(BibliographicPlatform)

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: theme.spacing(1),
        alignItems: 'center',
      }}
    >
      {orderedPlatforms.reduce<ReactElement[]>((acc, platform) => {
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
              label={BibliographicPlatformMetadata[record.platform].name}
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
      {canEdit && (
        <Button
          variant='outlined'
          startIcon={<EditIcon />}
          onClick={goToSourcesTab}
          sx={{ minWidth: 'fit-content' }}
        >
          <Trans>document_details_page_sources_row_update_source</Trans>
        </Button>
      )}
    </Box>
  )
}

export default Sources
