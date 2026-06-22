import { LocRelator } from '@/types/LocRelator'
import { PersonIdentifierType } from '@/types/PersonIdentifier'
import {
  AureHalAuthorDoc,
  AureHalStructureDoc,
} from '@/lib/services/AureHalAPIClient'
import { HalAffiliationType } from './affiliationType'

/**
 * Known person-identifier types. Derived from the Prisma `PersonIdentifierType`
 * enum (as a string-literal union) so it stays in sync automatically — never
 * hand-maintain a parallel list. Raw type strings must pass through
 * `normalizeIdentifierType` (see `identifierTypes.ts`) before becoming this type.
 */
export type WorkingIdentifierType = `${PersonIdentifierType}`

/** Contribution status, drives chip color and which HAL box is shown. */
export type ContributionStatus =
  | 'identified_and_aligned'
  | 'identified'
  | 'not_aligned'
  | 'not_identified'

export interface WorkingIdentifier {
  type: WorkingIdentifierType
  value: string
}

/** A contributor's affiliation while editing (flat HAL-style fields + UI helpers). */
export interface WorkingAffiliation {
  localId: string
  acronym: string | null
  name: string | null
  label: string | null
  /** HAL affiliation type (select value); null when unknown / no default. */
  type: HalAffiliationType | null
  hal: string | null
  idref: string | null
  isni: string | null
  nns: string | null
  ror: string | null
  wikidata: string | null
  /** displayNames[0] of an imported, not-yet-identified affiliation (UI only). */
  importedText: string | null
  /** Full HAL structure doc kept until save (UI only). */
  halExtra?: AureHalStructureDoc
}

/** A contribution while editing. The baseline is rebuilt into this on (re)load. */
export interface WorkingContribution {
  /** Stable client key (React + drag), independent of person uid. */
  localId: string
  /** null for a brand-new / detached contributor never persisted. */
  personUid: string | null
  displayName: string
  firstName: string | null
  lastName: string | null
  identifiers: WorkingIdentifier[]
  roles: LocRelator[]
  affiliations: WorkingAffiliation[]
  /** Baseline rank as loaded; live rank is derived from list position at save time. */
  rank: number | null
  /** Set only via the HAL "Add contributor" option (drives 'not_aligned' status). */
  notAligned: boolean
  /** Full HAL author doc kept until save (UI only). */
  halExtra?: AureHalAuthorDoc
}
