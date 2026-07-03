'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import * as Lingui from '@lingui/core'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { abilityFromAuthzContext } from '@/app/auth/ability'
import { PermissionAction } from '@/types/Permission'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { Add } from '@mui/icons-material'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { isPerson } from '@/types/Person'
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
  const { currentPerspective, ownPerspective } = useStore((s) => s.user)
  const { byDocument, loading, fetchLatestDeposit, createDeposit } = useStore(
    (s) => s.halDeposit,
  )

  const { data: session } = useSession()
  const ability = useMemo(
    () => abilityFromAuthzContext(session?.user?.authz),
    [session?.user?.authz],
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

  // Wait for the latest-deposit fetch before deciding form vs status panel, so the form is not
  // briefly flashed on (re)load before an existing deposit's status is applied.
  const depositLoaded = !!uid && uid in byDocument && !loading[uid]
  if (!depositLoaded) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  // ─── Access gates (UX mirror of the server checks) ─────────────────────────
  // The deposit is made on behalf of the perspective person, whose identifiers are available
  // client-side for both own and visited perspectives. (The server re-checks regardless.)
  const perspectivePerson = isPerson(currentPerspective)
    ? currentPerspective
    : null
  const perspectiveUid = perspectivePerson?.uid ?? null

  // `deposit_hal_unauthenticated` waives the hal_login requirement (idhal still required).
  const canDepositUnauthenticated =
    !!perspectivePerson &&
    ability.can(PermissionAction.deposit_hal_unauthenticated, perspectivePerson)
  const hasIdhal =
    !!perspectivePerson &&
    (perspectivePerson.hasIdentifier(PersonIdentifierType.idhals) ||
      perspectivePerson.hasIdentifier(PersonIdentifierType.idhali))
  const hasHalIdentifiers =
    hasIdhal &&
    (canDepositUnauthenticated ||
      perspectivePerson.hasIdentifier(PersonIdentifierType.hal_login))

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
          {ownPerspective ? (
            <Trans>hal_deposit_gate_no_hal_id</Trans>
          ) : (
            <Trans>hal_deposit_gate_no_hal_id_other</Trans>
          )}
        </Alert>
        {ownPerspective && (
          <Button
            sx={{ mt: 2 }}
            variant='contained'
            onClick={() => router.push(`/${lang}/account`)}
          >
            <Trans>hal_deposit_gate_go_my_account</Trans>
          </Button>
        )}
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

  // At least one contributor must carry a HAL-recognised affiliation identifier.
  // Surfaced inline in the authors section (not as a full-page gate) and gates the
  // Review button, so the form stays visible while the user fixes it in the Authors tab.
  const hasIdentifiedAffiliation = hasHalRecognisedAffiliation(selectedDocument)

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
    hasIdentifiedAffiliation &&
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

  const abstract =
    selectedDocument.abstracts.find((a) => a.language === lang)?.value ??
    selectedDocument.abstracts[0]?.value ??
    ''

  const sortedContributions = [...(selectedDocument.contributions ?? [])].sort(
    (a, b) => (a.rank ?? 0) - (b.rank ?? 0),
  )

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

      {/* Read-only metadata pulled from other tabs */}
      <Section
        title={t`hal_deposit_section_title_abstract`}
        action={
          <Button
            size='small'
            sx={{ textTransform: 'none', fontWeight: 600 }}
            onClick={() => navigateToTab('bibliographic_information')}
          >
            <Trans>hal_deposit_modify_in_biblio</Trans>
          </Button>
        }
      >
        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2, bgcolor: '#F5F7F6' }}>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
            {title || <Trans>hal_deposit_no_title</Trans>}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {abstract || <Trans>hal_deposit_no_abstract</Trans>}
          </Typography>
        </Paper>
      </Section>

      <Section
        title={t`hal_deposit_section_authors`}
        action={
          <Button
            size='small'
            sx={{ textTransform: 'none', fontWeight: 600 }}
            onClick={() => navigateToTab('authors')}
          >
            <Trans>hal_deposit_modify_in_authors</Trans>
          </Button>
        }
      >
        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2, bgcolor: '#F5F7F6' }}>
          {!hasIdentifiedAffiliation && (
            <Alert severity='error' sx={{ mb: 1.5 }}>
              <Trans>hal_deposit_gate_no_affiliation</Trans>
            </Alert>
          )}
          {sortedContributions.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              <Trans>hal_deposit_no_authors</Trans>
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sortedContributions.map((c, i) => {
                const roles = c.getRoleLabels().join(', ')
                const affiliations = c.affiliations
                  .map((o) => o.displayNames[0])
                  .filter(Boolean)
                  .join(', ')
                return (
                  <Box key={i}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {c.rank != null && `${c.rank}. `}
                      {c.person?.getDisplayName(lang) || '—'}
                      {roles && (
                        <Typography
                          component='span'
                          variant='caption'
                          color='text.secondary'
                          sx={{ ml: 1, fontStyle: 'italic' }}
                        >
                          {`(${roles})`}
                        </Typography>
                      )}
                    </Typography>
                    {affiliations && (
                      <Typography variant='caption' color='text.secondary'>
                        {affiliations}
                      </Typography>
                    )}
                  </Box>
                )
              })}
            </Box>
          )}
        </Paper>
      </Section>

      {hasDroppedAffiliations && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          <Trans>hal_deposit_form_affiliations_note</Trans>
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>{`${t`hal_deposit_field_document_type`} *`}</InputLabel>
        <Select
          value={documentType}
          label={`${t`hal_deposit_field_document_type`} *`}
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
            label={`${t`hal_deposit_field_domains`} *`}
            placeholder={t`hal_deposit_domains_placeholder`}
          />
        )}
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>{`${t`hal_deposit_field_language`} *`}</InputLabel>
        <Select
          value={language}
          label={`${t`hal_deposit_field_language`} *`}
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
        isMain
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
      <Button component='label' startIcon={<Add />} sx={{ mt: 1 }}>
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

/** Read-only block: an uppercase section title with a right-aligned edit action above the content. */
function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography
          variant='subtitle2'
          color='text.secondary'
          sx={{ fontWeight: 600, letterSpacing: '0.05em' }}
        >
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  )
}
