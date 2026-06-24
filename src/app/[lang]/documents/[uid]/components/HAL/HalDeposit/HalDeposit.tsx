'use client'

import { useEffect, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import * as Lingui from '@lingui/core'
import { useRouter, useParams } from 'next/navigation'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { enabledHalDocumentTypes } from '@/lib/services/hal/halDepositFormConfig'
import { halDomainsByCode } from '@/types/HalDomains'
import {
  LANGUAGE_OPTIONS,
  LICENSE_OPTIONS,
  FILE_SOURCE_OPTIONS,
  FILE_TYPE_OPTIONS,
  VISIBILITY_OPTIONS,
  OptionLabel,
  labelOf,
} from './halDepositOptions'
import { HalDepositStatusPanel } from './HalDepositStatusPanel'
import { hasHalRecognisedAffiliation } from './halDepositGates'
import { AttachedFileRow, AttachedFile } from './AttachedFileRow'

type Step = 'form' | 'review'

const DOMAIN_OPTIONS = Object.values(halDomainsByCode)

export default function HalDeposit() {
  const router = useRouter()
  const { uid } = useParams<{ uid: string }>()
  const { _ } = useLingui()
  const renderLabel = (label: OptionLabel) =>
    typeof label === 'string' ? label : _(label)
  const lang = Lingui.i18n.locale as ExtendedLanguageCode

  const { selectedDocument } = useStore((s) => s.document)
  const { currentPerspective, ownPerspective, connectedUser } = useStore(
    (s) => s.user,
  )
  const { byDocument, fetchLatestDeposit, createDeposit } = useStore(
    (s) => s.halDeposit,
  )

  const [step, setStep] = useState<Step>('form')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [documentType, setDocumentType] = useState<string>(
    enabledHalDocumentTypes()[0],
  )
  const [domains, setDomains] = useState<string[]>([])
  const [language, setLanguage] = useState('fr')
  const [mainFile, setMainFile] = useState<AttachedFile | null>(null)
  const [annexes, setAnnexes] = useState<AttachedFile[]>([])

  useEffect(() => {
    if (uid) fetchLatestDeposit(uid)
  }, [uid, fetchLatestDeposit])

  const deposit = uid ? byDocument[uid] : null

  const navigateToTab = (tab: string) => {
    router.push(`/${lang}/documents/${uid}?tab=${tab}`)
  }

  if (!selectedDocument) return null

  // ─── Access gates (UX mirror of the server checks) ─────────────────────────
  const perspectiveUid =
    currentPerspective?.type === 'person' ? currentPerspective.uid : null

  // Identifier check is only reliable for the user's own perspective; the server enforces it
  // for visited perspectives.
  const ownIdentifiers = ownPerspective
    ? (connectedUser?.person?.getIdentifiers() ?? [])
    : null
  const hasHalIdentifiers =
    ownIdentifiers === null
      ? true
      : ownIdentifiers.some((i) => i.type === PersonIdentifierType.hal_login) &&
        ownIdentifiers.some(
          (i) =>
            i.type === PersonIdentifierType.idhals ||
            i.type === PersonIdentifierType.idhali,
        )

  const hasHalRecord = selectedDocument.records.some(
    (r) => r.platform === BibliographicPlatform.HAL,
  )

  // Once a deposit exists (and the doc is not yet harvested back from HAL), show the status panel.
  if (deposit && !hasHalRecord) {
    return <HalDepositStatusPanel deposit={deposit} onNavigateTab={navigateToTab} />
  }

  if (!perspectiveUid) return null

  if (!hasHalIdentifiers) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='info'>
          <Trans>hal_deposit_gate_no_hal_id</Trans>
        </Alert>
        <Button
          sx={{ mt: 2 }}
          variant='contained'
          onClick={() => router.push(`/${lang}/account`)}
        >
          <Trans>hal_deposit_gate_go_my_account</Trans>
        </Button>
      </Box>
    )
  }

  if (!selectedDocument.publicationDate) {
    return (
      <GateAlert
        message={t`hal_deposit_gate_no_date`}
        actionLabel={t`hal_deposit_gate_go_biblio`}
        onAction={() => navigateToTab('bibliographic_information')}
      />
    )
  }

  if (documentType === 'ART' && !selectedDocument.journal?.title) {
    return (
      <GateAlert
        message={t`hal_deposit_gate_no_journal`}
        actionLabel={t`hal_deposit_gate_go_biblio`}
        onAction={() => navigateToTab('bibliographic_information')}
      />
    )
  }

  if (!hasHalRecognisedAffiliation(selectedDocument)) {
    return (
      <GateAlert
        severity='error'
        message={t`hal_deposit_gate_no_affiliation`}
        actionLabel={t`hal_deposit_gate_go_authors`}
        onAction={() => navigateToTab('authors')}
      />
    )
  }

  // ─── Soft warning: affiliations that will be dropped ───────────────────────
  const hasDroppedAffiliations = selectedDocument.contributions?.some((c) =>
    c.affiliations.some(
      (org) =>
        !org.identifiers.some((id) =>
          ['nns', 'ror', 'isni', 'idref'].includes(id.type),
        ),
    ),
  )

  // ─── Validation ────────────────────────────────────────────────────────────
  const valid =
    !!documentType &&
    !!language &&
    domains.length > 0 &&
    (!mainFile || !!mainFile.license)

  const handleSubmit = async () => {
    if (!valid || !uid || !perspectiveUid) return
    setSubmitting(true)
    setError(null)

    const files = [
      ...(mainFile ? [{ ...mainFile, isMain: true }] : []),
      ...annexes.map((a) => ({ ...a, isMain: false })),
    ]
    const form = new FormData()
    form.set(
      'payload',
      JSON.stringify({
        documentUid: uid,
        personUid: perspectiveUid,
        halDocumentType: documentType,
        halDomains: domains,
        language,
        files: files.map((f, i) => ({
          field: `file${i}`,
          isMain: f.isMain,
          fileSource: f.source,
          fileType: f.kind,
          visibility: f.visibility,
          license: f.license || null,
        })),
      }),
    )
    files.forEach((f, i) => form.set(`file${i}`, f.file))

    const result = await createDeposit(uid, form)
    setSubmitting(false)
    if (!result.success) {
      setError(result.error ?? t`hal_deposit_error_failed`)
      setStep('form')
    }
    // On success the slice sets the deposit, flipping this component to the status panel.
  }

  const title =
    selectedDocument.titles.find((tl) => tl.language === lang)?.value ??
    selectedDocument.titles[0]?.value ??
    ''

  // ─── Review step ───────────────────────────────────────────────────────────
  if (step === 'review') {
    const files = [
      ...(mainFile ? [{ ...mainFile, isMain: true }] : []),
      ...annexes.map((a) => ({ ...a, isMain: false })),
    ]
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant='h6' gutterBottom>
          <Trans>hal_deposit_review_heading</Trans>
        </Typography>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <ReviewRow label={t`hal_deposit_field_title`} value={title} />
        <ReviewRow label={t`hal_deposit_field_document_type`} value={documentType} />
        <ReviewRow
          label={t`hal_deposit_field_language`}
          value={renderLabel(labelOf(LANGUAGE_OPTIONS, language))}
        />
        <Box sx={{ mb: 1.5 }}>
          <Typography variant='caption' color='text.secondary'>
            <Trans>hal_deposit_field_domains</Trans>
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {domains.map((d) => (
              <Chip key={d} size='small' label={d} />
            ))}
          </Box>
        </Box>
        <ReviewRow
          label={t`hal_deposit_field_files`}
          value={files.length ? files.map((f) => f.file.name).join(', ') : t`hal_deposit_files_notice_only`}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setStep('form')} disabled={submitting}>
            <Trans>hal_deposit_button_back</Trans>
          </Button>
          <Button variant='contained' onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Trans>hal_deposit_button_submitting</Trans>
            ) : (
              <Trans>hal_deposit_button_confirm</Trans>
            )}
          </Button>
        </Box>
      </Box>
    )
  }

  // ─── Form step ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant='h6' gutterBottom>
        <Trans>hal_deposit_form_heading</Trans>
      </Typography>

      <Alert severity='info' sx={{ mb: 2 }}>
        <Trans>hal_deposit_form_metadata_note</Trans>
      </Alert>

      {hasDroppedAffiliations && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          <Trans>hal_deposit_form_affiliations_note</Trans>
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>{t`hal_deposit_field_document_type`}</InputLabel>
        <Select
          value={documentType}
          label={t`hal_deposit_field_document_type`}
          onChange={(e) => setDocumentType(e.target.value)}
        >
          {enabledHalDocumentTypes().map((typ) => (
            <MenuItem key={typ} value={typ}>
              {typ}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Autocomplete
        multiple
        options={DOMAIN_OPTIONS}
        getOptionLabel={(o) =>
          `${(o.labels as Record<string, string | undefined>)[lang] ?? o.labels.en ?? o.code} (${o.code})`
        }
        value={DOMAIN_OPTIONS.filter((o) => domains.includes(o.code))}
        onChange={(_, v) => setDomains(v.map((o) => o.code))}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t`hal_deposit_field_domains`}
            placeholder={t`hal_deposit_domains_placeholder`}
          />
        )}
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>{t`hal_deposit_field_language`}</InputLabel>
        <Select
          value={language}
          label={t`hal_deposit_field_language`}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {LANGUAGE_OPTIONS.map((l) => (
            <MenuItem key={l.value} value={l.value}>
              {renderLabel(l.label)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Divider sx={{ my: 2 }} />

      <Typography sx={{ fontWeight: 500, mb: 1 }}>
        <Trans>hal_deposit_main_file_heading</Trans>
      </Typography>
      <AttachedFileRow
        accept='application/pdf'
        requireLicense
        file={mainFile}
        onSelect={(file) =>
          setMainFile({
            file,
            source: 'author',
            kind: 'file',
            visibility: 'now',
            license: '',
          })
        }
        onChange={(patch) => setMainFile((p) => (p ? { ...p, ...patch } : p))}
        onRemove={() => setMainFile(null)}
        licenseOptions={LICENSE_OPTIONS}
        sourceOptions={FILE_SOURCE_OPTIONS}
        typeOptions={FILE_TYPE_OPTIONS}
        visibilityOptions={VISIBILITY_OPTIONS}
      />

      <Typography sx={{ fontWeight: 500, mt: 2, mb: 1 }}>
        <Trans>hal_deposit_complementary_files_heading</Trans>
      </Typography>
      {annexes.map((annex, i) => (
        <AttachedFileRow
          key={i}
          file={annex}
          onChange={(patch) =>
            setAnnexes((prev) =>
              prev.map((a, j) => (j === i ? { ...a, ...patch } : a)),
            )
          }
          onRemove={() => setAnnexes((prev) => prev.filter((_, j) => j !== i))}
          licenseOptions={LICENSE_OPTIONS}
          sourceOptions={FILE_SOURCE_OPTIONS}
          typeOptions={FILE_TYPE_OPTIONS}
          visibilityOptions={VISIBILITY_OPTIONS}
        />
      ))}
      <Button component='label' sx={{ mt: 1 }}>
        <Trans>hal_deposit_add_complementary_file</Trans>
        <input
          type='file'
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f)
              setAnnexes((prev) => [
                ...prev,
                { file: f, source: 'author', kind: 'annex', visibility: 'now', license: '' },
              ])
          }}
        />
      </Button>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant='contained'
          disabled={!valid}
          onClick={() => setStep('review')}
        >
          <Trans>hal_deposit_button_review</Trans>
        </Button>
      </Box>
    </Box>
  )
}

function GateAlert({
  message,
  actionLabel,
  onAction,
  severity = 'info',
}: {
  message: string
  actionLabel: string
  onAction: () => void
  severity?: 'info' | 'error'
}) {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity={severity}>{message}</Alert>
      <Button sx={{ mt: 2 }} variant='outlined' onClick={onAction}>
        {actionLabel}
      </Button>
    </Box>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant='caption' color='text.secondary'>
        {label}
      </Typography>
      <Typography>{value}</Typography>
    </Box>
  )
}
