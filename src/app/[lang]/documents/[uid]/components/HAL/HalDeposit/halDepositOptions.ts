/**
 * UI option lists for the HAL deposit form. The `value` codes are the contract with the server
 * (they flow into the multipart payload and ultimately the TEI). Labels are user-facing.
 */

export const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'French' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
]

export const LICENSE_OPTIONS = [
  { value: 'cc-by', label: 'CC BY 4.0' },
  { value: 'cc-by-sa', label: 'CC BY-SA 4.0' },
  { value: 'cc-by-nc', label: 'CC BY-NC 4.0' },
  { value: 'cc-by-nc-sa', label: 'CC BY-NC-SA 4.0' },
  { value: 'cc-by-nd', label: 'CC BY-ND 4.0' },
  { value: 'cc-by-nc-nd', label: 'CC BY-NC-ND 4.0' },
  { value: 'etalab', label: 'ETALAB – Open Licence' },
  { value: 'copyright', label: 'Copyright – All rights reserved' },
]

export const FILE_SOURCE_OPTIONS = [
  { value: 'author', label: 'Provided by author(s)' },
  { value: 'greenPublisher', label: "Publisher allowing publisher's file submission" },
  { value: 'publisherAgreement', label: "Publisher's express consent for submission" },
  { value: 'publisherPaid', label: 'Funded publication fees for open access' },
]

export const FILE_TYPE_OPTIONS = [
  { value: 'file', label: 'Document (pdf, jpg…)' },
  { value: 'src', label: 'Source file (docx, tex…)' },
  { value: 'annex', label: 'Additional data' },
]

export const VISIBILITY_OPTIONS = [
  { value: 'now', label: 'Immediately' },
  { value: '15d', label: 'In 15 days' },
  { value: '1m', label: 'In 1 month' },
  { value: '3m', label: 'In 3 months' },
  { value: '6m', label: 'In 6 months' },
  { value: '1y', label: 'In 1 year' },
  { value: '2y', label: 'In 2 years' },
]

export const labelOf = (
  options: { value: string; label: string }[],
  value: string | null | undefined,
): string => options.find((o) => o.value === value)?.label ?? (value ?? '')
