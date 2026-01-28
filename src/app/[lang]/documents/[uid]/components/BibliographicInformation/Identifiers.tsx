import { useTheme } from '@mui/material/styles'
import useStore from '@/stores/global_store'
import { Alert, Box, Chip, Snackbar, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { PublicationIdentifier } from '@/types/PublicationIdentifier'
import { CheckCircle, ContentCopy } from '@mui/icons-material'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  BibliographicPlatform,
  BibliographicPlatformMetadata,
} from '@/types/BibliographicPlatform'

const Identifiers = () => {
  const theme = useTheme()
  const { selectedDocument = null } = useStore((state) => state.document)
  const [open, setOpen] = useState(false)
  const [copyIdType, setCopyIdType] = useState<string | null>(null)
  const [count, setCount] = useState(0)

  const [identifiers, altIdentifiers]: [
    PublicationIdentifier[],
    { id: string; platform: BibliographicPlatform }[],
  ] = useMemo(() => {
    const uniqueIdentifiers: PublicationIdentifier[] = []
    const altIdentifiers: { id: string; platform: BibliographicPlatform }[] = []
    selectedDocument?.records.map((record) => {
      const sourceId = record.sourceIdentifier
      const platform = record.platform
      if (sourceId) {
        const exist = altIdentifiers.some(
          (id) => id.id == sourceId && id.platform == platform,
        )
        if (!exist) {
          altIdentifiers.push({ id: sourceId, platform: platform })
        }
      }
      record.identifiers.map((identifier) => {
        const exist = uniqueIdentifiers.some((id) => id.uid === identifier.uid)
        if (!exist) {
          uniqueIdentifiers.push(identifier)
        }
      })
    })
    return [uniqueIdentifiers, altIdentifiers]
  }, [selectedDocument])

  const handleClick = (identifier: PublicationIdentifier | string) => {
    let id: string
    if (identifier instanceof PublicationIdentifier) {
      setCopyIdType(identifier.type.toUpperCase())
      id = identifier.value ? identifier.value : ''
    } else {
      setCopyIdType(null)
      setCount(count + 1)
      id = identifier
    }
    navigator.clipboard.writeText(id).then(
      () => {
        setOpen(true)
      },
      (error) => {
        console.error(
          'Failed to copy identifier ' + id + ' to clipboard : ' + error,
        )
      },
    )
  }

  const handleClose = () => {
    setOpen(false)
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
      {identifiers.map(
        (identifier, index) =>
          identifier.value && (
            <Chip
              key={index}
              clickable
              color='primary'
              onClick={() => handleClick(identifier)}
              sx={{
                borderRadius: theme.utils.pxToRem(4),
                backgroundColor: 'rgba(0, 106, 97, 0.10)',
                letterSpacing: '0.1px',
                lineHeight: theme.typography.lineHeight.lineHeight20px,
                fontWeight: theme.typography.fontWeightRegular,
                color: theme.palette.primary.main,
                fontSize: theme.utils.pxToRem(14),
              }}
              variant='outlined'
              icon={<ContentCopy />}
              label={identifier.type.toUpperCase() + ' : ' + identifier.value}
            />
          ),
      )}

      {identifiers.length == 0 &&
        altIdentifiers.length != 0 &&
        altIdentifiers.map((identifier, index) => (
          <Chip
            key={index}
            clickable
            color='primary'
            onClick={() => handleClick(identifier.id)}
            sx={{
              borderRadius: theme.utils.pxToRem(4),
              backgroundColor: 'rgba(0, 106, 97, 0.10)',
              letterSpacing: '0.1px',
              lineHeight: theme.typography.lineHeight.lineHeight20px,
              fontWeight: theme.typography.fontWeightRegular,
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(14),
            }}
            variant='outlined'
            icon={<ContentCopy />}
            label={
              BibliographicPlatformMetadata[identifier.platform].name +
              ' : ' +
              identifier.id
            }
          />
        ))}

      {identifiers.length == 0 && altIdentifiers.length == 0 && (
        <Typography>
          <Trans>
            document_details_page_identifiers_no_identifiers_message
          </Trans>
        </Typography>
      )}

      <Snackbar
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={4000}
        key={copyIdType ? copyIdType : count}
        onClose={() => handleClose()}
        open={open}
      >
        <Alert
          icon={<CheckCircle fontSize={'inherit'} />}
          severity='success'
          sx={{ width: '100%', color: 'success.main', boxShadow: 2 }}
        >
          {copyIdType
            ? copyIdType +
              ' ' +
              t`document_details_page_identifiers_copy_message`
            : t`document_details_page_identifiers_copy_default_message`}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default Identifiers
