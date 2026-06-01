/**
 * Payload contracts for contribution changes sent at "Save" time on the Authors tab.
 *
 * Saving does NOT write contribution data to the app DB: each change becomes an
 * `Action` row (targetType DOCUMENT, path 'contributions') that the change poller
 * publishes to the graph. These types are the shape of that action's `parameters`,
 * shared by the client diff builder, the API route validation and the service.
 */

export interface ContributionActionPersonIdentifier {
  type: string
  value: string
}

export interface ContributionActionAffiliation {
  acronym: string | null
  name: string | null
  label: string | null
  hal: string | null
  idref: string | null
  isni: string | null
  nns: string | null
  ror: string | null
  wikidata: string | null
}

/** parameters payload for an ADD or UPDATE contribution action. */
export interface ContributionActionParameters {
  person: {
    /** null for a brand-new contributor never persisted (graph mints / matches by identifiers). */
    uid: string | null
    displayName: string
    firstName: string | null
    lastName: string | null
    identifiers: ContributionActionPersonIdentifier[]
  }
  /** LoC relator URIs (e.g. http://id.loc.gov/vocabulary/relators/aut). */
  roles: string[]
  /** Card position when ranking mode is on at save time, otherwise null. */
  rank: number | null
  affiliations: ContributionActionAffiliation[]
}

/** parameters payload for a REMOVE contribution action (identifies the contribution by person uid). */
export interface RemoveContributionParameters {
  person: {
    uid: string
  }
}

export type ContributionChange =
  | { actionType: 'ADD'; parameters: ContributionActionParameters }
  | { actionType: 'UPDATE'; parameters: ContributionActionParameters }
  | { actionType: 'REMOVE'; parameters: RemoveContributionParameters }
