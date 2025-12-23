import process from 'node:process'
import { RoleService } from '@/lib/services/RoleService'
import { UserDAO } from '@/lib/daos/UserDAO'

/**
 * Idempotently assign default self-scoped roles to ALL users
 * that have a linked Person (person.uid).
 *
 * Roles taken from env DEFAULT_SELF_SCOPED_ROLES or fallback list.
 * Example env: DEFAULT_SELF_SCOPED_ROLES="document_editor,document_fetcher,document_merger"
 */
const main = async () => {
  const defaultRoles = (process.env.DEFAULT_SELF_SCOPED_ROLES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) || [
    'document_editor',
    'document_fetcher',
    'document_merger',
  ]

  if (defaultRoles.length === 0) {
    throw new Error(
      'No roles provided (env DEFAULT_SELF_SCOPED_ROLES is empty).',
    )
  }

  const userDAO = new UserDAO()
  const roleSvc = new RoleService()

  const users = await userDAO.listUsersWithPersonUid()
  let updated = 0
  for (const u of users) {
    if (!u.personUid) continue // skip users without a linked Person
    await roleSvc.ensureSelfScopedRoles({
      userId: u.id,
      personUid: u.personUid,
      roleNames: defaultRoles,
    })
    updated++
  }
  console.log(
    `[seed_self_scoped_defaults] Done — processed ${updated} users with person scope.`,
  )
}

main().catch((err) => {
  console.error('[seed_self_scoped_defaults] Failed:', err?.message ?? err)
  process.exit(1)
})
