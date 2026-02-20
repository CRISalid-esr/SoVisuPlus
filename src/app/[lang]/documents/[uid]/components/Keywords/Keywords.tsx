import { CustomCard } from '@/components/Card'
import { Trans } from '@lingui/react'
import {
  Box,
  CardContent,
  Checkbox,
  FormGroup,
  IconButton,
  Link,
  Paper,
  Tooltip,
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
import { VOCABS } from '@/lib/services/Vocabs'
import Image from 'next/image'
import { Help, HelpOutline } from '@mui/icons-material'

const Keywords = () => {
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
              {groups.length > 0 ? (
                groups.map((group) => (
                  <ConceptChip
                    key={group.uid as string}
                    group={group}
                    language={lang as ExtendedLanguageCode}
                    removable={allowed}
                    onRemoveConcepts={onRemoveConcepts}
                  />
                ))
              ) : (
                <Typography sx={{ fontStyle: 'italic' }}>
                  <Trans id='document_details_page_keywords_tab_card_empty_content' />
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                display: allowed ? 'flex' : 'none',
                gap: '20px',
                alignItems: 'start',
                marginTop: '45px',
                flexDirection: 'column',
              }}
            >
              <Typography sx={{ fontSize: '17px' }}>
                <Trans id='document_details_page_keywords_search_field_title' />
              </Typography>
              <FormGroup
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateRows: 'repeat(2,1fr)',
                  gridTemplateColumns: 'repeat(2,1fr)',
                  marginBottom: '12px',
                  width: '100%',
                }}
              >
                {Vocab.getVocabs()?.map(
                  (vocab) =>
                    Object.keys(VOCABS).includes(vocab.toUpperCase()) && (
                      <Paper
                        key={vocab + '-checkbox'}
                        sx={{
                          alignItems: 'center',
                          display: 'flex',
                          gap: 1,
                          padding: '10px 8px',
                        }}
                      >
                        <Checkbox
                          onChange={handleCheckboxChange}
                          name={vocab}
                        />
                        <Box
                          sx={{ alignItems: 'center', display: 'flex', gap: 1 }}
                        >
                          <Image
                            src={VOCABS[vocab.toUpperCase()]?.icon || ''}
                            alt={vocab.toUpperCase()}
                            width={24}
                            height={24}
                          />
                          <Link
                            href={VOCABS[vocab.toUpperCase()]?.url || ''}
                            target='_blank'
                            rel='noopener noreferrer'
                            sx={{ display: 'inherit' }}
                          >
                            <Typography>
                              {VOCABS[vocab.toUpperCase()]?.name || ''}
                            </Typography>
                          </Link>
                        </Box>
                        <Tooltip
                          title={VOCABS[vocab.toUpperCase()]?.org || ''}
                          key={vocab + '-checkbox-and-label'}
                        >
                          <IconButton sx={{ marginLeft: 'auto' }}>
                            <HelpOutline />
                          </IconButton>
                        </Tooltip>
                      </Paper>
                    ),
                )}
              </FormGroup>
              <KeywordSearchAutocomplete
                selectedVocabs={
                  selectedVocabs
                    ? Object.keys(selectedVocabs).filter(
                        (key) => selectedVocabs[key],
                      )
                    : []
                }
              />
            </Box>
          </CardContent>
        </CustomCard>
      )}
    </Can>
  )
}

export default Keywords
