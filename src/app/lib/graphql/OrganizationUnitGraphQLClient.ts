import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationRelation } from '@/types/OrganizationRelation'
import { OrganizationUnitIdentifier } from '@/types/OrganizationUnitIdentifier'
import { Literal } from '@/types/Literal'
import { organizationIdentifierTypeFromString } from '@/types/OrganizationUnitIdentifier'
import {
  categoryFromGraphNode,
  genericTypeFromCategory,
} from '@/lib/graphql/organizationHydration'
import { OrganizationRelationKind } from '@prisma/client'

interface GraphLiteral {
  value: string
  language?: string | null
}

interface GraphIdentifier {
  type: string
  value: string
}

export interface GraphOrganizationUnitNode {
  uid: string
  external?: boolean | null
  generic_type: string
  national_type?: string | null
  types: string[]
  long_labels: GraphLiteral[]
  short_labels: GraphLiteral[]
  local_types?: GraphLiteral[]
  descriptions?: GraphLiteral[]
  identifiers: GraphIdentifier[]
}

interface GraphInclusionProperties {
  start_date?: string | null
  end_date?: string | null
}

interface GraphMembershipProperties extends GraphInclusionProperties {
  position?: string | null
}

interface GraphRelationshipEdge<P> {
  node: GraphOrganizationUnitNode
  properties: P
}

export interface GraphOrganizationUnitResponse
  extends GraphOrganizationUnitNode {
  member_ofConnection?: {
    edges: GraphRelationshipEdge<GraphMembershipProperties>[]
  }
  part_ofConnection?: {
    edges: GraphRelationshipEdge<GraphInclusionProperties>[]
  }
}

export interface GraphOrganizationUnitsResponse {
  organizationUnits: GraphOrganizationUnitResponse[]
}

export class OrganizationUnitGraphQLClient extends AbstractGraphQLClient {
  /**
   * Get an organization structure by its UID
   * @param uid
   * @returns The organization unit if found and typeable, null otherwise
   */
  public async getOrganizationUnitByUid(
    uid: string,
  ): Promise<OrganizationUnit | null> {
    const variables = {
      where: {
        uid_EQ: uid,
      },
    }
    const organizationUnitQuery = loadQuery('organizationUnit.graphql')

    const response = await this.query<GraphOrganizationUnitsResponse>(
      organizationUnitQuery,
      variables,
    )
    const [organizationUnitData] = response.organizationUnits

    if (!organizationUnitData) {
      return null
    }
    return this.hydrate(organizationUnitData)
  }

  public hydrate(
    organizationUnitData: GraphOrganizationUnitResponse,
  ): OrganizationUnit | null {
    const organizationUnit = this.hydrateNode(organizationUnitData)
    if (!organizationUnit) {
      return null
    }

    const memberOfRelations =
      organizationUnitData.member_ofConnection?.edges
        ?.map((edge) => this.hydrateRelation(edge, 'member_of'))
        .filter((relation) => relation !== null) ?? []
    const partOfRelations =
      organizationUnitData.part_ofConnection?.edges
        ?.map((edge) => this.hydrateRelation(edge, 'part_of'))
        .filter((relation) => relation !== null) ?? []

    organizationUnit.parents = [...partOfRelations, ...memberOfRelations]
    return organizationUnit
  }

  /**
   * Hydrate a relationship edge. Edges whose parent node cannot be typed
   * are skipped (same behaviour as the graph for missing targets).
   */
  private hydrateRelation(
    edge: GraphRelationshipEdge<GraphMembershipProperties>,
    kind: OrganizationRelationKind,
  ): OrganizationRelation | null {
    const parent = this.hydrateNode(edge.node)
    if (!parent) {
      return null
    }
    return new OrganizationRelation(
      parent,
      kind,
      edge.properties.position ?? null,
      edge.properties.start_date ?? null,
      edge.properties.end_date ?? null,
    )
  }

  /**
   * Hydrate a graph node into a shallow OrganizationUnit (no relationships).
   * Returns null when the concrete category cannot be determined
   * (a unit node without mission label) — callers must skip the node.
   */
  private hydrateNode(
    node: GraphOrganizationUnitNode,
  ): OrganizationUnit | null {
    const category = categoryFromGraphNode(node.types, node.generic_type)
    if (!category) {
      console.error(
        `Cannot determine category of organization ${node.uid} ` +
          `(labels: [${node.types?.join(', ') ?? ''}], generic_type: ${node.generic_type ?? 'unknown'}), skipping`,
      )
      return null
    }

    const identifiers = (node.identifiers ?? [])
      .map((identifier): OrganizationUnitIdentifier | null => {
        try {
          return {
            type: organizationIdentifierTypeFromString(identifier.type),
            value: identifier.value,
          }
        } catch {
          console.warn(
            `Unsupported organization identifier type for ${identifier.value}: ${identifier.type}`,
          )
          return null // Skip unsupported identifiers
        }
      })
      .filter((identifier) => identifier !== null)

    return new OrganizationUnit(
      node.uid,
      node.short_labels?.[0]?.value ?? null,
      (node.long_labels ?? []).map((label) =>
        Literal.fromObject({
          language: label.language ?? null,
          value: label.value,
        }),
      ),
      (node.descriptions ?? []).map((description) =>
        Literal.fromObject({
          language: description.language ?? null,
          value: description.value,
        }),
      ),
      category,
      genericTypeFromCategory(category),
      node.national_type ?? null,
      identifiers,
      null,
      node.external ?? false,
      (node.local_types ?? []).map((localType) =>
        Literal.fromObject({
          language: localType.language ?? null,
          value: localType.value,
        }),
      ),
    )
  }
}
