import process from 'node:process'
import { UserService } from '@/lib/services/UserService'

/**
 * Manually create a user (person + local identifier + user account) so they
 * can sign in through Keycloak before their person arrives through AMQP.
 *
 * Usage:
 *   npm run create_user -- \
 *     --username jdupont \
 *     --first-name Jean --last-name Dupont \
 *     [--email jean.dupont@my-univ.fr] [--display-name "Jean Dupont"] \
 *     [--role admin]
 *
 * Default self-scoped roles (env DEFAULT_SELF_SCOPED_ROLES) are granted
 * automatically; each --role flag assigns an additional global role.
 */

type Args = {
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  displayName?: string
  roles: string[]
}

const parseArgs = (argv: string[]): Args => {
  const out: Args = { roles: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    switch (a) {
      case '--username':
        out.username = String(next())
        break
      case '--first-name':
        out.firstName = String(next())
        break
      case '--last-name':
        out.lastName = String(next())
        break
      case '--email':
        out.email = String(next())
        break
      case '--display-name':
        out.displayName = String(next())
        break
      case '--role':
        out.roles.push(String(next()))
        break
      default:
        if (a.startsWith('--')) {
          throw new Error(`Unknown flag: ${a}`)
        }
    }
  }
  return out
}

const defaultSelfScopedRoles = (): string[] => {
  const raw = process.env.DEFAULT_SELF_SCOPED_ROLES
  if (raw === undefined) {
    return ['document_editor', 'document_fetcher', 'document_merger']
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (!args.username) throw new Error('--username is required')
  if (!args.firstName) throw new Error('--first-name is required')
  if (!args.lastName) throw new Error('--last-name is required')

  // Mirror auth_options: an EPPN like jdupont@my-univ.fr is matched by its
  // local part, so store the identifier without the domain.
  let username = args.username
  const atIndex = username.indexOf('@')
  if (atIndex > 0) {
    username = username.substring(0, atIndex)
    console.warn(
      `[create_user] "${args.username}" looks like an EPPN, using local part "${username}"`,
    )
  }

  const svc = new UserService()
  const selfScopedRoles = defaultSelfScopedRoles()
  const result = await svc.provisionUser({
    username,
    firstName: args.firstName,
    lastName: args.lastName,
    email: args.email ?? null,
    displayName: args.displayName ?? null,
    selfScopedRoles,
    globalRoles: args.roles,
  })

  console.log(
    `[create_user] User #${result.userId} ready for person {${result.personUid}}` +
      ` (local identifier "${username}")`,
  )
  if (selfScopedRoles.length > 0) {
    console.log(
      `[create_user] Self-scoped roles: ${selfScopedRoles.join(', ')}`,
    )
  }
  if (args.roles.length > 0) {
    console.log(`[create_user] Global roles: ${args.roles.join(', ')}`)
  }
}

main().catch((err) => {
  console.error('[create_user] Failed:', err?.message ?? err)
  process.exit(1)
})
