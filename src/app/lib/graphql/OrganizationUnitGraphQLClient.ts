import { AbstractGraphQLClient } from './AbstractGraphQLClient'
import { loadQuery } from '@/lib/graphql/queries/loadQuery'
import { OrganizationUnit } from '@/types/OrganizationUnit'
import { OrganizationRelation } from '@/types/OrganizationRelation'
import {
  GraphOrganizationUnitNode,
  hydrateOrganizationNode,
} from '@/lib/graphql/organizationHydration'
import { OrganizationRelationKind } from '@prisma/client'

export type { GraphOrganizationUnitNode }

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
    const organizationUnit = hydrateOrganizationNode(organizationUnitData)
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
    const parent = hydrateOrganizationNode(edge.node)
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
}
