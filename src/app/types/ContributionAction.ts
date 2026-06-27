/**
 * Payload contracts for the contributions update sent at "Save" time on the Authors tab.
 *
 * Saving does NOT write contribution data to the app DB: the save becomes a single
 * authoritative `Action` row (actionType UPDATE, targetType DOCUMENT, path
 * 'contributions') that the change poller publishes to the graph. The graph treats
 * the carried contribution list as the new complete state — contributors present are
 * upserted, contributors absent are removed. These types are the shape of that
 * action's `parameters`, shared by the client state builder, the API route
 * validation and the service.
 */

export interface ContributionActionPersonIdentifier {
  type: string
  value: string
}

export interface ContributionActionAffiliation {
  acronym: string | null
  name: string | null
  label: string | null
  /** HAL affiliation type value (e.g. 'laboratory'); the graph maps it. */
  type: string | null
  hal: string | null
  idref: string | null
  isni: string | null
  nns: string | null
  ror: string | null
  wikidata: string | null
}

/** Full state of one contribution in the authoritative update payload. */
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

/**
 * parameters payload for the single authoritative contributions UPDATE action:
 * the complete, ordered list of contributions the document should have after the save.
 */
export interface ContributionsUpdateParameters {
  contributions: ContributionActionParameters[]
}
