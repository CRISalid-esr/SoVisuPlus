import { CustomCard } from '@/components/Card'
import { Trans } from '@lingui/react'
import {
  Box,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useStore from '@/stores/global_store'
import { useEffect, useMemo, useState } from 'react'
import { ConceptGroup } from '@/types/ConceptGroup'
import ConceptChip from '@/app/[lang]/documents/[uid]/components/Keywords/ConceptChip'
import * as Lingui from '@lingui/core'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { Concept } from '@/types/Concept'
import KeywordSearchAutocomplete from '@/app/[lang]/documents/[uid]/components/Keywords/components/KeywordSearchAutocomplete'
import { Vocab } from '@/types/Vocab'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { Can } from '@casl/react'

function Keywords() {
  const { data: session } = useSession()

  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  const theme = useTheme()
  const [selectedVocabs, setSelectedVocabs] =
    useState<Record<string, boolean>>()

  const { selectedDocument = null, error = null } = useStore(
    (state) => state.document,
  )
  const removeConcepts = useStore((state) => state.document.removeConcepts)

  const lang = Lingui.i18n.locale

  const groups = useMemo(
    () => ConceptGroup.fromConcepts(selectedDocument?.subjects ?? []),
    [selectedDocument?.subjects],
  )

  const onRemoveConcepts = async (concepts: Concept[]) => {
    if (!selectedDocument) return
    await removeConcepts(concepts.map((c) => c.uid as string))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedVocabs({
      ...selectedVocabs,
      [e.target.name]: e.target.checked,
    })
  }

  useEffect(() => {
    // Implement a centralized error handling
    if (error) {
      console.error('Error in Keywords component:', error)
    }
  }, [error])

  return (
    <Can
      I={PermissionAction.update}
      a={selectedDocument}
      field='subjects'
      ability={ability}
      passThrough
    >
      {(allowed: boolean) => (
        <CustomCard
          header={
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography
                sx={{
                  color: theme.palette.primary.main,
                  fontSize: theme.utils.pxToRem(20),
                  fontStyle: 'normal',
                  fontWeight: theme.typography.fontWeightRegular,
                  lineHeight: 'normal',
                }}
              >
                <Trans id='document_details_page_keywords_tab_card_title' />
              </Typography>
            </Box>
          }
        >
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {groups.map((group) => (
                <ConceptChip
                  key={group.uid as string}
                  group={group}
                  language={lang as ExtendedLanguageCode}
                  removable={allowed}
                  onRemoveConcepts={onRemoveConcepts}
                />
              ))}
            </Box>
            <Box
              sx={{
                display: allowed ? 'flex' : 'none',
                gap: '20px',
                alignItems: 'center',
                marginTop: '15px',
              }}
            >
              <KeywordSearchAutocomplete
                selectedVocabs={
                  selectedVocabs
                    ? Object.keys(selectedVocabs).filter(
                        (key) => selectedVocabs[key],
                      )
                    : []
                }
              />
              <FormGroup
                sx={{ display: 'flex', flexDirection: 'row', width: '30%' }}
              >
                {Vocab.getVocabs().map((vocab) => (
                  <FormControlLabel
                    key={vocab + '-checkbox'}
                    control={
                      <Checkbox onChange={handleCheckboxChange} name={vocab} />
                    }
                    label={vocab.toUpperCase()}
                  />
                ))}
              </FormGroup>
            </Box>
          </CardContent>
        </CustomCard>
      )}
    </Can>
  )
}

export default Keywords
