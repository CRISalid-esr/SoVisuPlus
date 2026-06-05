import { useCallback, useEffect, useMemo, useState } from 'react'
import useStore from '@/stores/global_store'
import { Document, DocumentState } from '@/types/Document'
import { LocRelator } from '@/types/LocRelator'
import { AureHalAuthorDoc } from '@/lib/services/AureHalAPIClient'
import {
  buildContributionChanges,
  defaultRankingMode,
  workingFromContribution,
} from '../lib/contributionDiff'
import { halAuthorToContributionFields } from '../lib/halMapping'
import { newLocalId } from '../lib/localId'
import { WorkingAffiliation, WorkingContribution } from '../lib/types'

function newContribution(): WorkingContribution {
  return {
    localId: newLocalId(),
    personUid: null,
    displayName: '',
    firstName: null,
    lastName: null,
    identifiers: [],
    roles: [LocRelator.CONTRIBUTOR],
    affiliations: [],
    rank: null,
    notAligned: false,
  }
}

export interface ContributionsEditor {
  working: WorkingContribution[]
  rankingMode: boolean
  isFrozen: boolean
  isDirty: boolean
  contributorCount: number
  setRankingMode: (value: boolean) => void
  addContribution: () => void
  insertContribution: (index: number) => void
  removeContribution: (localId: string) => void
  moveContribution: (localId: string, direction: -1 | 1) => void
  reorderContribution: (fromIndex: number, toIndex: number) => void
  reorderToGap: (fromIndex: number, gapIndex: number) => void
  applyHalAuthor: (localId: string, doc: AureHalAuthorDoc) => void
  markNotAligned: (localId: string, inputText: string) => void
  setRoles: (localId: string, roles: LocRelator[]) => void
  addAffiliation: (localId: string, affiliation: WorkingAffiliation) => void
  removeAffiliation: (localId: string, affiliationLocalId: string) => void
  replaceAffiliation: (
    localId: string,
    affiliationLocalId: string,
    affiliation: WorkingAffiliation,
  ) => void
  save: () => Promise<void>
  cancel: () => void
}

/**
 * Owns the editable working copy of a document's contributions. Rebuilds (and
 * unfreezes) whenever a freshly fetched `document` replaces the previous one — the
 * basis of the pessimistic save model. Mirrors the dirty flag into the store so the
 * page-level navigation guard can read it.
 */
