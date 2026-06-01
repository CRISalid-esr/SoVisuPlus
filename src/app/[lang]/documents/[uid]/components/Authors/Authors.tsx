'use client'

import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Paper } from '@mui/material'
import { t } from '@lingui/core/macro'
import useStore from '@/stores/global_store'
import { useContributionsEditor } from './hooks/useContributionsEditor'
import { countDistinctAffiliations } from './lib/halMapping'
import AuthorsToolbar from './components/AuthorsToolbar'
import UnsavedBanner from './components/UnsavedBanner'
import ContributorList from './components/ContributorList'

const Authors = () => {
  const { selectedDocument = null } = useStore((state) => state.document)
  const editor = useContributionsEditor(selectedDocument)
  const [saving, setSaving] = useState(false)

  const affiliationCount = useMemo(
    () => countDistinctAffiliations(editor.working),
    [editor.working],
  )

  // Warn on browser close/reload while there are unsaved changes (native prompt).
  useEffect(() => {
    if (!editor.isDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [editor.isDirty])

  const handleSave = async () => {
    setSaving(true)
    try {
      await editor.save()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      {editor.isDirty && (
        <UnsavedBanner
          saving={saving}
          onSave={handleSave}
          onCancel={editor.cancel}
        />
      )}
      {editor.isFrozen && (
        <Alert severity='info' sx={{ mb: 2 }}>
          {t`documents_details_page_authors_tab_frozen_notice`}
        </Alert>
      )}

      <AuthorsToolbar
        rankingMode={editor.rankingMode}
        disabled={editor.isFrozen}
        contributorCount={editor.contributorCount}
        affiliationCount={affiliationCount}
        onToggleRankingMode={editor.setRankingMode}
      />

      <ContributorList editor={editor} />
    </Paper>
  )
}

export default Authors
