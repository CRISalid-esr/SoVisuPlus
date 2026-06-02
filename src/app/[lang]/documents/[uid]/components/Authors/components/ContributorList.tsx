import { Box, Button, Stack } from '@mui/material'
import { Add, PersonAddAlt1 } from '@mui/icons-material'
import { t } from '@lingui/core/macro'
import { ContributionsEditor } from '../hooks/useContributionsEditor'
import { halStructureToAffiliation } from '../lib/halMapping'
import ContributionCard from './ContributionCard'

interface ContributorListProps {
  editor: ContributionsEditor
  readOnly?: boolean
}

const ContributorList = ({ editor, readOnly }: ContributorListProps) => {
  const { working, rankingMode, isFrozen } = editor
  const disabled = isFrozen

  const insertButton = (index: number) => (
    <Box
      sx={{ textAlign: 'center', my: 0.5, py: 0.5, borderRadius: 1 }}
      // The gap is also a drop target: dropping here reorders the dragged card
      // into this position (between the two surrounding contributors).
      onDragOver={(event) => {
        if (!disabled) event.preventDefault()
      }}
      onDrop={(event) => {
        if (disabled) return
        event.preventDefault()
        const from = Number(event.dataTransfer.getData('text/plain'))
        if (!Number.isNaN(from)) editor.reorderToGap(from, index)
      }}
    >
      <Button
        size='small'
        startIcon={<PersonAddAlt1 />}
        disabled={disabled}
        onClick={(event) => {
          editor.insertContribution(index)
          event.currentTarget.blur() // deselect after click
        }}
      >
        {t`documents_details_page_authors_tab_insert_contributor`}
      </Button>
    </Box>
  )

  return (
    // More breathing room between cards when ranking mode is off (no insert rows).
    <Stack spacing={rankingMode ? 1 : 2}>
      {working.map((contribution, index) => (
        <Box key={contribution.localId}>
          {/* Insert buttons sit between cards only (no button above the first). */}
          {!readOnly && rankingMode && index > 0 && insertButton(index)}
          <ContributionCard
            contribution={contribution}
            index={index}
            total={working.length}
            rankingMode={rankingMode}
            disabled={disabled}
            readOnly={readOnly}
            onRemove={() => editor.removeContribution(contribution.localId)}
            onMove={(direction) =>
              editor.moveContribution(contribution.localId, direction)
            }
            onReorder={(from, to) => editor.reorderContribution(from, to)}
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

      {!readOnly && (
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Button
            startIcon={<Add />}
            variant='outlined'
            disabled={disabled}
            onClick={() => editor.addContribution()}
          >
            {t`documents_details_page_authors_tab_add_contributor`}
          </Button>
        </Box>
      )}
    </Stack>
  )
}

export default ContributorList
