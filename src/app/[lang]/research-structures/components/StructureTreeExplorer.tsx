'use client'

import { t } from '@lingui/core/macro'
import * as Lingui from '@lingui/core'
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
import { TreeItem, TreeItemProps } from '@mui/x-tree-view/TreeItem'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { buildDirectoryForest, StructureRow } from './directoryRows'
import {
  ancestorsOf,
  buildTreeItems,
  clampPanelWidth,
  decorateForest,
  filterForest,
  indexForest,
  PANEL_WIDTH,
  PANEL_WIDTH_KEY,
} from './treeExplorerUtils'
import { isGroupNodeId, structureGroupLabel } from './structureGroups'
import StructureDetail from './StructureDetail'

const KEYBOARD_RESIZE_STEP = 16

/**
 * Tree item that renders the synthetic group headers as quiet section titles
 * rather than as selectable structures.
 */
const StructureTreeItem = forwardRef<HTMLLIElement, TreeItemProps>(
  function StructureTreeItem(props, ref) {
    if (!isGroupNodeId(props.itemId)) {
      return <TreeItem {...props} ref={ref} />
    }
    return (
      <TreeItem
        {...props}
        ref={ref}
        // The icon container's own click handler does not stop propagation, so
        // the click also reaches the content handler and fires a selection —
        // which, for a group, would toggle the expansion a second time and
        // cancel it out. Keep the icon click to expansion only.
        slotProps={{
          iconContainer: {
            onClick: (event) => event.stopPropagation(),
          },
        }}
        sx={{
          '& > .MuiTreeItem-content': {
            cursor: 'default',
            '&.Mui-selected, &.Mui-selected.Mui-focused': {
              backgroundColor: 'transparent',
            },
          },
          '& > .MuiTreeItem-content .MuiTreeItem-label': {
            textTransform: 'uppercase',
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'text.secondary',
          },
        }}
      />
    )
  },
)

/**
 * Master-detail Arborescence view: RichTreeView over the same forest as the
 * hierarchical table on the left, detail panel for the selected structure on
 * the right. The selection is synced to the `structure` query param as the
 * bare structure uid; a uid duplicated across roots resolves to its first
 * occurrence in tree order.
 *
 * The forest goes through `decorateForest` before being indexed, which sorts
 * siblings alphabetically and inserts the group headers under institutions.
 * The panel split is draggable, its width persisted per browser.
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
  const locale = Lingui.i18n.locale

  const forest = useMemo(
    () => buildDirectoryForest(data, includeExternal),
    [data, includeExternal],
  )
  const displayForest = useMemo(
    () =>
      decorateForest(
        forest,
        (key) => structureGroupLabel(Lingui.i18n, key),
        locale,
      ),
    [forest, locale],
  )
  const index = useMemo(() => indexForest(displayForest), [displayForest])

  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const preFilterExpanded = useRef<string[] | null>(null)
  const selectedRef = useRef<string | null>(null)
  selectedRef.current = selectedItem

  const containerRef = useRef<HTMLDivElement>(null)
  const [leftWidth, setLeftWidth] = useState<number>(PANEL_WIDTH.default)
  const [dragging, setDragging] = useState(false)

  // Read on mount only: localStorage is unavailable during SSR, so a lazy
  // useState initializer would break hydration (cf. ThemeContext).
  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(PANEL_WIDTH_KEY))
      if (Number.isFinite(stored) && stored > 0) {
        setLeftWidth(clampPanelWidth(stored))
      }
    } catch {
      // Private mode or blocked storage: keep the default width.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(leftWidth))
    } catch {
      // Nothing to do: the width simply won't be restored next time.
    }
  }, [leftWidth])

  const filtered = useMemo(
    () =>
      search.trim() !== '' ? filterForest(displayForest, search.trim()) : null,
    [displayForest, search],
  )
  const displayedForest = filtered ? filtered.forest : displayForest
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
      // Group headers are containers, not structures: clicking one toggles it
      // and leaves the current selection (and the URL) untouched.
      if (nodeId !== null && isGroupNodeId(nodeId)) {
        setExpandedItems((prev) =>
          prev.includes(nodeId)
            ? prev.filter((id) => id !== nodeId)
            : [...prev, nodeId],
        )
        return
      }
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

  const resizeTo = (clientX: number) => {
    const container = containerRef.current
    if (container) {
      setLeftWidth(
        clampPanelWidth(clientX - container.getBoundingClientRect().left),
      )
    }
  }

  const selectedRow =
    selectedItem !== null && !isGroupNodeId(selectedItem)
      ? index.rowByNodeId.get(selectedItem)
      : undefined

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        height: 'calc(100vh - 340px)',
        minHeight: 480,
        overflow: 'hidden',
        userSelect: dragging ? 'none' : undefined,
      }}
    >
      <Box
        sx={{
          width: leftWidth,
          flexShrink: 0,
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
              slots={{ item: StructureTreeItem }}
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
      <Box
        role='separator'
        aria-orientation='vertical'
        aria-label={t`research_structures_tree_resize_handle`}
        aria-valuenow={leftWidth}
        aria-valuemin={PANEL_WIDTH.min}
        aria-valuemax={PANEL_WIDTH.max}
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragging(true)
        }}
        onPointerMove={(event) => {
          if (dragging) {
            resizeTo(event.clientX)
          }
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId)
          setDragging(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            const delta =
              event.key === 'ArrowLeft'
                ? -KEYBOARD_RESIZE_STEP
                : KEYBOARD_RESIZE_STEP
            setLeftWidth((prev) => clampPanelWidth(prev + delta))
          }
        }}
        sx={{
          width: '7px',
          flexShrink: 0,
          cursor: 'col-resize',
          borderLeft: 1,
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: dragging ? 'action.selected' : undefined,
          touchAction: 'none',
          '&:hover, &:focus-visible': { bgcolor: 'action.hover' },
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: 3 }}>
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
