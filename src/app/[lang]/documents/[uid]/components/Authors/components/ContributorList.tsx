import { Box, Button, Stack } from '@mui/material'
import { Add, PersonAddAlt1 } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { ContributionsEditor } from '../hooks/useContributionsEditor'
import { halStructureToAffiliation } from '../lib/halMapping'
import ContributionCard from './ContributionCard'

const ContributorList = ({ editor }: { editor: ContributionsEditor }) => {
  const { working, rankingMode, isFrozen } = editor

  const insertButton = (index: number) => (
    <Box sx={{ textAlign: 'center', my: 0.5 }}>
      <Button
        size='small'
        startIcon={<PersonAddAlt1 />}
        disabled={isFrozen}
        onClick={() => editor.insertContribution(index)}
      >
        {t`documents_details_page_authors_tab_insert_contributor`}
      </Button>
    </Box>
  )

  return (
    <Stack spacing={1}>
      {working.map((contribution, index) => (
        <Box key={contribution.localId}>
          {rankingMode && insertButton(index)}
          <ContributionCard
            contribution={contribution}
            index={index}
            total={working.length}
            rankingMode={rankingMode}
            disabled={isFrozen}
            onRemove={() => editor.removeContribution(contribution.localId)}
            onMove={(direction) =>
              editor.moveContribution(contribution.localId, direction)
            }
            onSelectProfile={(doc) =>
              editor.applyHalAuthor(contribution.localId, doc)
            }
            onAddContributor={(inputText) =>
              editor.markNotAligned(contribution.localId, inputText)
            }
            onSetRoles={(roles) => editor.setRoles(contribution.localId, roles)}
            onRemoveAffiliation={(affLocalId) =>
              editor.removeAffiliation(contribution.localId, affLocalId)
            }
            onReplaceAffiliation={(affLocalId, doc) =>
              editor.replaceAffiliation(
                contribution.localId,
                affLocalId,
                halStructureToAffiliation(doc),
              )
            }
            onAddAffiliation={(doc) =>
              editor.addAffiliation(
                contribution.localId,
                halStructureToAffiliation(doc),
              )
            }
          />
        </Box>
      ))}

      <Box sx={{ textAlign: 'center', mt: 1 }}>
        <Button
          startIcon={<Add />}
          variant='outlined'
          disabled={isFrozen}
          onClick={() => editor.addContribution()}
        >
          {t`documents_details_page_authors_tab_add_contributor`}
        </Button>
      </Box>
    </Stack>
  )
}

export default ContributorList
