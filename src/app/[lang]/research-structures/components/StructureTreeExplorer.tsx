'use client'

import { t } from '@lingui/core/macro'
import SearchIcon from '@mui/icons-material/Search'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { RichTreeView } from '@mui/x-tree-view/RichTreeView'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildDirectoryForest, StructureRow } from './directoryRows'
import {
  ancestorsOf,
  buildTreeItems,
  filterForest,
  indexForest,
} from './treeExplorerUtils'
import StructureDetail from './StructureDetail'

/**
 * Master-detail Arborescence view: RichTreeView over the same forest as the
 * hierarchical table on the left, detail panel for the selected structure on
 * the right. The selection is synced to the `structure` query param as the
 * bare structure uid; a uid duplicated across roots resolves to its first
 * occurrence in tree order.
 */
const StructureTreeExplorer = ({
  data,
  includeExternal,
  onNavigate,
}: {
  data: StructureRow[]
  includeExternal: boolean
  onNavigate: (row: StructureRow) => void
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const forest = useMemo(
    () => buildDirectoryForest(data, includeExternal),
    [data, includeExternal],
  )
  const index = useMemo(() => indexForest(forest), [forest])

  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const preFilterExpanded = useRef<string[] | null>(null)
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedItem

  const filtered = useMemo(
    () => (search.trim() !== '' ? filterForest(forest, search.trim()) : null),
    [forest, search],
  )
  const displayedForest = filtered ? filtered.forest : forest
  const items = useMemo(
    () => buildTreeItems(displayedForest),
    [displayedForest],
  )

  // While a filter is active, keep the ancestor chain of every match open.
  useEffect(() => {
    if (filtered) {
      setExpandedItems(filtered.expandedIds)
    }
  }, [filtered])

  const selectNode = useCallback(
    (nodeId: string | null) => {
      setSelectedItem(nodeId)
      if (nodeId !== null) {
        setExpandedItems((prev) => [
          ...new Set([...prev, ...ancestorsOf(nodeId, index.parentByNodeId)]),
        ])
      }
      const row = nodeId !== null ? index.rowByNodeId.get(nodeId) : undefined
      const uid = row ? (row.originalUid ?? row.uid) : null
      const params = new URLSearchParams(searchParams.toString())
      if (uid) {
        params.set('structure', uid)
      } else {
        params.delete('structure')
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    },
    [index, pathname, router, searchParams],
  )

  // URL → selection: deep link on load, back/forward, and re-resolution when
  // the forest changes (e.g. the external switch). Skipped when the current
  // selection already carries the uid, so the updates pushed by selectNode
  // (possibly on a non-first occurrence) don't bounce the selection around.
  const urlUid = searchParams.get('structure')
  useEffect(() => {
    if (!urlUid) {
      return
    }
    const current =
      selectedRef.current !== null
        ? index.rowByNodeId.get(selectedRef.current)
        : undefined
    if (current && (current.originalUid ?? current.uid) === urlUid) {
      return
    }
    const nodeId = index.firstNodeIdByUid.get(urlUid)
    if (!nodeId) {
      return
    }
    setSelectedItem(nodeId)
    setExpandedItems((prev) => [
      ...new Set([...prev, ...ancestorsOf(nodeId, index.parentByNodeId)]),
    ])
  }, [urlUid, index])

  const handleSearchChange = (value: string) => {
    const wasFiltering = search.trim() !== ''
    const isFiltering = value.trim() !== ''
    if (isFiltering && !wasFiltering) {
      preFilterExpanded.current = expandedItems
    }
    if (!isFiltering && wasFiltering) {
      setExpandedItems(preFilterExpanded.current ?? [])
      preFilterExpanded.current = null
    }
    setSearch(value)
  }

  const selectedRow =
    selectedItem !== null ? index.rowByNodeId.get(selectedItem) : undefined

  return (
    <Box
      sx={{
        display: 'flex',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        height: 'calc(100vh - 340px)',
        minHeight: 480,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: 360,
          flexShrink: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            p: 1.5,
            pb: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <TextField
            size='small'
            fullWidth
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={t`research_structures_tree_search_placeholder`}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon fontSize='small' />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Tooltip title={t`research_structures_tree_expand_all`}>
            <IconButton
              size='small'
              onClick={() =>
                setExpandedItems(
                  filtered ? filtered.expandedIds : index.expandableNodeIds,
                )
              }
            >
              <UnfoldMoreIcon fontSize='small' />
            </IconButton>
          </Tooltip>
          <Tooltip title={t`research_structures_tree_collapse_all`}>
            <IconButton size='small' onClick={() => setExpandedItems([])}>
              <UnfoldLessIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 1 }}>
          {items.length === 0 ? (
            <Typography variant='body2' color='text.secondary' sx={{ p: 1 }}>
              {t`research_structures_tree_no_results`}
            </Typography>
          ) : (
            <RichTreeView
              items={items}
              selectedItems={selectedItem}
              onSelectedItemsChange={(_, itemId) => selectNode(itemId)}
              expandedItems={expandedItems}
              onExpandedItemsChange={(_, itemIds) => setExpandedItems(itemIds)}
              expansionTrigger='iconContainer'
              sx={{
                '& .MuiTreeItem-label': {
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '0.875rem',
                },
              }}
            />
          )}
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {selectedRow ? (
          <StructureDetail
            row={selectedRow}
            onNavigate={onNavigate}
            onSelectChild={selectNode}
          />
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant='body1' color='text.secondary'>
              {t`research_structures_tree_empty_state`}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default StructureTreeExplorer
