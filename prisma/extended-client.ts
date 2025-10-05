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
  Person,
  PrismaClient,
  ResearchStructure,
  ResearchStructureDescription,
  ResearchStructureName,
  Role,
  Permission,
  RolePermission,
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

export type DocumentRecordWithRelations = DocumentRecord & {
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

export type RolePermissionWithPermission = RolePermission & {
  permission: Permission
}

export type RoleWithRelations = Role & {
  permissions: RolePermissionWithPermission[]
}

export type UserRoleWithRelations = UserRole & {
  role: RoleWithRelations
  scopes: UserRoleScope[]
}

export default prisma
