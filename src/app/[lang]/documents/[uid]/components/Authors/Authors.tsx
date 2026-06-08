'use client'

import { useMemo, useState } from 'react'
import { Paper } from '@mui/material'
import { t } from '@lingui/core/macro'
import { useSnackbar } from 'notistack'
import { useSession } from 'next-auth/react'
import useStore from '@/stores/global_store'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import { useContributionsEditor } from './hooks/useContributionsEditor'
import { countDistinctAffiliations } from './lib/halMapping'
import AuthorsToolbar from './components/AuthorsToolbar'
import UnsavedBanner from './components/UnsavedBanner'
import ContributorList from './components/ContributorList'

const Authors = () => {
  const { selectedDocument = null } = useStore((state) => state.document)
  // Read-only unless the user is authorized to update this document's
  // contributors (CASL ability, perimeter-scoped) — same check the Save API
  // route enforces server-side. Do NOT rely on the viewing perspective: a direct
  // URL to a document has no perspective param yet must stay protected.
  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user?.authz),
    [session?.user?.authz],
  )
  const readOnly = !(
    selectedDocument &&
    ability.can(PermissionAction.update, selectedDocument, 'contributors')
  )
  const editor = useContributionsEditor(selectedDocument)
  const { enqueueSnackbar } = useSnackbar()
  const [saving, setSaving] = useState(false)

  const affiliationCount = useMemo(
    () => countDistinctAffiliations(editor.working),
    [editor.working],
  )

  // The unsaved-changes guard (modal, beforeunload, back/forward) is owned by the
  // app-level NavigationGuardProvider, driven by `contributionsTabDirty`.

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await editor.save()
      if (!result.success) {
        enqueueSnackbar(t`documents_details_page_authors_tab_save_error`, {
          variant: 'error',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      <AuthorsToolbar
        rankingMode={editor.rankingMode}
        disabled={editor.isFrozen}
        readOnly={readOnly}
        contributorCount={editor.contributorCount}
        affiliationCount={affiliationCount}
        onToggleRankingMode={editor.setRankingMode}
      />

      {!readOnly && editor.isDirty && (
        <UnsavedBanner
          saving={saving}
          onSave={handleSave}
          onCancel={editor.cancel}
        />
      )}

      <ContributorList editor={editor} readOnly={readOnly} />
    </Paper>
  )
}

export default Authors