export function useContributionsEditor(
  document: Document | null,
): ContributionsEditor {
  const { saveContributions, setContributionsTabDirty } = useStore(
    (state) => state.document,
  )

  const baseline = useMemo(() => document?.contributions ?? [], [document])

  const [working, setWorking] = useState<WorkingContribution[]>([])
  const [rankingMode, setRankingMode] = useState(false)

  // The tab is frozen while the document is waiting for the graph to apply a
  // pending change. This lives on `Document.state` (set on save, reset to
  // `default` when the graph re-writes the document), so the freeze is durable:
  // it survives navigating away and back — a re-fetch of a still-pending document
  // returns `waiting_for_update` and keeps the tab frozen.
  const isFrozen = document?.state === DocumentState.waiting_for_update

  // Rebuild working state from the baseline whenever the document changes
  // (initial load, or refresh after a save round-trip).
  useEffect(() => {
    setWorking(baseline.map(workingFromContribution))
    setRankingMode(defaultRankingMode(baseline))
  }, [baseline])

  const changes = useMemo(
    () => buildContributionChanges(baseline, working, rankingMode),
    [baseline, working, rankingMode],
  )
  const isDirty = !isFrozen && changes.length > 0

  useEffect(() => {
    setContributionsTabDirty(isDirty)
    return () => setContributionsTabDirty(false)
  }, [isDirty, setContributionsTabDirty])

  const updateContribution = useCallback(
    (
      localId: string,
      updater: (c: WorkingContribution) => WorkingContribution,
    ) =>
      setWorking((prev) =>
        prev.map((c) => (c.localId === localId ? updater(c) : c)),
      ),
    [],
  )

  const addContribution = useCallback(
    () => setWorking((prev) => [...prev, newContribution()]),
    [],
  )

  const insertContribution = useCallback(
    (index: number) =>
      setWorking((prev) => {
        const next = [...prev]
        next.splice(index, 0, newContribution())
        return next
      }),
    [],
  )

  const removeContribution = useCallback(
    (localId: string) =>
      setWorking((prev) => prev.filter((c) => c.localId !== localId)),
    [],
  )

  const moveContribution = useCallback(
    (localId: string, direction: -1 | 1) =>
      setWorking((prev) => {
        const index = prev.findIndex((c) => c.localId === localId)
        const target = index + direction
        if (index < 0 || target < 0 || target >= prev.length) return prev
        const next = [...prev]
        ;[next[index], next[target]] = [next[target], next[index]]
        return next
      }),
    [],
  )

  const reorderContribution = useCallback(
    (fromIndex: number, toIndex: number) =>
      setWorking((prev) => {
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= prev.length ||
          toIndex >= prev.length
        )
          return prev
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        return next
      }),
    [],
  )

  // Drop into the gap *before* card `gapIndex` (the position of an insert button).
  const reorderToGap = useCallback(
    (fromIndex: number, gapIndex: number) =>
      setWorking((prev) => {
        if (fromIndex < 0 || fromIndex >= prev.length) return prev
        if (gapIndex < 0 || gapIndex > prev.length) return prev
        // Account for the removal shifting indices when moving downwards.
        const target = fromIndex < gapIndex ? gapIndex - 1 : gapIndex
        if (target === fromIndex) return prev
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(target, 0, moved)
        return next
      }),
    [],
  )

  const applyHalAuthor = useCallback(
    (localId: string, doc: AureHalAuthorDoc) =>
      updateContribution(localId, (c) => {
        const fields = halAuthorToContributionFields(doc)
        return {
          ...c,
          displayName: fields.displayName,
          firstName: fields.firstName,
          lastName: fields.lastName,
          identifiers: fields.identifiers,
          // Selecting a HAL profile replaces the contributor: drop old affiliations.
          affiliations: [],
          notAligned: false,
          halExtra: doc,
        }
      }),
    [updateContribution],
  )

  const markNotAligned = useCallback(
    (localId: string, inputText: string) =>
      updateContribution(localId, (c) => ({
        ...c,
        // Detach from any existing person: a not-aligned contributor is saved as a
        // REMOVE (old uid) + ADD (uid null).
        personUid: null,
        displayName: inputText,
        identifiers: [],
        affiliations: [],
        notAligned: true,
        halExtra: undefined,
      })),
    [updateContribution],
  )

  const setRoles = useCallback(
    (localId: string, roles: LocRelator[]) =>
      updateContribution(localId, (c) => ({ ...c, roles })),
    [updateContribution],
  )

  const addAffiliation = useCallback(
    (localId: string, affiliation: WorkingAffiliation) =>
      updateContribution(localId, (c) => ({
        ...c,
        affiliations: [...c.affiliations, affiliation],
      })),
    [updateContribution],
  )

  const removeAffiliation = useCallback(
    (localId: string, affiliationLocalId: string) =>
      updateContribution(localId, (c) => ({
        ...c,
        affiliations: c.affiliations.filter(
          (a) => a.localId !== affiliationLocalId,
        ),
      })),
    [updateContribution],
  )

  const replaceAffiliation = useCallback(
    (
      localId: string,
      affiliationLocalId: string,
      affiliation: WorkingAffiliation,
    ) =>
      updateContribution(localId, (c) => ({
        ...c,
        affiliations: c.affiliations.map((a) =>
          a.localId === affiliationLocalId
            ? { ...affiliation, localId: affiliationLocalId }
            : a,
        ),
      })),
    [updateContribution],
  )

  const save = useCallback(async () => {
    if (changes.length === 0) return
    const result = await saveContributions(changes)
    if (result.success) {
      // Pessimistic: the store flags the document `waiting_for_update`, which
      // freezes the tab until the refreshed document comes back.
      setContributionsTabDirty(false)
    }
  }, [changes, saveContributions, setContributionsTabDirty])

  const cancel = useCallback(() => {
    setWorking(baseline.map(workingFromContribution))
    setRankingMode(defaultRankingMode(baseline))
  }, [baseline])

  return {
    working,
    rankingMode,
    isFrozen,
    isDirty,
    contributorCount: working.length,
    setRankingMode,
    addContribution,
    insertContribution,
    removeContribution,
    moveContribution,
    reorderContribution,
    reorderToGap,
    applyHalAuthor,
    markNotAligned,
    setRoles,
    addAffiliation,
    removeAffiliation,
    replaceAffiliation,
    save,
    cancel,
  }
}
