'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  CardContent,
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
import { useTheme } from '@mui/material/styles'
import { Add } from '@mui/icons-material'
import { CustomCard } from '@/components/Card'
import useStore from '@/stores/global_store'
import { ExtendedLanguageCode } from '@/types/ExtendLanguageCode'
import { BibliographicPlatform } from '@/types/BibliographicPlatform'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import { isPerson } from '@/types/Person'
import type { Document as DocumentClass } from '@/types/Document'
import {
  defaultHalDocumentType,
  enabledHalDocumentTypes,
  fieldsForType,
  isHalDocumentType,
  requiredFieldsForType,
  requiresMainFile,
  validateConditionalFields,
  type HalFieldKey,
} from '@/lib/services/hal/halDepositFormConfig'
import { halDomainsByCode } from '@/types/HalDomains'
import { halCountries, countryLabel } from '@/types/HalCountries'
import { LocRelator } from '@/types/LocRelator'
import { formatPublicationDate } from '@/utils/publicationDate'
import PartialDateField from './PartialDateField'
import HalInstitutionAutocomplete from './HalInstitutionAutocomplete'
import {
  HAL_DOCUMENT_TYPE_OPTIONS,
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

// Shared style for the form's section subtitles (Bibliographic information, Authors, Deposit
// metadata): uppercase, semibold, letter-spaced. (File labels are intentionally not subtitles.)
const SUBTITLE_SX = {
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
}

export default function HalDeposit() {
  const theme = useTheme()
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
  // Per-type conditional field values, keyed by HalFieldKey; reset when the type changes.
  const [conditional, setConditional] = useState<
    Partial<Record<HalFieldKey, string>>
  >({})

  const changeDocumentType = (value: string) => {
    setDocumentType(value)
    setConditional({})
  }
  const setField = (key: HalFieldKey, value: string) =>
    setConditional((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    if (uid) fetchLatestDeposit(uid)
  }, [uid, fetchLatestDeposit])

  // Pre-fill the deposit type from the document's own (CERIF→HAL) type, once per document. The
  // ref guard keeps a later manual change from being overwritten on unrelated store updates.
  const typeInitUidRef = useRef<string | null>(null)
  useEffect(() => {
    if (selectedDocument && typeInitUidRef.current !== selectedDocument.uid) {
      typeInitUidRef.current = selectedDocument.uid
      setDocumentType(defaultHalDocumentType(selectedDocument.documentType))
    }
  }, [selectedDocument])

  // When exactly one contributor holds the supervisor role for the selected THESE/HDR, pre-select
  // them. The guard leaves a manual choice untouched; changing the type clears `conditional`, so a
  // new sole candidate is re-selected for the new type.
  useEffect(() => {
    if (!selectedDocument) return
    if (documentType !== 'THESE' && documentType !== 'HDR') return
    const role =
      documentType === 'HDR'
        ? LocRelator.DEGREE_COMMITTEE_MEMBER
        : LocRelator.THESIS_ADVISOR
    const candidates = (selectedDocument.contributions ?? []).filter((c) =>
      c.roles.includes(role),
    )
    if (candidates.length !== 1) return
    const name = candidates[0].person?.getDisplayName(lang) ?? ''
    if (!name) return
    setConditional((prev) =>
      prev.supervisor ? prev : { ...prev, supervisor: name },
    )
  }, [selectedDocument, documentType, lang])

  const deposit = uid ? byDocument[uid] : null

  const navigateToTab = (tab: string) => {
    router.push(`/${lang}/documents/${uid}?tab=${tab}`)
  }

  if (!selectedDocument) return null

  // Card chrome shared by every rendered state, so the tab matches the other document tabs
  // (bordered card + titled header + padded body). The header title stays constant while the
  // body swaps between loading / gate / form / review / status.
  const wrap = (body: React.ReactNode) => (
    <CustomCard
      header={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{
              color: theme.palette.primary.main,
              fontSize: theme.utils.pxToRem(20),
              fontStyle: 'normal',
              fontWeight: theme.typography.fontWeightRegular,
              lineHeight: 'normal',
            }}
          >
            {step === 'review' ? (
              <Trans>hal_deposit_review_heading</Trans>
            ) : (
              <Trans>hal_deposit_form_heading</Trans>
            )}
          </Typography>
        </Box>
      }
    >
      <CardContent>{body}</CardContent>
    </CustomCard>
  )

  // Wait for the latest-deposit fetch before deciding form vs status panel, so the form is not
  // briefly flashed on (re)load before an existing deposit's status is applied.
  const depositLoaded = !!uid && uid in byDocument && !loading[uid]
  if (!depositLoaded) {
    return wrap(
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>,
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
    return wrap(
      <HalDepositStatusPanel deposit={deposit} onNavigateTab={navigateToTab} />,
    )
  }

  if (!perspectiveUid) return null

  if (!hasHalIdentifiers) {
    return wrap(
      <>
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
      </>,
    )
  }

  if (!selectedDocument.publicationDate) {
    return wrap(
      <GateAlert
        message={t`hal_deposit_gate_no_date`}
        actionLabel={t`hal_deposit_gate_go_biblio`}
        onAction={() => navigateToTab('bibliographic_information')}
      />,
    )
  }

  // ART requires a journal. Only ART is affected — other types never require one, so the form is
  // shown regardless of type; when ART is selected without a journal, we show an inline alert (near
  // the type selector) and disable the Review button instead of hiding the whole form.
  const journalMissing =
    documentType === 'ART' && !selectedDocument.journal?.title

  // At least one contributor must carry a HAL-recognised affiliation identifier.
  // Surfaced inline in the authors section (not as a full-page gate) and gates the
  // Review button, so the form stays visible while the user fixes it in the Authors tab.
  const hasIdentifiedAffiliation = hasHalRecognisedAffiliation(selectedDocument)

  // THESE/HDR require a bilingual (fr+en) title and keywords; a bilingual abstract is required for a
  // THESE only, not an HDR. Rather than hiding the form, we show it with the Review button disabled
  // and an inline alert in the title/résumé section (below).
  const isThesisType = documentType === 'THESE' || documentType === 'HDR'
  const hasBilingualTitle = ['fr', 'en'].every((l) =>
    selectedDocument.titles.some((tl) => tl.language === l && tl.value?.trim()),
  )
  const hasBilingualAbstract = ['fr', 'en'].every((l) =>
    selectedDocument.abstracts.some(
      (a) => a.language === l && a.value?.trim(),
    ),
  )
  const bilingualTitleMissing = isThesisType && !hasBilingualTitle
  const bilingualAbstractMissing =
    documentType === 'THESE' && !hasBilingualAbstract

  // THESE/HDR also require bilingual keywords: at least one French and one English subject label.
  const keywordLangs = new Set(
    (selectedDocument.subjects ?? []).flatMap((s) =>
      s.prefLabels.filter((l) => l.value?.trim()).map((l) => l.language),
    ),
  )
  const bilingualKeywordsMissing =
    isThesisType && !(keywordLangs.has('fr') && keywordLangs.has('en'))

  // ─── Soft warning: affiliations that will be dropped ───────────────────────
  const hasDroppedAffiliations = selectedDocument.contributions?.some((c) =>
    c.affiliations.some(
      (org) =>
        !org.identifiers.some((id) =>
          ['nns', 'ror', 'isni', 'idref'].includes(id.type),
        ),
    ),
  )

  // ─── Conditional fields for the selected type ──────────────────────────────
  const typeFields = isHalDocumentType(documentType)
    ? fieldsForType(documentType)
    : {}
  const requiredKeys = isHalDocumentType(documentType)
    ? requiredFieldsForType(documentType)
    : []
  const isRequired = (key: HalFieldKey) => requiredKeys.includes(key)
  const has = (key: HalFieldKey) => key in typeFields
  const mainFileRequired =
    isHalDocumentType(documentType) && requiresMainFile(documentType)

  // The supervisor picker lists only contributors holding the relevant role.
  const supervisorRole =
    documentType === 'HDR'
      ? LocRelator.DEGREE_COMMITTEE_MEMBER
      : LocRelator.THESIS_ADVISOR
  const supervisorCandidates = (selectedDocument.contributions ?? []).filter(
    (c) => c.roles.includes(supervisorRole),
  )
  // The supervisor field is labelled per type: thesis supervisor for THESE, jury president for HDR.
  const supervisorLabel =
    documentType === 'HDR'
      ? t`hal_deposit_field_supervisor_hdr`
      : t`hal_deposit_field_supervisor_these`

  // ─── Validation ────────────────────────────────────────────────────────────
  const missingConditional = isHalDocumentType(documentType)
    ? validateConditionalFields(documentType, conditional)
    : []
  const valid =
    hasIdentifiedAffiliation &&
    !!documentType &&
    !!language &&
    domains.length > 0 &&
    (!mainFile || !!mainFile.license) &&
    missingConditional.length === 0 &&
    (!mainFileRequired || !!mainFile) &&
    !bilingualTitleMissing &&
    !bilingualAbstractMissing &&
    !bilingualKeywordsMissing &&
    !journalMissing

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
        conferenceTitle: conditional.conferenceTitle ?? null,
        conferenceCity: conditional.conferenceCity ?? null,
        conferenceStartDate: conditional.conferenceStartDate ?? null,
        conferenceCountry: conditional.conferenceCountry ?? null,
        institution: conditional.institution ?? null,
        bookTitle: conditional.bookTitle ?? null,
        supervisor: conditional.supervisor ?? null,
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
    // Keywords go into the TEI but are not shown in the form; surface them here for review.
    const keywords = (selectedDocument.subjects ?? [])
      .map((s) => {
        const labels = s.prefLabels.filter((l) => l.value?.trim())
        const pref = labels.find((l) => l.language === lang) ?? labels[0]
        return pref?.value ?? ''
      })
      .filter(Boolean)
    return wrap(
      <>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Bibliographic information (sent in the TEI) */}
        <Section title={t`hal_deposit_section_bibliographic`}>
          <BiblioCardBody
            title={title}
            abstract={abstract}
            publicationDate={selectedDocument.publicationDate}
            journalTitle={selectedDocument.journal?.title}
            lang={lang}
            clampAbstract={false}
          />
        </Section>

        {/* Authors and affiliations (sent in the TEI) */}
        <Section title={t`hal_deposit_section_authors`}>
          <AuthorsList contributions={sortedContributions} lang={lang} />
        </Section>

        {/* Deposit metadata (entered in the form) */}
        <Section title={t`hal_deposit_section_metadata`}>
          <ReviewRow
            label={t`hal_deposit_field_document_type`}
            value={renderLabel(labelOf(HAL_DOCUMENT_TYPE_OPTIONS, documentType))}
          />
          <ReviewRow
            label={t`hal_deposit_field_language`}
            value={renderLabel(labelOf(LANGUAGE_OPTIONS, language))}
          />
          {has('bookTitle') && (
            <ReviewRow
              label={t`hal_deposit_field_book_title`}
              value={conditional.bookTitle ?? ''}
            />
          )}
          {has('conferenceTitle') && (
            <ReviewRow
              label={t`hal_deposit_field_conference_title`}
              value={conditional.conferenceTitle ?? ''}
            />
          )}
          {has('conferenceCity') && (
            <ReviewRow
              label={t`hal_deposit_field_conference_city`}
              value={conditional.conferenceCity ?? ''}
            />
          )}
          {has('conferenceStartDate') && (
            <ReviewRow
              label={t`hal_deposit_field_conference_start_date`}
              value={conditional.conferenceStartDate ?? ''}
            />
          )}
          {has('conferenceCountry') && (
            <ReviewRow
              label={t`hal_deposit_field_conference_country`}
              value={
                conditional.conferenceCountry
                  ? countryLabel(conditional.conferenceCountry, lang)
                  : ''
              }
            />
          )}
          {has('institution') && (
            <ReviewRow
              label={t`hal_deposit_field_institution`}
              value={conditional.institution ?? ''}
            />
          )}
          {has('supervisor') && (
            <ReviewRow
              label={supervisorLabel}
              value={conditional.supervisor ?? ''}
            />
          )}
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
        </Section>

        {/* Keywords (sent in the TEI) */}
        <Section title={t`hal_deposit_field_keywords`}>
          {keywords.length ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {keywords.map((k, i) => (
                <Chip key={`${k}-${i}`} size='small' label={k} />
              ))}
            </Box>
          ) : (
            <Typography variant='body2' color='text.secondary'>
              —
            </Typography>
          )}
        </Section>

        {/* Files and their per-file metadata (entered in the form) */}
        <Section title={t`hal_deposit_field_files`}>
          {files.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              <Trans>hal_deposit_files_notice_only</Trans>
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {files.map((f, i) => (
                <Paper
                  key={i}
                  variant='outlined'
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: f.isMain ? '#E8F5F4' : '#F5F7F6',
                  }}
                >
                  <Typography variant='body2' sx={{ fontWeight: 600, mb: 1 }}>
                    {f.file.name}
                    <Typography
                      component='span'
                      variant='caption'
                      color='text.secondary'
                      sx={{ ml: 1, fontStyle: 'italic' }}
                    >
                      {f.isMain ? (
                        <Trans>hal_deposit_file_main</Trans>
                      ) : (
                        <Trans>hal_deposit_file_complementary</Trans>
                      )}
                    </Typography>
                  </Typography>
                  <ReviewRow
                    label={t`hal_deposit_field_file_source`}
                    value={renderLabel(labelOf(FILE_SOURCE_OPTIONS, f.source))}
                  />
                  <ReviewRow
                    label={t`hal_deposit_field_file_type`}
                    value={renderLabel(labelOf(FILE_TYPE_OPTIONS, f.kind))}
                  />
                  <ReviewRow
                    label={t`hal_deposit_field_file_visibility`}
                    value={renderLabel(
                      labelOf(VISIBILITY_OPTIONS, f.visibility),
                    )}
                  />
                  <ReviewRow
                    label={t`hal_deposit_field_license`}
                    value={
                      f.license
                        ? renderLabel(labelOf(LICENSE_OPTIONS, f.license))
                        : '—'
                    }
                  />
                </Paper>
              ))}
            </Box>
          )}
        </Section>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button onClick={() => setStep('form')} disabled={submitting}>
            <Trans>hal_deposit_button_back</Trans>
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Trans>hal_deposit_button_submitting</Trans>
            ) : (
              <Trans>hal_deposit_button_confirm</Trans>
            )}
          </Button>
        </Box>
      </>,
    )
  }

  // ─── Form step ─────────────────────────────────────────────────────────────
  return wrap(
    <>
      <Alert
        severity='info'
        sx={{ mb: 2, bgcolor: 'transparent', border: 'none', px: 0, py: 0 }}
      >
        <Trans>hal_deposit_form_metadata_note</Trans>
      </Alert>

      {bilingualKeywordsMissing && (
        <Alert
          severity='warning'
          sx={{ mb: 2 }}
          action={
            <Button
              size='small'
              sx={{ textTransform: 'none', fontWeight: 600 }}
              onClick={() => navigateToTab('keywords')}
            >
              <Trans>hal_deposit_modify_in_keywords</Trans>
            </Button>
          }
        >
          <Trans>hal_deposit_gate_missing_bilingual_keywords</Trans>
        </Alert>
      )}

      {/* Read-only metadata pulled from other tabs */}
      <Section
        title={t`hal_deposit_section_bibliographic`}
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
        {bilingualTitleMissing && (
          <Alert severity='warning' sx={{ mb: 1 }}>
            <Trans>hal_deposit_gate_missing_bilingual_title</Trans>
          </Alert>
        )}
        {bilingualAbstractMissing && (
          <Alert severity='warning' sx={{ mb: 1 }}>
            <Trans>hal_deposit_gate_missing_bilingual_abstract</Trans>
          </Alert>
        )}
        {journalMissing && (
          <Alert severity='warning' sx={{ mb: 1 }}>
            <Trans>hal_deposit_gate_no_journal</Trans>
          </Alert>
        )}
        <BiblioCardBody
          title={title}
          abstract={abstract}
          publicationDate={selectedDocument.publicationDate}
          journalTitle={selectedDocument.journal?.title}
          lang={lang}
        />
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
        {!hasIdentifiedAffiliation && (
          <Alert severity='error' sx={{ mb: 1 }}>
            <Trans>hal_deposit_gate_no_affiliation</Trans>
          </Alert>
        )}
        <AuthorsList contributions={sortedContributions} lang={lang} />
      </Section>

      {hasDroppedAffiliations && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          <Trans>hal_deposit_form_affiliations_note</Trans>
        </Alert>
      )}

      <Typography
        variant='subtitle2'
        color='text.secondary'
        sx={{ ...SUBTITLE_SX, mt: 3, mb: 3 }}
      >
        <Trans>hal_deposit_section_metadata</Trans>
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>{`${t`hal_deposit_field_document_type`} *`}</InputLabel>
        <Select
          value={documentType}
          label={`${t`hal_deposit_field_document_type`} *`}
          onChange={(e) => changeDocumentType(e.target.value)}
        >
          {enabledHalDocumentTypes().map((typ) => (
            <MenuItem key={typ} value={typ}>
              {renderLabel(labelOf(HAL_DOCUMENT_TYPE_OPTIONS, typ))}
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

      {/* ─── Per-type conditional fields (driven by halDepositFormConfig) ─────── */}
      {has('bookTitle') && (
        <TextField
          fullWidth
          sx={{ mb: 2 }}
          required={isRequired('bookTitle')}
          label={t`hal_deposit_field_book_title`}
          value={conditional.bookTitle ?? ''}
          onChange={(e) => setField('bookTitle', e.target.value)}
        />
      )}

      {has('conferenceTitle') && (
        <TextField
          fullWidth
          sx={{ mb: 2 }}
          required={isRequired('conferenceTitle')}
          label={t`hal_deposit_field_conference_title`}
          value={conditional.conferenceTitle ?? ''}
          onChange={(e) => setField('conferenceTitle', e.target.value)}
        />
      )}

      {has('conferenceCity') && (
        <TextField
          fullWidth
          sx={{ mb: 2 }}
          required={isRequired('conferenceCity')}
          label={t`hal_deposit_field_conference_city`}
          value={conditional.conferenceCity ?? ''}
          onChange={(e) => setField('conferenceCity', e.target.value)}
        />
      )}

      {has('conferenceStartDate') && (
        <Box sx={{ mb: 2 }}>
          <PartialDateField
            label={t`hal_deposit_field_conference_start_date`}
            required={isRequired('conferenceStartDate')}
            value={conditional.conferenceStartDate ?? null}
            onChange={(v) => setField('conferenceStartDate', v ?? '')}
          />
        </Box>
      )}

      {has('conferenceCountry') && (
        <Autocomplete
          sx={{ mb: 2 }}
          options={halCountries}
          getOptionLabel={(c) => countryLabel(c.code, lang)}
          isOptionEqualToValue={(a, b) => a.code === b.code}
          value={
            halCountries.find(
              (c) => c.code === conditional.conferenceCountry,
            ) ?? null
          }
          onChange={(_, c) => setField('conferenceCountry', c?.code ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              required={isRequired('conferenceCountry')}
              label={t`hal_deposit_field_conference_country`}
            />
          )}
        />
      )}

      {has('institution') && (
        <Box sx={{ mb: 2 }}>
          <HalInstitutionAutocomplete
            label={t`hal_deposit_field_institution`}
            required={isRequired('institution')}
            value={conditional.institution ?? null}
            onChange={(v) => setField('institution', v)}
          />
        </Box>
      )}

      {has('supervisor') &&
        (supervisorCandidates.length === 0 ? (
          <Alert severity='info' sx={{ mb: 2 }}>
            <Trans>hal_deposit_supervisor_none</Trans>
          </Alert>
        ) : (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>
              {`${supervisorLabel}${isRequired('supervisor') ? ' *' : ''}`}
            </InputLabel>
            <Select
              value={conditional.supervisor ?? ''}
              label={`${supervisorLabel}${
                isRequired('supervisor') ? ' *' : ''
              }`}
              onChange={(e) => setField('supervisor', e.target.value)}
            >
              {supervisorCandidates.map((c, i) => {
                const name = c.person?.getDisplayName(lang) ?? ''
                return (
                  <MenuItem key={`${name}-${i}`} value={name}>
                    {name}
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        ))}

      <Divider sx={{ my: 2 }} />

      <Typography sx={{ fontWeight: 500, mb: 1 }}>
        {mainFileRequired ? (
          <>
            <Trans>hal_deposit_main_file_heading_required</Trans>
            {' *'}
          </>
        ) : (
          <Trans>hal_deposit_main_file_heading</Trans>
        )}
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
                {
                  file: f,
                  source: 'author',
                  kind: 'annex',
                  visibility: 'now',
                  license: '',
                },
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
    </>,
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
    <Box>
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

/** Grey read-only card mirroring the document's bibliographic data (title, abstract, publication
 *  date, journal). Shared by the form's read-only section and the review recap. */
function BiblioCardBody({
  title,
  abstract,
  publicationDate,
  journalTitle,
  lang,
  clampAbstract = true,
}: {
  title: string
  abstract: string
  publicationDate: string | null | undefined
  journalTitle: string | null | undefined
  lang: ExtendedLanguageCode
  /** Clamp the abstract to 3 lines (form preview). The review recap shows it in full. */
  clampAbstract?: boolean
}) {
  return (
    <Paper variant='outlined' sx={{ p: 2, borderRadius: 2, bgcolor: '#F5F7F6' }}>
      <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
        {title || <Trans>hal_deposit_no_title</Trans>}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={
          clampAbstract
            ? {
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
            : { whiteSpace: 'pre-line' }
        }
      >
        {abstract || <Trans>hal_deposit_no_abstract</Trans>}
      </Typography>

      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant='body2'>
          <Typography component='span' variant='caption' color='text.secondary'>
            <Trans>hal_deposit_field_publication_date</Trans>
          </Typography>
          {': '}
          {publicationDate ? formatPublicationDate(publicationDate, lang) : '—'}
        </Typography>
        {journalTitle && (
          <Typography variant='body2'>
            <Typography component='span' variant='caption' color='text.secondary'>
              <Trans>hal_deposit_field_journal</Trans>
            </Typography>
            {': '}
            {journalTitle}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}

/** Grey read-only card listing contributors (sorted by rank) with role and affiliation labels.
 *  Shared by the form's read-only section and the review recap. */
function AuthorsList({
  contributions,
  lang,
}: {
  contributions: DocumentClass['contributions']
  lang: ExtendedLanguageCode
}) {
  return (
    <Paper variant='outlined' sx={{ p: 2, borderRadius: 2, bgcolor: '#F5F7F6' }}>
      {contributions.length === 0 ? (
        <Typography variant='body2' color='text.secondary'>
          <Trans>hal_deposit_no_authors</Trans>
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {contributions.map((c, i) => {
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
    <Box sx={{ mt: 2, mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant='subtitle2' color='text.secondary' sx={SUBTITLE_SX}>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  )
}
