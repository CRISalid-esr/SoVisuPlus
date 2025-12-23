import process from 'node:process'
import { RoleService } from '@/lib/services/RoleService'
import { EntityType } from '@/types/UserRoleScope'
import { PersonIdentifierType } from '@/types/PersonIdentifier'

type Args = {
  role: string
  userId?: number
  personUid?: string
  idType?: PersonIdentifierType
  idValue?: string
  scope?: string // "EntityType:entityUid"
}

const parseArgs = (argv: string[]): Args => {
  const out: Args = { role: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    switch (a) {
      case '--role':
        out.role = String(next())
        break
      case '--user-id':
        out.userId = Number(next())
        break
      case '--person-uid':
        out.personUid = String(next())
        break
      case '--id-type':
        out.idType = String(next()) as PersonIdentifierType
        break
      case '--id-value':
        out.idValue = String(next())
        break
      case '--scope':
        out.scope = String(next())
        break
      default:
        if (a.startsWith('--')) {
          throw new Error(`Unknown flag: ${a}`)
        }
    }
  }
  return out
}

const parseScope = (
  scope?: string,
): {
  entityType: EntityType
  entityUid: string
} | null => {
  if (!scope) return null // global role, no scope
  const idx = scope.indexOf(':')
  if (idx <= 0 || idx === scope.length - 1) {
    throw new Error(
      `Invalid --scope "${scope}". Expected "EntityType:entityUid"`,
    )
  }
  const entityType = scope.slice(0, idx) as EntityType
  const entityUid = scope.slice(idx + 1)

  const allowed: EntityType[] = [
    'Person',
    'ResearchStructure',
    'Institution',
    'InstitutionDivision',
  ]
  if (!allowed.includes(entityType)) {
    throw new Error(
      `Invalid EntityType "${entityType}". Use one of: ${allowed.join(', ')}`,
    )
  }
  if (!entityUid) throw new Error('entityUid in --scope cannot be empty')

  return { entityType, entityUid }
}

const main = async () => {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)

  if (!args.role) throw new Error('--role is required')
  const scope = parseScope(args.scope)

  const modes = [
    args.userId != null,
    !!args.personUid,
    !!(args.idType && args.idValue),
  ].filter(Boolean)
  if (modes.length !== 1) {
    throw new Error(
      'Provide exactly one user selector: --user-id OR --person-uid OR (--id-type AND --id-value)',
    )
  }

  const svc = new RoleService()
  const result = await svc.assignRoleToUser({
    roleName: args.role,
    scope,
    user: {
      userId: args.userId,
      personUid: args.personUid,
      idType: args.idType,
      idValue: args.idValue,
    },
  })

  console.log(
    `Assigned role "${result.roleName}" to user #${result.userId}` +
      (result.scope
        ? ` with scope {${result.scope.entityType}:${result.scope.entityUid}}`
        : ' with global scope'),
  )
}

main().catch((err) => {
  console.error('[assign_role] Failed:', err?.message ?? err)
  process.exit(1)
})
