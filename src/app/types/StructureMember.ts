import { PersonIdentifierType as DbPersonIdentifierType } from '@prisma/client'
import { PersonIdentifier, PersonIdentifierJson } from './PersonIdentifier'

export interface StructureMemberJson {
  uid: string
  slug: string | null
  displayName: string
  startDate: string | null
  endDate: string | null
  position: string | null
  publicationsCount: number
  oaRate: number
  halRate: number
  identifiers: PersonIdentifierJson[]
}

const toIsoDate = (date: Date | null): string | null =>
  date ? date.toISOString().slice(0, 10) : null

/**
 * A person attached to a structure through a Membership (or an Employment
 * for institutions), with the link dates and per-person publication KPIs.
 * KPI fields are filled by the service after construction.
 */
export class StructureMember {
  public publicationsCount = 0
  public oaRate = 0
  public halRate = 0
  /** Position label resolved by the service from the corps code. */
  public position: string | null = null

  constructor(
    public personId: number,
    public uid: string,
    public slug: string | null,
    public displayName: string,
    public firstName: string,
    public lastName: string,
    /** ISO date (yyyy-mm-dd) or null when the ETL has no date yet. */
    public startDate: string | null,
    public endDate: string | null,
    /** Raw corps code of the row this member came from (employments only). */
    public positionCode: string | null,
    public identifiers: PersonIdentifier[],
  ) {}

  static fromDb(row: {
    startDate: Date | null
    endDate: Date | null
    positionCode: string | null
    person: {
      id: number
      uid: string
      slug: string | null
      displayName: string | null
      firstName: string | null
      lastName: string | null
      identifiers: { type: DbPersonIdentifierType; value: string }[]
    }
  }): StructureMember {
    const { person } = row
    const displayName =
      person.displayName ??
      [person.firstName, person.lastName].filter(Boolean).join(' ')
    return new StructureMember(
      person.id,
      person.uid,
      person.slug,
      displayName,
      person.firstName ?? '',
      person.lastName ?? '',
      toIsoDate(row.startDate),
      toIsoDate(row.endDate),
      row.positionCode,
      person.identifiers
        .filter((identifier) => identifier.value.trim() !== '')
        .map(
          (identifier) =>
            new PersonIdentifier(identifier.type, identifier.value),
        ),
    )
  }

  toJson(): StructureMemberJson {
    return {
      uid: this.uid,
      slug: this.slug,
      displayName: this.displayName,
      startDate: this.startDate,
      endDate: this.endDate,
      position: this.position,
      publicationsCount: this.publicationsCount,
      oaRate: this.oaRate,
      halRate: this.halRate,
      identifiers: this.identifiers.map((identifier) => identifier.toJson()),
    }
  }
}
