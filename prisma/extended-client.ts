import {
  Concept,
  ConceptLabel,
  Contribution,
  Document,
  DocumentAbstract,
  DocumentRecord,
  DocumentState,
  DocumentTitle,
  HalSubmitType,
  Journal,
  JournalIdentifier,
  LabelType,
  Membership,
  Permission,
  Person,
  PersonIdentifier,
  PrismaClient,
  PublicationIdentifier,
  ResearchStructure,
  ResearchStructureDescription,
  ResearchStructureName,
  Role,
  RolePermission,
  SourceContribution,
  SourceJournal,
  SourcePerson,
  User,
  UserRole,
  UserRoleScope,
} from '@prisma/client'

const prisma = new PrismaClient()

export type ResearchStructureWithRelations = ResearchStructure & {
  names: ResearchStructureName[]
  descriptions: ResearchStructureDescription[]
}

export type ContributionWithRelations = Contribution & {
  person: Person
}

export type SourceContributionWithRelations = SourceContribution & {
  person: SourcePerson
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

export type RoleWithPermission = RolePermission & {
  permission: Permission
}

export type RoleWithRelations = Role & {
  permissions: RoleWithPermission[] // include: { permissions: { include: { permission: true } } }
}

export type RoleWithPermissionIds = Role & {
  permissions: Array<Pick<RolePermission, 'permissionId'>> // include: { permissions: { select: { permissionId: true } } }
}

export type UserRoleWithRelations = UserRole & {
  role: RoleWithRelations
  scopes: UserRoleScope[]
}

export type MembershipWithRelations = Membership & {
  researchStructure: ResearchStructureWithRelations
}

export type PersonWithRelations = Person & {
  identifiers: PersonIdentifier[]
  memberships: MembershipWithRelations[]
}

export type UserWithRelations = User & {
  person: PersonWithRelations | null
  roles: UserRoleWithRelations[]
}

export default prisma
