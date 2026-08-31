import {
  OrganizationCategory,
  OrganizationGenericType,
  OrganizationRelationKind,
} from '@prisma/client'
import { Literal } from '@/types/Literal'

export interface OrganizationDirectoryParent {
  parentUid: string
  kind: OrganizationRelationKind
  position: string | null
}

/**
 * One row of the research-structures directory: identity and relationships
 * of a structure plus its KPIs. KPIs follow the perimeter rules of the
 * dashboards (one-hop expansion), computed over the last 24 months.
 */
export interface OrganizationDirectoryEntry {
  uid: string
  slug: string | null
  acronym: string | null
  names: Literal[]
  category: OrganizationCategory
  genericType: OrganizationGenericType
  nationalType: string | null
  external: boolean
  /** Explicit visibility toggle — what a structure manager last set. */
  hidden: boolean
  /** Derived visibility: hidden itself, or hidden through all its parents. */
  hiddenEffective: boolean
  parents: OrganizationDirectoryParent[]
  membersCount: number
  publicationsCount: number
  /** share (0–100) of the perimeter publications with an OA colour */
  oaRate: number
  /** share (0–100) of the perimeter publications with a HAL record */
  halRate: number
}
