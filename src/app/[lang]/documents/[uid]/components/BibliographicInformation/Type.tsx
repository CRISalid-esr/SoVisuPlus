'use client'
import { Trans } from '@lingui/react/macro'
import { useCallback, useMemo, useState } from 'react'
import useStore from '@/stores/global_store'
import { useLingui } from '@lingui/react'
import {
  Box,
  Button,
  Chip,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import { DocumentType } from '@/types/Document'
import { DocumentTypeLabels } from '../../../components/DocumentTypeLabels'
import { DocumentTypeIcons } from '../../../components/DocumentTypeIcons'
import { DocumentTypeService } from '@/lib/services/DocumentTypeService'
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import type { TreeViewBaseItem, TreeViewItemId } from '@mui/x-tree-view'
import { useSession } from 'next-auth/react'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { Can } from '@casl/react'

const Type = () => {
  const { _ } = useLingui()
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user.authz),
    [session?.user?.authz],
  )
  const { selectedDocument, updateDocumentType } = useStore((s) => s.document)

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [pendingType, setPendingType] = useState<DocumentType | null>(null)

  const buildTree = useCallback(
    (t: DocumentType): TreeViewBaseItem => ({
      id: t as unknown as TreeViewItemId,
      label: _(DocumentTypeLabels[t]),
      children: DocumentTypeService.childrenOf(t).map(buildTree),
    }),
    [_],
  )

  const items: TreeViewBaseItem[] = useMemo(() => {
    const roots = DocumentTypeService.childrenOf(DocumentType.Document)
    return roots.map(buildTree)
  }, [buildTree])
  const currentType = selectedDocument?.documentType

  const defaultExpandedItems = useMemo(() => {
    if (!currentType) return []
    return DocumentTypeService.expandedForTreeUI(currentType, {
      includeNonLeaves: true,
      includeRoots: true,
      includeAncestorsOfCurrent: true,
    }).map((t) => t as unknown as TreeViewItemId)
  }, [currentType])

  if (!selectedDocument) return null

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget)
    if (!currentType) return
    setPendingType(currentType)
  }
  const handleClose = () => {
    setAnchorEl(null)
    setPendingType(null)
  }
  const open = !!anchorEl

  const handleSelect = (
    event: React.SyntheticEvent | null,
    selected: string[] | string | null,
  ) => {
    if (
      !ability.can(PermissionAction.update, selectedDocument, 'documentType')
    ) {
      return
    }
    if (DocumentTypeService.isDocumentType(selected)) {
      setPendingType(selected)
    }
  }

  const handleApply = async () => {
    if (
      !ability.can(PermissionAction.update, selectedDocument, 'documentType')
    ) {
      return
    }
    if (!pendingType || pendingType === currentType) return handleClose()
    await updateDocumentType?.(pendingType)
    handleClose()
  }

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      {currentType && (
        <Tooltip title={_(DocumentTypeLabels[currentType])}>
          <Chip
            icon={DocumentTypeIcons[currentType]}
            label={_(DocumentTypeLabels[currentType])}
            sx={{
              maxWidth: '100%',
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            }}
          />
        </Tooltip>
      )}
      <Can
        I={PermissionAction.update}
        a={selectedDocument}
        field='documentType'
        ability={ability}
        passThrough
      >
        {(allowed: boolean) => (
          <>
            <Button
              size='small'
              variant='outlined'
              startIcon={<EditIcon />}
              onClick={handleOpen}
              disabled={!allowed}
              sx={{ minWidth: 'fit-content' }}
            >
              <Trans>document_details_page_type_edit_button</Trans>
            </Button>

            <Popover
              open={open}
              anchorEl={anchorEl}
              onClose={handleClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              slotProps={{
                paper: {
                  sx: { p: 2, minWidth: 360, maxHeight: 420 },
                },
              }}
            >
              <Stack spacing={1.5}>
                <Typography variant='subtitle2'>
                  <Trans>document_details_page_type_select_label</Trans>
                </Typography>

                <Box
                  sx={{
                    border: (t) => `1px solid ${t.palette.divider}`,
                    borderRadius: 1,
                    p: 1,
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  <RichTreeView
                    items={items}
                    checkboxSelection
                    multiSelect={false}
                    selectedItems={
                      (pendingType ?? currentType) as unknown as TreeViewItemId
                    }
                    onSelectedItemsChange={handleSelect}
                    defaultExpandedItems={defaultExpandedItems}
                  />
                </Box>

                <Box
                  sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}
                >
                  <Button onClick={handleClose}>
                    <Trans>document_details_page_cancel_button</Trans>
                  </Button>
                  <Button
                    variant='contained'
                    onClick={handleApply}
                    disabled={!pendingType || pendingType === currentType}
                  >
                    <Trans>document_details_page_apply_button</Trans>
                  </Button>
                </Box>
              </Stack>
            </Popover>
          </>
        )}
      </Can>
    </Box>
  )
}
export default Type
