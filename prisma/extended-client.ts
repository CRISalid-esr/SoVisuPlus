import {
  AuthorityOrganization,
  AuthorityOrganizationIdentifier,
  Concept,
  ConceptLabel,
  Contribution,
  Document,
  DocumentAbstract,
  DocumentRecord,
  DocumentState,
  DocumentTitle,
  Employment,
  HalDeposit,
  HalDepositFile,
  HalSubmitType,
  Journal,
  JournalIdentifier,
  LabelType,
  Membership,
  OrcidIdentifier,
  Permission,
  Person,
  PersonIdentifier,
  Prisma,
  PrismaClient,
  PublicationIdentifier,
  Role,
  RolePermission,
  SourceContribution,
  SourceJournal,
  SourcePerson,
  SourcePersonIdentifier,
  User,
  UserRole,
  UserRoleScope,
} from '@prisma/client'
const prisma = new PrismaClient()

export const organizationUnitInclude = {
  labels: true,
  descriptions: true,
  identifiers: true,
} satisfies Prisma.OrganizationUnitInclude

/**
 * Include used where the organization's parent relationships matter
 * (authorization perimeters computed from person memberships).
 */
export const organizationUnitParentsInclude = {
  parents: { include: { parent: true } },
} satisfies Prisma.OrganizationUnitInclude

export type OrganizationRelationshipWithParent =
  Prisma.OrganizationRelationshipGetPayload<{
    include: { parent: true }
  }>

export type OrganizationUnitWithRelations = Prisma.OrganizationUnitGetPayload<{
  include: typeof organizationUnitInclude
}> & {
  // present only when the query includes organizationUnitParentsInclude
  parents?: OrganizationRelationshipWithParent[]
}

export type ContributionWithRelations = Contribution & {
  person: PersonWithRelations
  affiliations: AuthorityOrganizationWithRelations[]
}

export type AuthorityOrganizationWithRelations = AuthorityOrganization & {
  identifiers: AuthorityOrganizationIdentifier[]
}

export type SourceContributionWithRelations = SourceContribution & {
  person: SourcePersonWithRelations
}

export type DocumentRecordWithRelations = DocumentRecord & {
  contributions: SourceContributionWithRelations[]
  identifiers: PublicationIdentifier[]
  journal: SourceJournal | null
  halSubmitType: HalSubmitType | null
}

export type JournalWithRelations = Journal & {
  identifiers: JournalIdentifier[]
}

export type ConceptLabelWithRelations = ConceptLabel & {
  type: LabelType
}

export type ConceptWithRelations = Concept & {
  labels: ConceptLabelWithRelations[]
}

export type DocumentWithRelations = Document & {
  titles: DocumentTitle[]
  abstracts: DocumentAbstract[]
  subjects: ConceptWithRelations[]
  contributions: ContributionWithRelations[]
  records: DocumentRecordWithRelations[]
  journal: JournalWithRelations | null
  state: DocumentState
}

export type HalDepositWithRelations = HalDeposit & {
  files: HalDepositFile[]
  document: { uid: string }
  person: { uid: string }
}

export type RoleWithPermission = RolePermission & {
  permission: Permission
}

export type RoleWithRelations = Role & {
  permissions: RoleWithPermission[] // include: { permissions: { include: { permission: true } } }
}

export type UserRoleWithRelations = UserRole & {
  role: RoleWithRelations
  scopes: UserRoleScope[]
}

export type MembershipWithRelations = Membership & {
  organizationUnit: OrganizationUnitWithRelations
}

export type EmploymentWithRelations = Employment & {
  organizationUnit: OrganizationUnitWithRelations
}

export type SourcePersonWithRelations = SourcePerson & {
  identifiers: SourcePersonIdentifier[]
}

export type PersonWithRelations = Person & {
  identifiers: PersonIdentifierWithRelations[]
  memberships: MembershipWithRelations[]
  employments?: EmploymentWithRelations[]
  records: SourcePersonWithRelations[]
}

export type UserWithRelations = User & {
  person: PersonWithRelations | null
  roles: UserRoleWithRelations[]
}

export type PersonIdentifierWithRelations = PersonIdentifier & {
  orcidIdentifier?: Omit<OrcidIdentifier, 'accessToken' | 'refreshToken'> | null
}

export default prisma
